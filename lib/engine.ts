import { DIMS } from "./catalog";
import type { DimId, GameState, LogEntry } from "./types";
import { addDays, monthStart, today, weekStart } from "./utils";

/* ---------- levels ---------- */
const K = 150;
export const TITLES = ["Spark", "Static Charge", "Sky Scout", "Bolt Bearer", "Storm Caller", "Thunder Knight", "Tempest", "Stormlord", "Sky Sovereign", "Thunder Sage"];
export function levelOf(xp: number) {
  const x = Math.max(0, xp);
  const level = Math.floor(Math.sqrt(x / K)) + 1;
  const start = K * (level - 1) ** 2;
  const next = K * level ** 2;
  return { level, start, next, into: x - start, span: next - start, pct: (x - start) / (next - start), title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
}

/** Daily XP that fills the "Charge" ring on Today. */
export const DAILY_XP_TARGET = 100;

/* ---------- log helpers ---------- */
export type Period = "daily" | "weekly" | "monthly" | "all";
export function periodStart(p: Period, t = today()): string {
  if (p === "daily") return t;
  if (p === "weekly") return weekStart(t);
  if (p === "monthly") return monthStart(t);
  return "0000-00-00";
}
export const userLogs = (s: GameState, id: string) => s.logs.filter((l) => l.userId === id);
export const memberIds = (s: GameState) => s.members.map((m) => m.id);

export function xpBetween(logs: LogEntry[], from: string, to = "9999-99-99", dim?: DimId): number {
  let t = 0;
  for (const l of logs) if (l.date >= from && l.date <= to && (!dim || l.dim === dim)) t += l.xp;
  return t;
}
/** Lifetime positive XP: level never goes down because of a slip-up. */
export function lifetimeXp(logs: LogEntry[]): number {
  let t = 0;
  for (const l of logs) if (l.xp > 0) t += l.xp;
  return t;
}
export function netXp(s: GameState, id: string, p: Period = "all"): number {
  return xpBetween(userLogs(s, id), periodStart(p));
}

export function activeDates(s: GameState, id: string): Set<string> {
  const set = new Set<string>();
  for (const l of s.logs) if (l.userId === id && l.xp > 0) set.add(l.date);
  return set;
}

/** Streak counts days with any positive action or a used rest day. Today never breaks it until the day is over. */
export function streakOf(s: GameState, id: string, t = today()): { current: number; best: number } {
  const act = activeDates(s, id);
  for (const d of s.restDays[id] ?? []) act.add(d);
  let cur = 0;
  let d = act.has(t) ? t : addDays(t, -1);
  while (act.has(d)) { cur++; d = addDays(d, -1); }
  const sorted = Array.from(act).sort();
  let best = 0, run = 0, prev = "";
  for (const x of sorted) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  return { current: cur, best: Math.max(best, cur) };
}

export function consistency(s: GameState, id: string, days = 30, t = today()): number {
  const act = activeDates(s, id);
  for (const d of s.restDays[id] ?? []) act.add(d);
  let n = 0;
  for (let i = 0; i < days; i++) if (act.has(addDays(t, -i))) n++;
  return Math.round((n / days) * 100);
}

export function habitDone(s: GameState, userId: string, habitId: string, date = today()): boolean {
  const ref = `h:${habitId}:${date}`;
  return s.logs.some((l) => l.userId === userId && l.ref === ref);
}

export function habitStreak(s: GameState, userId: string, habitId: string, t = today()): number {
  let n = 0;
  let d = habitDone(s, userId, habitId, t) ? t : addDays(t, -1);
  while (habitDone(s, userId, habitId, d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- 12 life dimensions ---------- */
export function dimScores(s: GameState, id: string): { id: DimId; name: string; short: string; color: string; score: number; xp30: number; self: number }[] {
  const logs = userLogs(s, id);
  const from = addDays(today(), -29);
  return DIMS.map((d) => {
    const xp30 = Math.max(0, xpBetween(logs, from, "9999-99-99", d.id));
    const self = s.selfRatings[id]?.[d.id] ?? 5;
    const score = Math.round(Math.min(100, self * 5 + Math.min(50, (xp30 / 150) * 50)));
    return { id: d.id, name: d.name, short: d.short, color: d.color, score, xp30, self };
  });
}

/* ---------- leaderboard ---------- */
export type Metric = "xp" | "streak" | "consistency" | "badges";
export interface Row { id: string; value: number; xp: number; streak: number; consistency: number; badges: number }
export function leaderboard(s: GameState, p: Period, metric: Metric): Row[] {
  const rows = memberIds(s).map((id) => {
    const xp = netXp(s, id, p);
    const streak = streakOf(s, id).current;
    const cons = consistency(s, id, p === "daily" ? 1 : p === "weekly" ? 7 : 30);
    const badges = Object.keys(s.badges[id] ?? {}).length;
    const value = metric === "xp" ? xp : metric === "streak" ? streak : metric === "consistency" ? cons : badges;
    return { id, value, xp, streak, consistency: cons, badges };
  });
  return rows.sort((a, b) => b.value - a.value || b.xp - a.xp);
}

/** Underdog Surge: whoever is last this week and meaningfully behind earns 1.25x so the game stays balanced. */
export function underdogMultiplier(s: GameState, id: string): number {
  const rows = memberIds(s).map((m) => ({ id: m, xp: netXp(s, m, "weekly") }));
  if (rows.length < 2) return 1;
  const avg = rows.reduce((a, r) => a + r.xp, 0) / rows.length;
  const last = rows.reduce((a, r) => (r.xp < a.xp ? r : a));
  return last.id === id && avg - last.xp >= 60 ? 1.25 : 1;
}

/* ---------- badges ---------- */
export interface Ctx { s: GameState; id: string; logs: LogEntry[]; xp: number; level: number; streak: number }
export interface BadgeDef { id: string; name: string; desc: string; test: (c: Ctx) => boolean; rare?: boolean }
const tagCount = (c: Ctx, tag: string) => c.logs.filter((l) => l.tag === tag && l.xp > 0).length;
const kindCount = (c: Ctx, kind: string) => c.logs.filter((l) => l.kind === kind && l.xp > 0).length;

export const BADGES: BadgeDef[] = [
  { id: "spark", name: "First Spark", desc: "Complete your very first action", test: (c) => c.logs.some((l) => l.xp > 0) },
  { id: "static", name: "Static Charge", desc: "Keep a 3-day streak", test: (c) => c.streak >= 3 },
  { id: "rod", name: "Lightning Rod", desc: "Keep a 7-day streak", test: (c) => c.streak >= 7 },
  { id: "lord", name: "Thunderlord", desc: "Keep a 21-day streak", test: (c) => c.streak >= 21, rare: true },
  { id: "hydro", name: "Hydro Hero", desc: "Hit your water goal 25 times", test: (c) => tagCount(c, "water") >= 25 },
  { id: "worm", name: "Bookworm", desc: "Read 25 times", test: (c) => tagCount(c, "read") >= 25 },
  { id: "ninja", name: "Builder", desc: "Upskill or build 30 times", test: (c) => tagCount(c, "code") >= 30 },
  { id: "gym", name: "Sweat Equity", desc: "Work out 50 times", test: (c) => tagCount(c, "workout") >= 50 },
  { id: "scholar", name: "Scholar", desc: "Study 30 times", test: (c) => tagCount(c, "study") >= 30 },
  { id: "glue", name: "Squad Glue", desc: "Join 3 cousin meetups", test: (c) => kindCount(c, "meetup") >= 3 },
  { id: "saver", name: "Rainy-Day Saver", desc: "Save ₹5,000 in total", test: (c) => c.s.savings.filter((x) => x.userId === c.id).reduce((a, x) => a + x.amount, 0) >= 5000 },
  { id: "reflect", name: "Reflective Soul", desc: "Write 5 gratitude entries", test: (c) => c.s.gratitude.filter((g) => g.userId === c.id).length >= 5 },
  { id: "quest", name: "Quest Master", desc: "Finish 3 challenges", test: (c) => kindCount(c, "challenge") >= 3 },
  { id: "goal", name: "Dream Chaser", desc: "Achieve your first goal", test: (c) => c.s.goals.some((g) => g.userId === c.id && g.done) },
  { id: "honest", name: "Honest Heart", desc: "Log a slip-up honestly", test: (c) => c.logs.some((l) => l.kind === "penalty") },
  { id: "lvl5", name: "Storm Caller", desc: "Reach level 5", test: (c) => c.level >= 5 },
  { id: "lvl8", name: "Stormlord", desc: "Reach level 8", test: (c) => c.level >= 8, rare: true },
  { id: "giver", name: "Giver", desc: "Volunteer once", test: (c) => tagCount(c, "volunteer") >= 1 },
];

export function ctxFor(s: GameState, id: string): Ctx {
  const logs = userLogs(s, id);
  const xp = lifetimeXp(logs);
  return { s, id, logs, xp, level: levelOf(xp).level, streak: streakOf(s, id).best };
}
export function earnedBadgeIds(s: GameState, id: string): string[] {
  const c = ctxFor(s, id);
  return BADGES.filter((b) => b.test(c)).map((b) => b.id);
}

/* ---------- squad ---------- */
export const squadWeeklyGoal = (s: GameState) => 800 * Math.max(1, s.members.length);
export function squadWeekXp(s: GameState): number {
  return memberIds(s).reduce((a, id) => a + Math.max(0, netXp(s, id, "weekly")), 0);
}
