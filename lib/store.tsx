"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ACTIVITIES, BASE_HABITS, COUSIN, COUSINS, MEALS } from "./catalog";
import { BADGES, earnedBadgeIds, levelOf, lifetimeXp, underdogMultiplier, userLogs } from "./engine";
import { makeSeed } from "./seed";
import type {
  Challenge, DimId, Duel, GameState, Goal, Habit, HealthDay, LogEntry, LogKind, Meetup, Memory, MoodEntry, Notif, PenaltyDef, Review, Settings,
} from "./types";
import { addDays, today, uid, weekStart } from "./utils";

const KEY = "thunderstorms-n-all:v1";
// bumping this wipes any state saved under an older version
const VERSION = 2;
const MANUAL_DAILY_CAP = 8;

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */
export type Action =
  | { t: "active"; id: string }
  | { t: "habit"; habitId: string }
  | { t: "habitAdd"; habit: Omit<Habit, "id" | "userId"> }
  | { t: "habitRemove"; habitId: string }
  | { t: "todoAdd"; title: string; dim: DimId; xp: number }
  | { t: "todo"; id: string }
  | { t: "todoDel"; id: string }
  | { t: "activity"; activityId: string; minutes: number; note: string }
  | { t: "quick"; label: string; xp: number; dim: DimId; tag: string; kind: LogKind }
  | { t: "penalty"; penaltyId: string; note: string }
  | { t: "rest" }
  | { t: "box" }
  | { t: "chJoin"; id: string }
  | { t: "chLog"; id: string; amount: number }
  | { t: "chCreate"; ch: Omit<Challenge, "id" | "progress" | "completedBy" | "createdBy" | "endsOn"> }
  | { t: "meetup"; m: Omit<Meetup, "id" | "xpEach">; memory?: { emoji: string; caption: string } }
  | { t: "memory"; m: Omit<Memory, "id" | "cheers" | "by"> }
  | { t: "cheer"; id: string }
  | { t: "goalAdd"; g: Omit<Goal, "id" | "userId" | "current"> }
  | { t: "goalStep"; id: string; amount: number }
  | { t: "goalDel"; id: string }
  | { t: "health"; patch: Partial<HealthDay> }
  | { t: "meal"; mealId: string }
  | { t: "workout"; type: string; mins: number }
  | { t: "mood"; entry: MoodEntry }
  | { t: "gratitude"; text: string }
  | { t: "review"; r: Omit<Review, "id" | "userId" | "weekOf"> }
  | { t: "saving"; amount: number; note: string }
  | { t: "savingTarget"; amount: number }
  | { t: "lesson"; id: string }
  | { t: "duel"; d: Omit<Duel, "id" | "start"> }
  | { t: "penaltyDefs"; defs: PenaltyDef[] }
  | { t: "settings"; patch: Partial<Settings> }
  | { t: "selfRate"; dim: DimId; value: number }
  | { t: "avatar"; emoji: string; aura: string }
  | { t: "notifsRead" }
  | { t: "sim" }
  | { t: "reset" };

class Nope extends Error {}

/* ------------------------------------------------------------------ */
/* XP primitives                                                       */
/* ------------------------------------------------------------------ */
type NewLog = Omit<LogEntry, "id" | "ts" | "date" | "userId"> & { date?: string };

function award(s: GameState, userId: string, l: NewLog): GameState {
  let xp = l.xp;
  if (xp > 0 && l.kind !== "bonus" && l.kind !== "penalty") xp = Math.round(xp * underdogMultiplier(s, userId));
  const entry: LogEntry = { ...l, xp, id: uid(), ts: Date.now(), date: l.date ?? today(), userId };
  return { ...s, logs: [...s.logs, entry] };
}
const hasRef = (s: GameState, userId: string, ref: string) => s.logs.some((l) => l.userId === userId && l.ref === ref);
const dropRef = (s: GameState, userId: string, ref: string): GameState => ({ ...s, logs: s.logs.filter((l) => !(l.userId === userId && l.ref === ref)) });
function setRef(s: GameState, userId: string, ref: string, on: boolean, l: NewLog): GameState {
  const has = hasRef(s, userId, ref);
  if (on && !has) return award(s, userId, { ...l, ref });
  if (!on && has) return dropRef(s, userId, ref);
  return s;
}
const notify = (s: GameState, icon: string, title: string, body?: string): GameState => ({
  ...s, notifs: [{ id: uid(), ts: Date.now(), icon, title, body, read: false }, ...s.notifs].slice(0, 60),
});
function manualCount(s: GameState, userId: string): number {
  const t = today();
  return s.logs.filter((l) => l.userId === userId && l.date === t && (l.kind === "activity" || l.kind === "career") && !l.ref).length;
}

