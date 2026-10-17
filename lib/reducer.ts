import { ACTIVITIES, CAREER_QUICK, CHALLENGE_XP, DIM_IDS, LESSONS, MEALS } from "./catalog";
import { BADGES, earnedBadgeIds, levelOf, lifetimeXp, underdogMultiplier, userLogs } from "./engine";
import type { Challenge, DimId, GameState, Goal, Habit, HealthDay, LogEntry, Meetup, MoodEntry, NotifIcon, PenaltyDef, Settings, Todo } from "./types";
import { addDays, today, uid, weekStart } from "./utils";

/**
 * The game rules. Pure and shared: the server runs it as the source of truth,
 * the client runs it for instant (optimistic) feedback.
 */

export const MANUAL_DAILY_CAP = 8;
const MAX_HABITS = 30;
const MAX_OPEN_TODOS = 100;
const MAX_GOALS = 50;

export type Action =
  | { t: "habit"; habitId: string }
  | { t: "habitAdd"; id?: string; habit: { title: string; emoji: string; dim: DimId; xp: number; goalId?: string } }
  | { t: "habitRemove"; habitId: string }
  | { t: "todoAdd"; id?: string; title: string; dim: DimId; xp: number; emoji?: string; goalId?: string }
  | { t: "todo"; id: string }
  | { t: "todoDel"; id: string }
  | { t: "activity"; activityId: string; minutes: number; note: string }
  | { t: "quick"; id: string }
  | { t: "penalty"; penaltyId: string; note: string }
  | { t: "rest" }
  | { t: "box" }
  | { t: "chJoin"; id: string }
  | { t: "chLog"; id: string; amount: number }
  | { t: "chCreate"; id?: string; ch: Pick<Challenge, "title" | "desc" | "emoji" | "period" | "scope" | "dim" | "target" | "unit" | "participants"> }
  | { t: "chDel"; id: string }
  | { t: "meetup"; id?: string; m: Pick<Meetup, "date" | "place" | "kind" | "attendees" | "note">; memory?: { emoji: string; caption: string } }
  | { t: "cheer"; id: string }
  | { t: "goalAdd"; id?: string; g: { title: string; dim: DimId; why?: string; target?: number; unit?: string; due?: string } }
  | { t: "goalStep"; id: string; amount: number }
  | { t: "goalToggle"; id: string }
  | { t: "goalDel"; id: string }
  | { t: "health"; patch: Partial<Pick<HealthDay, "water" | "sleep">> }
  | { t: "meal"; mealId: string }
  | { t: "workout"; type: string; mins: number }
  | { t: "mood"; entry: MoodEntry }
  | { t: "gratitude"; text: string }
  | { t: "review"; r: { wins: string; struggles: string; intention: string; rating: number } }
  | { t: "saving"; amount: number; note: string }
  | { t: "savingTarget"; amount: number }
  | { t: "lesson"; id: string }
  | { t: "duel"; d: { b: string; metric: "xp" | "days"; period: "week" | "month"; stake: string } }
  | { t: "penaltyDefs"; defs: PenaltyDef[] }
  | { t: "settings"; patch: Partial<Settings> }
  | { t: "selfRate"; dim: DimId; value: number }
  | { t: "notifsRead" };

export const ACTION_TYPES = new Set<Action["t"]>([
  "habit", "habitAdd", "habitRemove", "todoAdd", "todo", "todoDel", "activity", "quick", "penalty", "rest", "box",
  "chJoin", "chLog", "chCreate", "chDel", "meetup", "cheer", "goalAdd", "goalStep", "goalToggle", "goalDel",
  "health", "meal", "workout", "mood", "gratitude", "review", "saving", "savingTarget", "lesson", "duel",
  "penaltyDefs", "settings", "selfRate", "notifsRead",
]);
const ADMIN_ONLY = new Set<Action["t"]>(["penaltyDefs", "settings"]);

/** A rule says no. The message is safe to show to the user. */
export class Nope extends Error {}

