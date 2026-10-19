import { ACTIVE_DIMS, RANKS } from "./catalog";
import { lastDays } from "./balance";
import { isDue, ledger, sharesOf } from "./ledger";
import type { DailyGoal, DimId, GameState, Habit, LogEntry, MemberStats, Rivalry, Todo } from "./types";
import { addDays, daysBetween, monthStart, today, weekStart } from "./utils";

/* ---------- levels (from lifetime Aura Points) ---------- */
const K = 150;
export const TITLES = ["Spark", "Static Charge", "Sky Scout", "Bolt Bearer", "Storm Caller", "Thunder Knight", "Skybreaker", "Stormlord", "Sky Sovereign", "Thunder Sage"];
export function levelOf(aura: number) {
  const x = Math.max(0, aura);
  const level = Math.floor(Math.sqrt(x / K)) + 1;
  const start = K * (level - 1) ** 2;
  const next = K * level ** 2;
  return { level, start, next, into: x - start, span: next - start, pct: (x - start) / (next - start), title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
}

/* ---------- Aura helpers ---------- */
export type Period = "daily" | "weekly" | "monthly" | "all";
export function periodStart(p: Period, t = today()): string {
  if (p === "daily") return t;
  if (p === "weekly") return weekStart(t);
  if (p === "monthly") return monthStart(t);
  return "0000-00-00";
}
export const userLogs = (s: GameState, id: string) => ledger(s, id).logs;
export const memberIds = (s: GameState) => s.members.map((m) => m.id);

/** Aura in a date range, optionally only the share earned in one dimension. */
export function auraBetween(logs: LogEntry[], from: string, to = "9999-99-99", dim?: DimId): number {
  let t = 0;
  for (const l of logs) {
    if (l.date < from || l.date > to) continue;
    if (!dim) { t += l.xp; continue; }
    for (const [d, f] of sharesOf(l.dim, l.dim2)) if (d === dim) t += l.xp * f;
  }
  return Math.round(t);
}
/** Lifetime Aura Points: only ever goes up, so a level is never lost. */
export function lifetimeAura(logs: LogEntry[]): number {
  let t = 0;
  for (const l of logs) if (l.xp > 0) t += l.xp;
  return t;
}
export function periodAura(s: GameState, id: string, p: Period = "all"): number {
  return auraBetween(userLogs(s, id), periodStart(p));
}

/* ---------- streaks and consistency ---------- */
export const SHIELD_EVERY = 7;
export const MAX_SHIELDS = 2;

/**
 * A streak counts days with any completed quest or activity, plus rest days.
 * Recovery: every 7 days in a row earns a shield (up to two). A missed day
 * spends a shield instead of breaking the streak, so one bad day never wipes
 * out months of progress. Today never breaks a streak until it's over.
 */
export function streakOf(s: GameState, id: string, t = today()): { current: number; best: number; shields: number; saved: string[] } {
  const active = ledger(s, id).active;
  const rest = new Set(s.restDays[id] ?? []);
  const days = Array.from(active).concat(Array.from(rest)).filter((d) => d <= t).sort();
  if (!days.length) return { current: 0, best: 0, shields: 0, saved: [] };
  let run = 0, best = 0, shields = 0;
  let saved: string[] = [];
  for (let d = days[0]; d <= t; d = addDays(d, 1)) {
    if (active.has(d) || rest.has(d)) {
      run++;
      if (run % SHIELD_EVERY === 0) shields = Math.min(MAX_SHIELDS, shields + 1);
    } else if (d === t) {
      break;
    } else if (shields > 0 && run > 0) {
      shields--;
      saved.push(d);
    } else {
      run = 0;
      saved = [];
    }
    best = Math.max(best, run);
  }
  return { current: run, best, shields, saved };
}

/** Share of days with any completed action, over the last `days` days (or since joining, if sooner). */
export function consistency(s: GameState, id: string, days = 30, t = today()): number {
  const active = ledger(s, id).active;
  const rest = new Set(s.restDays[id] ?? []);
  const joined = s.members.find((m) => m.id === id)?.joinedAt;
  const span = joined ? Math.min(days, daysBetween(today(joined), t) + 1) : days;
  if (span <= 0) return 0;
  let n = 0;
  for (let i = 0; i < span; i++) {
    const d = addDays(t, -i);
    if (active.has(d) || rest.has(d)) n++;
  }
  return Math.round((n / span) * 100);
}

export function habitStreak(s: GameState, userId: string, h: Habit, t = today()): number {
  const refs = ledger(s, userId).refs;
  let n = 0;
  let d = refs.has(`h:${h.id}:${t}`) ? t : addDays(t, -1);
  // unscheduled days don't break a habit's streak
  for (let guard = 0; guard < 400 && d >= h.created; guard++, d = addDays(d, -1)) {
    if (refs.has(`h:${h.id}:${d}`)) n++;
    else if (isDue(h, d)) break;
  }
  return n;
}

/* ---------- today ---------- */
export const habitsFor = (s: GameState, id: string) => s.habits.filter((h) => h.userId === id && !h.archivedOn);

export interface Priority { type: "habit" | "todo"; id: string; title: string; xp: number; done: boolean; dim: DimId; picked: boolean }

/** What today holds: habits due, the top three, and the daily objective. */
export function dailyPlan(s: GameState, id: string, goal: DailyGoal = "auto", t = today()) {
  const refs = ledger(s, id).refs;
  const rested = (s.restDays[id] ?? []).includes(t);
  const due = habitsFor(s, id).filter((h) => isDue(h, t));
  const doneH = (h: Habit) => refs.has(`h:${h.id}:${t}`);
  const todos = s.todos.filter((x) => x.userId === id && (!x.done || x.doneOn === t));
  const picked = s.priorities[id]?.date === t ? s.priorities[id].ids : [];

  const asP = (x: Habit | Todo, type: Priority["type"]): Priority => ({
    type, id: x.id, title: x.title, xp: x.xp, dim: x.dim, picked: picked.includes(x.id), done: type === "habit" ? doneH(x as Habit) : (x as Todo).done,
  });
  const pool: Priority[] = [...due.map((h) => asP(h, "habit")), ...todos.map((x) => asP(x, "todo"))];
  const chosen = picked.map((pid) => pool.find((p) => p.id === pid)).filter((p): p is Priority => !!p);
  const auto = pool.filter((p) => !p.picked && !p.done && p.type === "habit").sort((a, b) => b.xp - a.xp)
    .concat(pool.filter((p) => !p.picked && !p.done && p.type === "todo"));
  const priorities = chosen.concat(auto).slice(0, 3);

  const prioTodos = priorities.filter((p) => p.type === "todo");
  const plannedAura = due.reduce((a, h) => a + h.xp, 0) + prioTodos.reduce((a, p) => a + p.xp, 0);
  const available = due.filter((h) => !doneH(h)).reduce((a, h) => a + h.xp, 0) + prioTodos.filter((p) => !p.done).reduce((a, p) => a + p.xp, 0);
  const earned = Math.max(0, auraBetween(ledger(s, id).logs, t, t));
  const objective = goal === "auto" ? (plannedAura ? Math.min(300, Math.max(30, Math.round((plannedAura * 0.8) / 10) * 10)) : 50) : goal;
  return { due, doneCount: due.filter(doneH).length, todos, priorities, plannedAura, available, earned, objective, rested };
}

/* ---------- ranks ---------- */
/** Rank score 0–100: half recent Life Vision, half consistency, over 30 days. */
export const rankScoreOf = (vision30: number | null, consistency30: number) => Math.round(0.5 * (vision30 ?? 0) + 0.5 * consistency30);

export function rankOf(score: number) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (score >= RANKS[k].min) i = k;
  const tier = RANKS[i];
  const top = i === RANKS.length - 1;
  const division = top ? 0 : Math.min(3, Math.floor((score - tier.min) / 5) + 1);
  const nextMin = top ? 100 : tier.min + division * 5;
  return { ...tier, tier: i, division, label: top ? tier.name : `${tier.name} ${["", "I", "II", "III"][division]}`, toNext: Math.max(0, nextMin - score) };
}