export function habitsFor(s: GameState, userId: string): Habit[] {
  return [...BASE_HABITS, ...s.customHabits].filter((h) => (h.userId === "all" || h.userId === userId) && !s.hiddenHabits.includes(`${userId}:${h.id}`));
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */
function reduce(s: GameState, a: Action, me = s.activeId): GameState {
  const t = today();
  switch (a.t) {
    case "active": return { ...s, activeId: a.id };

    case "habit": {
      const h = habitsFor(s, me).find((x) => x.id === a.habitId);
      if (!h) return s;
      const ref = `h:${h.id}:${t}`;
      return setRef(s, me, ref, !hasRef(s, me, ref), { label: h.title, xp: h.xp, dim: h.dim, kind: "habit", tag: h.tag });
    }
    case "habitAdd": return { ...s, customHabits: [...s.customHabits, { ...a.habit, id: "ch" + uid(), userId: me }] };
    case "habitRemove": {
      const custom = s.customHabits.find((h) => h.id === a.habitId && h.userId === me);
      if (custom) return { ...s, customHabits: s.customHabits.filter((h) => h !== custom) };
      return { ...s, hiddenHabits: [...s.hiddenHabits, `${me}:${a.habitId}`] };
    }

    case "todoAdd": return { ...s, todos: [...s.todos, { id: uid(), userId: me, title: a.title, dim: a.dim, xp: a.xp, done: false, created: t }] };
    case "todo": {
      const td = s.todos.find((x) => x.id === a.id);
      if (!td) return s;
      const next = { ...s, todos: s.todos.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) };
      return setRef(next, td.userId, `todo:${td.id}`, !td.done, { label: td.title, xp: td.xp, dim: td.dim, kind: "todo" });
    }
    case "todoDel": return dropRef({ ...s, todos: s.todos.filter((x) => x.id !== a.id) }, me, `todo:${a.id}`);

    case "activity": {
      if (manualCount(s, me) >= MANUAL_DAILY_CAP) throw new Nope("Daily energy cap reached ⚡ Rest is part of the game. Come back tomorrow!");
      const act = ACTIVITIES.find((x) => x.id === a.activityId)!;
      const mult = Math.min(2, Math.max(0.5, (a.minutes || 30) / 30));
      return award(s, me, { label: a.note ? `${act.label}: ${a.note}` : act.label, xp: Math.round(act.xp * mult), dim: act.dim, kind: "activity", tag: act.tag });
    }
    case "quick": {
      if (manualCount(s, me) >= MANUAL_DAILY_CAP) throw new Nope("Daily energy cap reached ⚡ Rest is part of the game.");
      return award(s, me, { label: a.label, xp: a.xp, dim: a.dim, kind: a.kind, tag: a.tag });
    }
    case "penalty": {
      if (!s.settings.penaltiesOn) throw new Nope("Slip-ups are switched off in Settings.");
      const p = s.penalties.find((x) => x.id === a.penaltyId)!;
      const lostToday = -s.logs.filter((l) => l.userId === me && l.date === t && l.kind === "penalty").reduce((x, l) => x + l.xp, 0);
      const amt = Math.max(0, Math.min(p.xp, s.settings.penaltyCap - lostToday));
      let next = award(s, me, { label: a.note ? `${p.label} (${a.note})` : p.label, xp: -amt, dim: p.dim, kind: "penalty" });
      // honesty is rewarded: logging a slip-up truthfully gives a little back
      next = setRef(next, me, `honest:${t}`, true, { label: "Honesty bonus 💙", xp: 3, dim: "emotional", kind: "bonus" });
      return next;
    }
    case "rest": {
      const used = s.restDays[me] ?? [];
      const ws = weekStart(t);
      if (used.some((d) => d >= ws)) throw new Nope("You've already used this week's rest day.");
      return notify({ ...s, restDays: { ...s.restDays, [me]: [...used, t] } }, "🛌", "Rest day activated", "Your streak is safe today. Recovery is a strategy, not a weakness.");
    }
    case "box": {
      if (s.boxOpened[me] === t) throw new Nope("Already opened today, come back tomorrow!");
      const r = Math.random();
      const xp = r < 0.5 ? 10 : r < 0.8 ? 20 : r < 0.95 ? 35 : 75;
      return award({ ...s, boxOpened: { ...s.boxOpened, [me]: t } }, me, { label: xp === 75 ? "Surprise Bolt: JACKPOT ⚡" : "Surprise Bolt", xp, dim: "emotional", kind: "bonus", ref: `box:${t}` });
    }

    case "chJoin": return { ...s, challenges: s.challenges.map((c) => (c.id === a.id && !c.participants.includes(me) ? { ...c, participants: [...c.participants, me] } : c)) };
    case "chLog": {
      const c0 = s.challenges.find((c) => c.id === a.id);
      if (!c0) return s;
      const c: Challenge = { ...c0, progress: { ...c0.progress, [me]: Math.max(0, (c0.progress[me] ?? 0) + a.amount) } };
      let next: GameState = { ...s, challenges: s.challenges.map((x) => (x.id === c.id ? c : x)) };
      if (c.scope === "solo") {
        if ((c.progress[me] ?? 0) >= c.target && !c.completedBy.includes(me)) {
          next = { ...next, challenges: next.challenges.map((x) => (x.id === c.id ? { ...x, completedBy: [...x.completedBy, me] } : x)) };
          next = award(next, me, { label: `Challenge complete: ${c.title}`, xp: c.xp, dim: c.dim, kind: "challenge", tag: "challenge", ref: `ch:${c.id}` });
          next = notify(next, c.emoji, `${COUSIN[me].name} completed “${c.title}”`, `+${c.xp} XP`);
        }
      } else {
        const sum = Object.values(c.progress).reduce((x, y) => x + y, 0);
        if (sum >= c.target && c.completedBy.length === 0) {
          next = { ...next, challenges: next.challenges.map((x) => (x.id === c.id ? { ...x, completedBy: [...x.participants] } : x)) };
          for (const p of c.participants) next = award(next, p, { label: `Squad mission: ${c.title}`, xp: c.xp, dim: c.dim, kind: "challenge", tag: "challenge", ref: `ch:${c.id}` });
          next = notify(next, "🤝", `Squad mission complete: ${c.title}`, `Everyone who joined earns +${c.xp} XP`);
        }
      }
      return next;
    }
    case "chCreate": {
      const endsOn = a.ch.period === "daily" ? t : a.ch.period === "weekly" ? addDays(weekStart(t), 6) : addDays(t, 30);
      const c: Challenge = { ...a.ch, id: uid(), progress: {}, completedBy: [], createdBy: me, endsOn, participants: Array.from(new Set([me, ...a.ch.participants])) };
      return notify({ ...s, challenges: [c, ...s.challenges] }, c.emoji, `${COUSIN[me].name} launched a new challenge`, c.title);
    }

    case "meetup": {
      const n = a.m.attendees.length;
      if (n < 2) throw new Nope("A meetup needs at least 2 cousins!");
      const full = n === COUSINS.length;
      const xpEach = 30 + (n - 2) * 10 + (full ? 50 : 0);
      const m: Meetup = { ...a.m, id: uid(), xpEach };
      let next: GameState = { ...s, meetups: [...s.meetups, m] };
      for (const p of a.m.attendees) {
        next = award(next, p, { label: `Meetup: ${m.place}`, xp: xpEach, dim: "family", kind: "meetup", tag: "family", ref: `mt:${m.id}:${p}`, date: m.date });
        // the Bangalore cousin travelling to Hyderabad (or the reverse) earns a travel bonus
        if (COUSIN[p].city === "Bangalore" && !/bangalore|cubbon|lalbagh|mtr|nandi/i.test(m.place))
          next = award(next, p, { label: "Travel bonus 🚆", xp: 20, dim: "family", kind: "bonus", ref: `tr:${m.id}:${p}`, date: m.date });
      }
      if (a.memory?.caption) next = { ...next, memories: [{ id: uid(), meetupId: m.id, date: m.date, emoji: a.memory.emoji, title: m.place, caption: a.memory.caption, by: me, cheers: [] }, ...next.memories] };
      return notify(next, full ? "🌩️" : "🏡", full ? "FULL SQUAD ASSEMBLED!" : "Cousin meetup logged", `${m.place}: +${xpEach} XP each`);
    }
    case "memory": return { ...s, memories: [{ ...a.m, id: uid(), by: me, cheers: [] }, ...s.memories] };
    case "cheer": return { ...s, memories: s.memories.map((m) => (m.id === a.id ? { ...m, cheers: m.cheers.includes(me) ? m.cheers.filter((x) => x !== me) : [...m.cheers, me] } : m)) };

    case "goalAdd": return { ...s, goals: [...s.goals, { ...a.g, id: uid(), userId: me, current: 0 }] };
    case "goalStep": {
      const g = s.goals.find((x) => x.id === a.id);
      if (!g || g.done) return s;
      const current = Math.min(g.target, Math.max(0, g.current + a.amount));
      let next: GameState = { ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, current, done: current >= g.target } : x)) };
      const gain = g.unit === "₹" ? Math.min(30, Math.round(a.amount / 200)) : Math.round(g.xpPerStep * a.amount);
      if (a.amount > 0 && gain > 0) next = award(next, me, { label: `Progress: ${g.title}`, xp: Math.min(gain, 60), dim: g.dim, kind: "goal" });
      if (current >= g.target) {
        next = award(next, me, { label: `Goal crushed: ${g.title}`, xp: 100, dim: g.dim, kind: "goal", ref: `goal:${g.id}` });
        next = notify(next, "🏆", `${COUSIN[me].name} crushed a goal!`, g.title);
      }
      return next;
    }
    case "goalDel": return { ...s, goals: s.goals.filter((x) => x.id !== a.id) };

    case "health": {
      const cur: HealthDay = s.health[me]?.[t] ?? { water: 0, sleep: 0, meals: [], workouts: [] };
      const h = { ...cur, ...a.patch };
      let next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: h } } };
      next = setRef(next, me, `water:${t}`, h.water >= 8, { label: "Hydration goal: 8 glasses", xp: 15, dim: "health", kind: "health", tag: "water" });
      next = setRef(next, me, `sleep:${t}`, h.sleep >= 7 && h.sleep <= 9.5, { label: "Restful sleep (7–9 h)", xp: 15, dim: "health", kind: "health", tag: "sleep" });
      return next;
    }
    case "meal": {
      const cur: HealthDay = s.health[me]?.[t] ?? { water: 0, sleep: 0, meals: [], workouts: [] };
      const on = !cur.meals.includes(a.mealId);
      const meal = MEALS.find((m) => m.id === a.mealId)!;
      const next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: { ...cur, meals: on ? [...cur.meals, a.mealId] : cur.meals.filter((x) => x !== a.mealId) } } } };
      const label = a.mealId === "treat" ? "Enjoyed a treat mindfully" : `Mindful meal: ${meal.label}`;
      return setRef(next, me, `meal:${a.mealId}:${t}`, on, { label, xp: meal.balanced ? 8 : 4, dim: "health", kind: "health", tag: meal.balanced ? "meal" : undefined });
    }
    case "workout": {
      const cur: HealthDay = s.health[me]?.[t] ?? { water: 0, sleep: 0, meals: [], workouts: [] };
      const next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: { ...cur, workouts: [...cur.workouts, { type: a.type, mins: a.mins }] } } } };
      return award(next, me, { label: `${a.type} · ${a.mins} min`, xp: Math.max(10, Math.min(40, Math.round(a.mins / 1.5))), dim: "health", kind: "health", tag: "workout" });
    }

    case "mood": {
      const next = { ...s, mood: { ...s.mood, [me]: { ...s.mood[me], [t]: a.entry } } };
      return setRef(next, me, `mood:${t}`, true, { label: "Mood check-in", xp: 5, dim: "emotional", kind: "reflect" });
    }
    case "gratitude": {
      const mineToday = s.gratitude.filter((g) => g.userId === me && g.date === t).length;
      const next = { ...s, gratitude: [{ id: uid(), userId: me, date: t, text: a.text }, ...s.gratitude] };
      return mineToday < 3 ? award(next, me, { label: "Gratitude journal", xp: 10, dim: "emotional", kind: "reflect", tag: "journal" }) : next;
    }
    case "review": {
      const wk = weekStart(t);
      if (s.reviews.some((r) => r.userId === me && r.weekOf === wk)) throw new Nope("This week's review is already done. Nice!");
      const next = { ...s, reviews: [{ ...a.r, id: uid(), userId: me, weekOf: wk }, ...s.reviews] };
      return award(next, me, { label: "Weekly review", xp: 40, dim: "vision", kind: "reflect", tag: "journal", ref: `rev:${wk}` });
    }

    case "saving": {
      const next = { ...s, savings: [{ id: uid(), userId: me, date: t, amount: a.amount, note: a.note }, ...s.savings] };
      return award(next, me, { label: `Saved ₹${a.amount.toLocaleString("en-IN")}${a.note ? `: ${a.note}` : ""}`, xp: Math.max(5, Math.min(30, Math.round(a.amount / 100))), dim: "money", kind: "money", tag: "save" });
    }
    case "savingTarget": return { ...s, savingsTarget: { ...s.savingsTarget, [me]: a.amount } };
    case "lesson": {
      if ((s.lessons[me] ?? []).includes(a.id)) return s;
      const next = { ...s, lessons: { ...s.lessons, [me]: [...(s.lessons[me] ?? []), a.id] } };
      return award(next, me, { label: "Financial literacy lesson", xp: 15, dim: "money", kind: "money", tag: "study", ref: `lesson:${a.id}` });
    }

    case "duel": return notify({ ...s, duels: [{ ...a.d, id: uid(), start: a.d.period === "week" ? weekStart(t) : t.slice(0, 8) + "01" }, ...s.duels] }, "⚔️", `New duel: ${COUSIN[a.d.a].name} vs ${COUSIN[a.d.b].name}`, a.d.stake);
    case "penaltyDefs": return { ...s, penalties: a.defs };
    case "settings": return { ...s, settings: { ...s.settings, ...a.patch } };
    case "selfRate": return { ...s, selfRatings: { ...s.selfRatings, [me]: { ...s.selfRatings[me], [a.dim]: a.value } } };
    case "avatar": return { ...s, avatars: { ...s.avatars, [me]: { emoji: a.emoji, aura: a.aura } } };
    case "notifsRead": return { ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) };

    case "sim": {
      // another cousin does something in "real time" for the demo
      const others = COUSINS.filter((c) => c.id !== s.activeId);
      const c = others[Math.floor(Math.random() * others.length)];
      const pending = habitsFor(s, c.id).filter((h) => !hasRef(s, c.id, `h:${h.id}:${t}`));
      if (pending.length && Math.random() < 0.75) return reduce(s, { t: "habit", habitId: pending[Math.floor(Math.random() * pending.length)].id }, c.id);
      const act = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
      return award(s, c.id, { label: act.label, xp: act.xp, dim: act.dim, kind: "activity", tag: act.tag });
    }
    case "reset": return makeSeed();
  }
}