/* ------------------------------------------------------------------ */
/* input sanitising: every field coming from a client goes through here */
/* ------------------------------------------------------------------ */
const line = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const para = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r/g, "").trim().slice(0, max) : "");
function int(v: unknown, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
const dimOf = (v: unknown, fallback: DimId = "health"): DimId => (DIM_IDS.includes(v as DimId) ? (v as DimId) : fallback);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const emojiOf = (v: unknown, fallback = "✨") => line(v, 8) || fallback;
const isMember = (s: GameState, id: unknown) => typeof id === "string" && s.members.some((m) => m.id === id);
const nameOf = (s: GameState, id: string) => s.members.find((m) => m.id === id)?.name ?? "A cousin";
/** Client-chosen ids keep optimistic and server state in step; anything odd or taken falls back to a fresh id. */
function newId(v: unknown, taken: { id: string }[]): string {
  if (typeof v === "string" && /^[a-z0-9]{6,16}$/.test(v) && !taken.some((x) => x.id === v)) return v;
  return uid();
}

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
const notify = (s: GameState, icon: NotifIcon, title: string, body?: string): GameState => ({
  ...s, notifs: [{ id: uid(), ts: Date.now(), icon, title, body }, ...s.notifs].slice(0, 60),
});
function manualCount(s: GameState, userId: string): number {
  const t = today();
  return s.logs.filter((l) => l.userId === userId && l.date === t && (l.kind === "activity" || l.kind === "career") && !l.ref).length;
}
const capReached = () => new Nope("You've hit today's logging limit. Rest is part of the game, so come back tomorrow.");

export function habitsFor(s: GameState, userId: string): Habit[] {
  return s.habits.filter((h) => h.userId === userId);
}
const ownGoal = (s: GameState, me: string, id: unknown): Goal | undefined => s.goals.find((g) => g.id === id && g.userId === me);
const EMPTY_DAY: HealthDay = { water: 0, sleep: 0, meals: [], workouts: [] };

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */
export function reduce(s: GameState, a: Action, me: string, opts: { admin?: boolean } = {}): GameState {
  if (!isMember(s, me)) throw new Nope("Your account isn't part of the squad.");
  if (ADMIN_ONLY.has(a.t) && !opts.admin) throw new Nope("Only the squad organiser can change the house rules.");
  const t = today();
  switch (a.t) {
    case "habit": {
      const h = habitsFor(s, me).find((x) => x.id === a.habitId);
      if (!h) return s;
      const ref = `h:${h.id}:${t}`;
      return setRef(s, me, ref, !hasRef(s, me, ref), { label: h.title, xp: h.xp, dim: h.dim, kind: "habit", tag: h.tag });
    }
    case "habitAdd": {
      const title = line(a.habit?.title, 80);
      if (!title) throw new Nope("Give your quest a name.");
      if (habitsFor(s, me).length >= MAX_HABITS) throw new Nope(`You can have up to ${MAX_HABITS} daily quests. Retire one first.`);
      const goalId = ownGoal(s, me, a.habit.goalId)?.id;
      const h: Habit = { id: newId(a.id, s.habits), userId: me, title, emoji: emojiOf(a.habit.emoji), dim: dimOf(a.habit.dim), xp: int(a.habit.xp, 5, 30), created: t, ...(goalId ? { goalId } : {}) };
      return { ...s, habits: [...s.habits, h] };
    }
    case "habitRemove": return { ...s, habits: s.habits.filter((h) => !(h.id === a.habitId && h.userId === me)) };

    case "todoAdd": {
      const title = line(a.title, 80);
      if (!title) throw new Nope("Give your quest a name.");
      if (s.todos.filter((x) => x.userId === me && !x.done).length >= MAX_OPEN_TODOS) throw new Nope("That's a lot of open quests. Finish or clear a few first.");
      const goalId = ownGoal(s, me, a.goalId)?.id;
      const td: Todo = { id: newId(a.id, s.todos), userId: me, title, emoji: emojiOf(a.emoji), dim: dimOf(a.dim), xp: int(a.xp, 5, 30), done: false, created: t, ...(goalId ? { goalId } : {}) };
      return { ...s, todos: [...s.todos, td] };
    }
    case "todo": {
      const td = s.todos.find((x) => x.id === a.id && x.userId === me);
      if (!td) return s;
      const next = { ...s, todos: s.todos.map((x) => (x.id === td.id ? { ...x, done: !x.done, doneOn: x.done ? undefined : t } : x)) };
      return setRef(next, me, `todo:${td.id}`, !td.done, { label: td.title, xp: td.xp, dim: td.dim, kind: "todo" });
    }
    case "todoDel": {
      const td = s.todos.find((x) => x.id === a.id && x.userId === me);
      if (!td) return s;
      // a finished quest keeps its XP; an unfinished one never earned any
      return { ...s, todos: s.todos.filter((x) => x.id !== td.id) };
    }

    case "activity": {
      const act = ACTIVITIES.find((x) => x.id === a.activityId);
      if (!act) return s;
      if (manualCount(s, me) >= MANUAL_DAILY_CAP) throw capReached();
      const mins = int(a.minutes, 10, 120);
      const mult = Math.min(2, Math.max(0.5, mins / 30));
      const note = line(a.note, 80);
      return award(s, me, { label: note ? `${act.label}: ${note}` : act.label, xp: Math.round(act.xp * mult), dim: act.dim, kind: "activity", tag: act.tag });
    }
    case "quick": {
      const q = CAREER_QUICK.find((x) => x.id === a.id);
      if (!q) return s;
      if (manualCount(s, me) >= MANUAL_DAILY_CAP) throw capReached();
      return award(s, me, { label: q.label, xp: q.xp, dim: q.dim, kind: "career", tag: q.tag });
    }
    case "penalty": {
      if (!s.settings.penaltiesOn) throw new Nope("Slip-ups are switched off for the squad.");
      const p = s.penalties.find((x) => x.id === a.penaltyId && x.on);
      if (!p) return s;
      const lostToday = -s.logs.filter((l) => l.userId === me && l.date === t && l.kind === "penalty").reduce((x, l) => x + l.xp, 0);
      const amt = Math.max(0, Math.min(p.xp, s.settings.penaltyCap - lostToday));
      const note = line(a.note, 80);
      let next = award(s, me, { label: note ? `${p.label} (${note})` : p.label, xp: -amt, dim: p.dim, kind: "penalty" });
      // honesty is rewarded: logging a slip-up truthfully gives a little back
      next = setRef(next, me, `honest:${t}`, true, { label: "Honesty bonus", xp: 3, dim: "emotional", kind: "bonus" });
      return next;
    }
    case "rest": {
      const used = s.restDays[me] ?? [];
      if (used.some((d) => d >= weekStart(t))) throw new Nope("You've already used this week's rest day.");
      return { ...s, restDays: { ...s.restDays, [me]: [...used, t] } };
    }
    case "box": {
      if (s.boxOpened[me] === t) throw new Nope("Today's spark is already open. A new one arrives at midnight.");
      const r = Math.random();
      const xp = r < 0.5 ? 10 : r < 0.8 ? 20 : r < 0.95 ? 35 : 75;
      return award({ ...s, boxOpened: { ...s.boxOpened, [me]: t } }, me, { label: xp === 75 ? "Daily spark: a lightning strike" : "Daily spark", xp, dim: "emotional", kind: "bonus", ref: `box:${t}` });
    }

    case "chJoin": return { ...s, challenges: s.challenges.map((c) => (c.id === a.id && c.endsOn >= t && !c.participants.includes(me) ? { ...c, participants: [...c.participants, me] } : c)) };
    case "chLog": {
      const c0 = s.challenges.find((c) => c.id === a.id);
      if (!c0 || !c0.participants.includes(me)) return s;
      if (c0.endsOn < t) throw new Nope("This challenge has ended.");
      const amount = int(a.amount, -c0.target, c0.target);
      const c: Challenge = { ...c0, progress: { ...c0.progress, [me]: Math.max(0, (c0.progress[me] ?? 0) + amount) } };
      let next: GameState = { ...s, challenges: s.challenges.map((x) => (x.id === c.id ? c : x)) };
      if (c.scope === "solo") {
        if ((c.progress[me] ?? 0) >= c.target && !c.completedBy.includes(me)) {
          next = { ...next, challenges: next.challenges.map((x) => (x.id === c.id ? { ...x, completedBy: [...x.completedBy, me] } : x)) };
          next = award(next, me, { label: `Challenge complete: ${c.title}`, xp: c.xp, dim: c.dim, kind: "challenge", tag: "challenge", ref: `ch:${c.id}` });
          next = notify(next, "quest", `${nameOf(s, me)} completed “${c.title}”`, `+${c.xp} XP`);
        }
      } else {
        const sum = Object.values(c.progress).reduce((x, y) => x + y, 0);
        if (sum >= c.target && c.completedBy.length === 0) {
          next = { ...next, challenges: next.challenges.map((x) => (x.id === c.id ? { ...x, completedBy: [...x.participants] } : x)) };
          for (const p of c.participants) next = award(next, p, { label: `Squad challenge: ${c.title}`, xp: c.xp, dim: c.dim, kind: "challenge", tag: "challenge", ref: `ch:${c.id}` });
          next = notify(next, "users", `Squad challenge complete: ${c.title}`, `Everyone who joined earns +${c.xp} XP`);
        }
      }
      return next;
    }
    case "chCreate": {
      const title = line(a.ch?.title, 80);
      if (!title) throw new Nope("Give your challenge a name.");
      const period = (["daily", "weekly", "monthly"] as const).includes(a.ch.period) ? a.ch.period : "weekly";
      const scope = a.ch.scope === "squad" ? "squad" : "solo";
      const endsOn = period === "daily" ? t : period === "weekly" ? addDays(weekStart(t), 6) : addDays(t, 30);
      const invited = Array.isArray(a.ch.participants) ? a.ch.participants.filter((p) => isMember(s, p)) : [];
      const c: Challenge = {
        id: newId(a.id, s.challenges), title, desc: para(a.ch.desc, 240), emoji: emojiOf(a.ch.emoji, "⚡"), period, scope, dim: dimOf(a.ch.dim),
        xp: CHALLENGE_XP[period], target: int(a.ch.target, 1, 1_000_000), unit: line(a.ch.unit, 20) || "times",
        participants: Array.from(new Set([me, ...invited])), progress: {}, completedBy: [], createdBy: me, endsOn,
      };
      const next = { ...s, challenges: [c, ...s.challenges] };
      return c.participants.length > 1 || scope === "squad" ? notify(next, "quest", `${nameOf(s, me)} started a challenge`, c.title) : next;
    }
    case "chDel": return { ...s, challenges: s.challenges.filter((c) => !(c.id === a.id && c.createdBy === me)) };

    case "meetup": {
      const attendees = Array.from(new Set((Array.isArray(a.m?.attendees) ? a.m.attendees : []).filter((p) => isMember(s, p))));
      if (!attendees.includes(me)) attendees.unshift(me);
      if (attendees.length < 2) throw new Nope("A meetup needs at least two cousins.");
      const place = line(a.m.place, 80);
      if (!place) throw new Nope("Where did you meet?");
      const date = isDate(a.m.date) && a.m.date <= t && a.m.date >= addDays(t, -60) ? a.m.date : t;
      const full = attendees.length === s.members.length && attendees.length >= 3;
      const xpEach = 30 + (attendees.length - 2) * 10 + (full ? 50 : 0);
      const m: Meetup = { id: newId(a.id, s.meetups), date, place, kind: line(a.m.kind, 40) || "Meetup", attendees, note: line(a.m.note, 200), xpEach, by: me };
      let next: GameState = { ...s, meetups: [...s.meetups, m] };
      for (const p of attendees) next = award(next, p, { label: `Meetup: ${m.place}`, xp: xpEach, dim: "family", kind: "meetup", tag: "family", ref: `mt:${m.id}:${p}`, date });
      const caption = line(a.memory?.caption, 280);
      if (caption) next = { ...next, memories: [{ id: uid(), meetupId: m.id, date, emoji: emojiOf(a.memory?.emoji, "📸"), title: m.place, caption, by: me, cheers: [] }, ...next.memories] };
      return notify(next, "users", full ? "The whole squad got together" : "Cousin meetup logged", `${m.place}: +${xpEach} XP each`);
    }
    case "cheer": return { ...s, memories: s.memories.map((m) => (m.id === a.id ? { ...m, cheers: m.cheers.includes(me) ? m.cheers.filter((x) => x !== me) : [...m.cheers, me] } : m)) };

    case "goalAdd": {
      const title = line(a.g?.title, 100);
      if (!title) throw new Nope("Give your goal a name.");
      if (s.goals.filter((g) => g.userId === me && !g.done).length >= MAX_GOALS) throw new Nope("That's a lot of goals. Achieve or let go of a few first.");
      const target = a.g.target == null || a.g.target === 0 ? undefined : int(a.g.target, 1, 100_000_000);
      const g: Goal = {
        id: newId(a.id, s.goals), userId: me, title, dim: dimOf(a.g.dim, "vision"), current: 0, xpPerStep: 10, created: t,
        ...(line(a.g.why, 200) ? { why: line(a.g.why, 200) } : {}),
        ...(target ? { target, unit: line(a.g.unit, 20) || "steps" } : {}),
        ...(isDate(a.g.due) ? { due: a.g.due } : {}),
      };
      return { ...s, goals: [...s.goals, g] };
    }
    case "goalStep": {
      const g = ownGoal(s, me, a.id);
      if (!g || g.done || !g.target) return s;
      const amount = int(a.amount, -g.target, g.target);
      const current = Math.min(g.target, Math.max(0, g.current + amount));
      const done = current >= g.target;
      let next: GameState = { ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, current, done, doneOn: done ? t : undefined } : x)) };
      const gain = g.unit === "₹" ? Math.min(30, Math.round(amount / 200)) : Math.round(g.xpPerStep * amount);
      if (amount > 0 && gain > 0) next = award(next, me, { label: `Progress: ${g.title}`, xp: Math.min(gain, 60), dim: g.dim, kind: "goal" });
      if (done) {
        next = award(next, me, { label: `Goal achieved: ${g.title}`, xp: 100, dim: g.dim, kind: "goal", ref: `goal:${g.id}` });
        next = notify(next, "goal", `${nameOf(s, me)} achieved a goal`, g.title);
      }
      return next;
    }
    case "goalToggle": {
      const g = ownGoal(s, me, a.id);
      if (!g) return s;
      const done = !g.done;
      let next: GameState = { ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, done, doneOn: done ? t : undefined } : x)) };
      next = setRef(next, me, `goal:${g.id}`, done, { label: `Goal achieved: ${g.title}`, xp: 100, dim: g.dim, kind: "goal" });
      return done ? notify(next, "goal", `${nameOf(s, me)} achieved a goal`, g.title) : next;
    }
    case "goalDel": {
      const g = ownGoal(s, me, a.id);
      if (!g) return s;
      const unlink = <T extends { goalId?: string }>(x: T): T => (x.goalId === g.id ? { ...x, goalId: undefined } : x);
      return { ...s, goals: s.goals.filter((x) => x.id !== g.id), habits: s.habits.map(unlink), todos: s.todos.map(unlink) };
    }

    case "health": {
      const cur: HealthDay = s.health[me]?.[t] ?? EMPTY_DAY;
      const h: HealthDay = { ...cur };
      if (a.patch?.water !== undefined) h.water = int(a.patch.water, 0, 20);
      if (a.patch?.sleep !== undefined) h.sleep = Math.round(Math.min(14, Math.max(0, Number(a.patch.sleep) || 0)) * 2) / 2;
      let next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: h } } };
      next = setRef(next, me, `water:${t}`, h.water >= 8, { label: "Hydration goal: 8 glasses", xp: 15, dim: "health", kind: "health", tag: "water" });
      next = setRef(next, me, `sleep:${t}`, h.sleep >= 7 && h.sleep <= 9.5, { label: "Restful sleep (7–9 h)", xp: 15, dim: "health", kind: "health", tag: "sleep" });
      return next;
    }
    case "meal": {
      const meal = MEALS.find((m) => m.id === a.mealId);
      if (!meal) return s;
      const cur: HealthDay = s.health[me]?.[t] ?? EMPTY_DAY;
      const on = !cur.meals.includes(meal.id);
      const next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: { ...cur, meals: on ? [...cur.meals, meal.id] : cur.meals.filter((x) => x !== meal.id) } } } };
      const label = meal.id === "treat" ? "Enjoyed a treat mindfully" : `Mindful meal: ${meal.label}`;
      return setRef(next, me, `meal:${meal.id}:${t}`, on, { label, xp: meal.balanced ? 8 : 4, dim: "health", kind: "health", tag: meal.balanced ? "meal" : undefined });
    }
    case "workout": {
      const type = line(a.type, 40) || "Workout";
      const mins = int(a.mins, 5, 240);
      const cur: HealthDay = s.health[me]?.[t] ?? EMPTY_DAY;
      const next: GameState = { ...s, health: { ...s.health, [me]: { ...s.health[me], [t]: { ...cur, workouts: [...cur.workouts, { type, mins }] } } } };
      return award(next, me, { label: `${type} · ${mins} min`, xp: Math.max(10, Math.min(40, Math.round(mins / 1.5))), dim: "health", kind: "health", tag: "workout" });
    }

    case "mood": {
      const entry: MoodEntry = { mood: int(a.entry?.mood, 1, 5), energy: int(a.entry?.energy, 1, 5), note: line(a.entry?.note, 60) };
      const next = { ...s, mood: { ...s.mood, [me]: { ...s.mood[me], [t]: entry } } };
      return setRef(next, me, `mood:${t}`, true, { label: "Mood check-in", xp: 5, dim: "emotional", kind: "reflect" });
    }
    case "gratitude": {
      const text = line(a.text, 280);
      if (!text) return s;
      const mineToday = s.gratitude.filter((g) => g.userId === me && g.date === t).length;
      const next = { ...s, gratitude: [{ id: uid(), userId: me, date: t, text }, ...s.gratitude] };
      return mineToday < 3 ? award(next, me, { label: "Gratitude journal", xp: 10, dim: "emotional", kind: "reflect", tag: "journal" }) : next;
    }
    case "review": {
      const wk = weekStart(t);
      if (s.reviews.some((r) => r.userId === me && r.weekOf === wk)) throw new Nope("This week's review is already done. Nice work.");
      const r = { wins: para(a.r?.wins, 1000), struggles: para(a.r?.struggles, 1000), intention: para(a.r?.intention, 300), rating: int(a.r?.rating, 1, 5) };
      if (!r.wins || !r.intention) throw new Nope("Add at least one win and one intention.");
      const next = { ...s, reviews: [{ ...r, id: uid(), userId: me, weekOf: wk }, ...s.reviews] };
      return award(next, me, { label: "Weekly review", xp: 40, dim: "vision", kind: "reflect", tag: "journal", ref: `rev:${wk}` });
    }

    case "saving": {
      const amount = int(a.amount, 1, 10_000_000);
      const note = line(a.note, 120);
      const next = { ...s, savings: [{ id: uid(), userId: me, date: t, amount, note }, ...s.savings] };
      return award(next, me, { label: `Saved ₹${amount.toLocaleString("en-IN")}${note ? `: ${note}` : ""}`, xp: Math.max(5, Math.min(30, Math.round(amount / 100))), dim: "money", kind: "money", tag: "save" });
    }
    case "savingTarget": return { ...s, savingsTarget: { ...s.savingsTarget, [me]: int(a.amount, 500, 10_000_000) } };
    case "lesson": {
      if (!LESSONS.some((l) => l.id === a.id) || (s.lessons[me] ?? []).includes(a.id)) return s;
      const next = { ...s, lessons: { ...s.lessons, [me]: [...(s.lessons[me] ?? []), a.id] } };
      return award(next, me, { label: "Money lesson", xp: 15, dim: "money", kind: "money", tag: "study", ref: `lesson:${a.id}` });
    }

    case "duel": {
      if (!isMember(s, a.d?.b) || a.d.b === me) throw new Nope("Pick a cousin to duel.");
      const period = a.d.period === "month" ? "month" : "week";
      const d = { id: uid(), a: me, b: a.d.b, metric: a.d.metric === "days" ? "days" as const : "xp" as const, period: period as "week" | "month", stake: line(a.d.stake, 100), start: period === "week" ? weekStart(t) : t.slice(0, 8) + "01" };
      return notify({ ...s, duels: [d, ...s.duels] }, "duel", `${nameOf(s, me)} challenged ${nameOf(s, d.b)} to a duel`, d.stake || undefined);
    }
    case "penaltyDefs": {
      const defs = (Array.isArray(a.defs) ? a.defs : []).slice(0, 20).map((p) => ({ id: line(p.id, 16) || uid(), label: line(p.label, 80), xp: int(p.xp, 1, 25), dim: dimOf(p.dim), on: !!p.on })).filter((p) => p.label);
      return { ...s, penalties: defs };
    }
    case "settings": {
      const patch: Partial<Settings> = {};
      if (a.patch?.penaltiesOn !== undefined) patch.penaltiesOn = !!a.patch.penaltiesOn;
      if (a.patch?.penaltyCap !== undefined) patch.penaltyCap = int(a.patch.penaltyCap, 5, 50);
      return { ...s, settings: { ...s.settings, ...patch } };
    }
    case "selfRate": return { ...s, selfRatings: { ...s.selfRatings, [me]: { ...s.selfRatings[me], [dimOf(a.dim)]: int(a.value, 1, 10) } } };
    case "notifsRead": {
      const newest = s.notifs.reduce((m, n) => Math.max(m, n.ts), 0);
      return { ...s, notifsSeen: { ...s.notifsSeen, [me]: Math.max(newest, s.notifsSeen[me] ?? 0) } };
    }
  }
  return s;
}