/* ---------- leaderboard ---------- */
export type Metric = "aura" | "balance" | "consistency" | "streak";
export interface Row { id: string; value: number | null; aura: number }
export function leaderboard(s: GameState, p: Exclude<Period, "daily">, metric: Metric, stats: (id: string) => MemberStats | undefined): Row[] {
  const rows = memberIds(s).map((id) => {
    const aura = periodAura(s, id, p);
    const st = stats(id);
    let value: number | null = aura;
    if (metric === "balance") value = st ? (p === "weekly" ? st.b7.vision : p === "monthly" ? st.b30.vision : st.bAll.vision) : null;
    if (metric === "consistency") value = consistency(s, id, p === "weekly" ? 7 : p === "monthly" ? 30 : 3650);
    if (metric === "streak") value = streakOf(s, id).current;
    return { id, value, aura };
  });
  return rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || b.aura - a.aura);
}

/* ---------- rivalries ---------- */
export function rivalryScore(s: GameState, r: Rivalry, id: string): number {
  const logs = userLogs(s, id).filter((l) => l.date >= r.start && l.date <= r.end && l.xp > 0);
  if (r.metric === "days") return new Set(logs.map((l) => l.date)).size;
  if (r.metric === "dim" && r.dim) return auraBetween(logs, r.start, r.end, r.dim);
  return auraBetween(logs, r.start, r.end);
}
export function rivalryStandings(s: GameState, r: Rivalry) {
  return r.participants.map((id) => ({ id, value: rivalryScore(s, r, id) })).sort((a, b) => b.value - a.value);
}
/** Winners of a finished rivalry (ties share the win); empty while it runs or if nobody scored. */
export function rivalryWinners(s: GameState, r: Rivalry, t = today()): string[] {
  if (r.end >= t || r.participants.length < 2) return [];
  const st = rivalryStandings(s, r);
  const top = st[0]?.value ?? 0;
  return top > 0 ? st.filter((x) => x.value === top).map((x) => x.id) : [];
}