/* sync badges & levels; returns newly earned for celebrations */
interface Celebration { kind: "badge" | "level"; userId: string; emoji: string; title: string; body: string }
function syncProgress(s: GameState, silent: boolean): { s: GameState; cel: Celebration[] } {
  const cel: Celebration[] = [];
  let next = s;
  for (const c of COUSINS) {
    const have = next.badges[c.id] ?? {};
    const earned = earnedBadgeIds(next, c.id);
    const fresh = earned.filter((b) => !have[b]);
    const lvl = levelOf(lifetimeXp(userLogs(next, c.id))).level;
    const seen = next.levelSeen[c.id] ?? 0;
    if (!fresh.length && lvl <= seen) continue;
    const badges = { ...have };
    for (const b of fresh) badges[b] = Date.now();
    next = { ...next, badges: { ...next.badges, [c.id]: badges }, levelSeen: { ...next.levelSeen, [c.id]: Math.max(lvl, seen) } };
    if (silent) continue;
    for (const b of fresh) {
      const def = BADGES.find((x) => x.id === b)!;
      next = notify(next, def.emoji, `${c.name} unlocked “${def.name}”`, def.desc);
      cel.push({ kind: "badge", userId: c.id, emoji: def.emoji, title: def.name, body: def.desc });
    }
    if (lvl > seen && seen > 0) {
      const L = levelOf(lifetimeXp(userLogs(next, c.id)));
      next = notify(next, "⬆️", `${c.name} reached level ${lvl}!`, `New title: ${L.title}`);
      cel.push({ kind: "level", userId: c.id, emoji: "⚡", title: `Level ${lvl}`, body: L.title });
    }
  }
  return { s: next, cel };
}