/** Records newly earned badges and levels for every cousin and posts squad notifications. */
export function syncProgress(s: GameState, silent = false): GameState {
  let next = s;
  for (const m of s.members) {
    const have = next.badges[m.id] ?? {};
    const fresh = earnedBadgeIds(next, m.id).filter((b) => !have[b]);
    const lvl = levelOf(lifetimeXp(userLogs(next, m.id))).level;
    const seen = next.levelSeen[m.id] ?? 0;
    if (!fresh.length && lvl <= seen) continue;
    const badges = { ...have };
    for (const b of fresh) badges[b] = Date.now();
    next = { ...next, badges: { ...next.badges, [m.id]: badges }, levelSeen: { ...next.levelSeen, [m.id]: Math.max(lvl, seen) } };
    if (silent) continue;
    for (const b of fresh) {
      const def = BADGES.find((x) => x.id === b)!;
      next = notify(next, "badge", `${m.name} earned “${def.name}”`, def.desc);
    }
    if (lvl > seen && seen > 0) next = notify(next, "level", `${m.name} reached level ${lvl}`, levelOf(lifetimeXp(userLogs(next, m.id))).title);
  }
  return next;
}

/** One complete, validated game step. */
export function applyAction(s: GameState, a: Action, me: string, opts: { admin?: boolean } = {}): GameState {
  if (!a || typeof a !== "object" || !ACTION_TYPES.has(a.t)) throw new Nope("Unknown action.");
  return syncProgress(reduce(s, a, me, opts));
}