/* ---------- achievements ---------- */
export interface Ctx { s: GameState; id: string; logs: LogEntry[]; aura: number; level: number; streak: number }
export interface BadgeDef { id: string; name: string; desc: string; test: (c: Ctx) => boolean; rare?: boolean; legacy?: boolean }
const tagCount = (c: Ctx, tag: string) => c.logs.filter((l) => l.tag === tag && l.xp > 0).length;
const kindCount = (c: Ctx, kind: string) => c.logs.filter((l) => l.kind === kind && l.xp > 0).length;

export const BADGES: BadgeDef[] = [
  { id: "spark", name: "First Spark", desc: "Complete your first quest", test: (c) => c.logs.some((l) => l.xp > 0 && l.kind !== "bonus") },
  { id: "aura100", name: "Century Charge", desc: "Earn your first 100 Aura Points", test: (c) => c.aura >= 100 },
  { id: "static", name: "Static Charge", desc: "Keep a 3-day streak", test: (c) => c.streak >= 3 },
  { id: "rod", name: "Lightning Rod", desc: "Seven days of completed commitments", test: (c) => c.streak >= 7 },
  { id: "lord", name: "Thunderlord", desc: "Keep a 21-day streak", test: (c) => c.streak >= 21, rare: true },
  { id: "storm30", name: "Thirty-Day Storm", desc: "A 30-day consistency streak", test: (c) => c.streak >= 30, rare: true },
  { id: "collab", name: "Better Together", desc: "Complete a mission with your cousins", test: (c) => c.logs.some((l) => l.tag === "mission" && l.xp > 0) },
  { id: "balanced", name: "Eye of the Storm", desc: "Reach 50% in all nine life areas", test: (c) => allBalanced(c), rare: true },
  { id: "quest", name: "Quest Master", desc: "Finish three challenges", test: (c) => kindCount(c, "challenge") >= 3 },
  { id: "goal", name: "Dream Chaser", desc: "Achieve your first goal", test: (c) => c.s.goals.some((g) => g.userId === c.id && g.done) },
  { id: "glue", name: "Squad Glue", desc: "Join three cousin meetups", test: (c) => kindCount(c, "meetup") >= 3 },
  { id: "rival", name: "Rival Slayer", desc: "Win a weekly rivalry", test: (c) => c.s.rivalries.some((r) => rivalryWinners(c.s, r).includes(c.id)) },
  { id: "aura1000", name: "Thousand Volts", desc: "Earn 1,000 Aura Points", test: (c) => c.aura >= 1000 },
  { id: "lvl5", name: "Storm Caller", desc: "Reach level 5", test: (c) => c.level >= 5 },
  { id: "lvl8", name: "Stormlord", desc: "Reach level 8", test: (c) => c.level >= 8, rare: true },
  { id: "gym", name: "Sweat Equity", desc: "Work out 50 times", test: (c) => tagCount(c, "workout") >= 50 },
  { id: "worm", name: "Bookworm", desc: "Read 25 times", test: (c) => tagCount(c, "read") >= 25 },
  { id: "ninja", name: "Builder", desc: "Upskill or build 30 times", test: (c) => tagCount(c, "code") >= 30 },
  { id: "scholar", name: "Scholar", desc: "Study 30 times", test: (c) => tagCount(c, "study") >= 30 },
  { id: "giver", name: "Giver", desc: "Volunteer once", test: (c) => tagCount(c, "volunteer") >= 1 },
  // earned in earlier versions; shown only to those who have them
  { id: "hydro", name: "Hydro Hero", desc: "Hit a water goal 25 times", test: () => false, legacy: true },
  { id: "saver", name: "Rainy-Day Saver", desc: "Saved ₹5,000 in total", test: () => false, legacy: true },
  { id: "reflect", name: "Reflective Soul", desc: "Wrote 5 gratitude entries", test: () => false, legacy: true },
  { id: "honest", name: "Honest Heart", desc: "Logged a slip-up honestly", test: () => false, legacy: true },
];

function allBalanced(c: Ctx): boolean {
  const b = lastDays(c.s, c.id, 30);
  return ACTIVE_DIMS.every((d) => (b.dims[d].score ?? 0) >= 50);
}

export function ctxFor(s: GameState, id: string): Ctx {
  const logs = userLogs(s, id);
  const aura = lifetimeAura(logs);
  return { s, id, logs, aura, level: levelOf(aura).level, streak: streakOf(s, id).best };
}
export function earnedBadgeIds(s: GameState, id: string): string[] {
  const c = ctxFor(s, id);
  return BADGES.filter((b) => !b.legacy && b.test(c)).map((b) => b.id);
}

/* ---------- squad ---------- */
export const squadWeeklyGoal = (s: GameState) => 800 * Math.max(1, s.members.length);
export function squadWeekAura(s: GameState): number {
  return memberIds(s).reduce((a, id) => a + Math.max(0, periodAura(s, id, "weekly")), 0);
}

/** Day labels for a deadline: "Ends today", "2 days left". */
export function timeLeft(end: string, t = today()): string {
  const n = daysBetween(t, end);
  return n < 0 ? "Ended" : n === 0 ? "Ends today" : n === 1 ? "1 day left" : `${n} days left`;
}