/* ------------------------------------------------------------------ */
/* provider                                                            */
/* ------------------------------------------------------------------ */
export interface Toast { id: string; icon: string; text: string; tone: "xp" | "info" | "warn" | "minus" }

interface Ctx {
  s: GameState;
  act: (a: Action) => boolean;
  me: string;
  toasts: Toast[];
  toast: (icon: string, text: string, tone?: Toast["tone"]) => void;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  logOpen: boolean;
  setLogOpen: (v: boolean) => void;
}
const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<GameState | null>(null);
  const ref = useRef<GameState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  const toast = useCallback((icon: string, text: string, tone: Toast["tone"] = "info") => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, icon, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    let st: GameState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) st = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!st || st.v !== VERSION) st = makeSeed();
    st = syncProgress(st, true).s;
    ref.current = st;
    setS(st);
  }, []);

  useEffect(() => {
    if (!s) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  const act = useCallback((a: Action): boolean => {
    const prev = ref.current;
    if (!prev) return false;
    let next: GameState;
    try {
      next = reduce(prev, a);
    } catch (e) {
      if (e instanceof Nope) { toast("🌧️", e.message, "warn"); return false; }
      throw e;
    }
    const { s: synced, cel } = syncProgress(next, a.t === "reset");
    next = synced;
    // XP feedback
    if (a.t !== "reset") {
      const prevIds = new Set(prev.logs.map((l) => l.id));
      const added = next.logs.filter((l) => !prevIds.has(l.id));
      const removed = prev.logs.length + added.length - next.logs.length;
      for (const l of added) {
        if (l.userId === next.activeId) {
          if (l.xp > 0) toast("⚡", `+${l.xp} XP · ${l.label}`, "xp");
          else if (l.xp < 0) toast("🌧️", `${l.xp} XP. Logged honestly. Tomorrow's a fresh storm.`, "minus");
        } else if (a.t === "sim") {
          toast(COUSIN[l.userId].emoji, `${COUSIN[l.userId].name} +${l.xp} XP · ${l.label}`, "info");
        }
      }
      if (removed > 0 && a.t !== "sim" && !added.length) toast("↩️", "Undone. XP removed.", "info");
    }
    ref.current = next;
    setS(next);
    const mine = cel.filter((c) => c.userId === next.activeId);
    if (mine.length) setQueue((q) => [...q, ...mine]);
    for (const c of cel.filter((c) => c.userId !== next.activeId)) toast(c.emoji, `${COUSIN[c.userId].name}: ${c.title}!`, "info");
    if (a.t === "reset") toast("⛈️", "Everything reset. Fresh start for all five cousins", "info");
    return true;
  }, [toast]);

  // live cousins: someone does something every ~25 s
  useEffect(() => {
    if (!s?.settings.liveSim) return;
    const id = setInterval(() => act({ t: "sim" }), 25000);
    return () => clearInterval(id);
  }, [s?.settings.liveSim, act]);

  if (!s) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="animate-float text-5xl">⛈️</div>
          <p className="font-display text-sm tracking-widest">GATHERING THE STORM…</p>
        </div>
      </div>
    );
  }
  return (
    <GameCtx.Provider value={{ s, act, me: s.activeId, toasts, toast, celebration: queue[0] ?? null, dismissCelebration: () => setQueue((q) => q.slice(1)), logOpen, setLogOpen }}>
      {children}
    </GameCtx.Provider>
  );
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}
