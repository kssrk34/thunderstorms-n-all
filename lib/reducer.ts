import { ACTIVE_DIMS, ACTIVITIES, AURA_LIMITS, CHALLENGE_AURA, MEETUP_FULL_AURA, MEETUP_AURA, PRIVATE_ACTIVITIES, PRIVATE_BY_DEFAULT, QUEST_ICONS, teamBonusFor } from "./catalog";
import { challengeProgress } from "./balance";
import { BADGES, auraBetween, ctxFor, dailyPlan, habitStreak, levelOf, lifetimeAura, rivalryWinners, userLogs } from "./engine";
import { habitRef, ledger } from "./ledger";
import { isLive, shareOf, shareProgress } from "./shared";
import type { ActiveDim, Challenge, FeedEvent, GameState, Goal, Habit, LogEntry, Meetup, Notif, NotifIcon, ReactionKind, Rivalry, SharedQuest, ShareMember, Todo } from "./types";
import { addDays, daysBetween, fmtShort, today, uid, weekStart } from "./utils";

/**
 * The game rules. Pure and shared: the server runs it as the source of truth,
 * the client runs it for instant (optimistic) feedback.
 *
 * Aura Points are only ever earned by completing something real: a quest, a
 * habit, a challenge, a logged activity, a meetup or goal progress. Every
 * award is a ledger entry with a unique `ref`, so the same thing can't be
 * claimed twice, and undoing it removes exactly that entry.
 */

export const MANUAL_DAILY_CAP = 8;
const MAX_HABITS = 30;
const MAX_OPEN_TODOS = 100;
const MAX_GOALS = 50;
const MAX_LIVE_CHALLENGES = 20;
const MAX_LIVE_RIVALRIES = 6;
const MAX_LIVE_SHARES = 20;
const FEED_MAX = 300;
const NOTIFS_MAX = 120;
export const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30, 50, 75, 100];
/** Completing quests with these icons also counts toward the matching achievements. */
const ICON_TAG: Record<string, string> = { dumbbell: "workout", run: "workout", walk: "walk", book: "read", study: "study", code: "code", meditate: "calm" };

export interface QuestInput { title: string; icon?: string; dim: ActiveDim; dim2?: ActiveDim; xp: number; goalId?: string; private?: boolean }
export interface HabitInput extends QuestInput { days?: number[]; remindAt?: number | null }
export interface ShareInput { source: { type: "habit" | "todo"; id: string }; mode: SharedQuest["mode"]; endsOn?: string; target?: number; bonus?: boolean; desc?: string; invite: string[] }
export type ChallengeInput = Pick<Challenge, "title" | "desc" | "period" | "scope" | "track" | "dim" | "target" | "unit" | "participants"> & { icon?: string };
export interface GoalInput { title: string; dim: ActiveDim; why?: string; target?: number; unit?: string; due?: string; private?: boolean }

export type Action =
  | { t: "habit"; habitId: string }
  | { t: "habitAdd"; id?: string; habit: HabitInput }
  | { t: "habitEdit"; id: string; habit: Partial<HabitInput> }
  | { t: "habitRemove"; habitId: string }
  | { t: "todoAdd"; id?: string; todo: QuestInput }
  | { t: "todoEdit"; id: string; todo: Partial<QuestInput> }
  | { t: "todo"; id: string }
  | { t: "todoDel"; id: string }
  | { t: "activity"; id?: string; activityId: string; minutes: number; note: string; private?: boolean }
  | { t: "logUndo"; id: string }
  | { t: "rest" }
  | { t: "prioritize"; ids: string[] }
  | { t: "chCreate"; id?: string; ch: ChallengeInput }
  | { t: "chJoin"; id: string }
  | { t: "chLeave"; id: string }
  | { t: "chLog"; id: string; amount: number }
  | { t: "chDel"; id: string }
  | { t: "rivalCreate"; id?: string; r: Pick<Rivalry, "title" | "metric" | "dim" | "participants" | "stake"> }
  | { t: "rivalJoin"; id: string }
  | { t: "rivalLeave"; id: string }
  | { t: "rivalDel"; id: string }
  | { t: "meetup"; id?: string; m: Pick<Meetup, "date" | "place" | "kind" | "attendees" | "note">; memory?: { icon?: string; caption: string } }
  | { t: "cheer"; id: string }
  | { t: "react"; id: string; kind: ReactionKind | null }
  | { t: "goalAdd"; id?: string; g: GoalInput }
  | { t: "goalEdit"; id: string; g: Partial<GoalInput> }
  | { t: "goalStep"; id: string; amount: number }
  | { t: "goalToggle"; id: string }
  | { t: "goalDel"; id: string }
  | { t: "shareCreate"; id?: string } & ShareInput
  | { t: "shareInvite"; id: string; invite: string[] }
  | { t: "shareRespond"; id: string; accept: boolean; copyId?: string }
  | { t: "shareLeave"; id: string }
  | { t: "shareEnd"; id: string }
  | { t: "notifsRead" };

export const ACTION_TYPES = new Set<Action["t"]>([
  "habit", "habitAdd", "habitEdit", "habitRemove", "todoAdd", "todoEdit", "todo", "todoDel", "activity", "logUndo", "rest", "prioritize",
  "chCreate", "chJoin", "chLeave", "chLog", "chDel", "rivalCreate", "rivalJoin", "rivalLeave", "rivalDel", "meetup", "cheer", "react",
  "goalAdd", "goalEdit", "goalStep", "goalToggle", "goalDel", "shareCreate", "shareInvite", "shareRespond", "shareLeave", "shareEnd", "notifsRead",
]);
/** Actions only the organiser may take. None at the moment; the rules are the same for everyone. */
const ADMIN_ONLY = new Set<Action["t"]>([]);

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
const dimOf = (v: unknown, fallback: ActiveDim = "health"): ActiveDim => (ACTIVE_DIMS.includes(v as ActiveDim) ? (v as ActiveDim) : fallback);
const dim2Of = (v: unknown, dim: ActiveDim): ActiveDim | undefined => (ACTIVE_DIMS.includes(v as ActiveDim) && v !== dim ? (v as ActiveDim) : undefined);
const iconOf = (v: unknown) => ((QUEST_ICONS as readonly string[]).includes(v as string) ? (v as string) : undefined);
const auraOf = (v: unknown, kind: keyof typeof AURA_LIMITS) => int(v, AURA_LIMITS[kind][0], AURA_LIMITS[kind][1]);
function daysOf(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const days = Array.from(new Set(v.map((d) => int(d, 0, 6)))).sort();
  return days.length === 0 || days.length === 7 ? undefined : days;
}
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMember = (s: GameState, id: unknown) => typeof id === "string" && s.members.some((m) => m.id === id);
const memberOf = (s: GameState, id: string) => s.members.find((m) => m.id === id);
const nameOf = (s: GameState, id: string) => memberOf(s, id)?.name ?? "A cousin";
const validId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{6,16}$/.test(v);
/** Client-chosen ids keep optimistic and server state in step; anything odd or taken falls back to a fresh id. */
function newId(v: unknown, taken: { id: string }[]): string {
  return validId(v) && !taken.some((x) => x.id === v) ? v : uid();
}
/** True when this exact item was already created (a repeated request), so the action can be a no-op. */
const repeat = (v: unknown, list: { id: string; userId?: string; createdBy?: string; by?: string }[], me: string) =>
  validId(v) && list.some((x) => x.id === v && (x.userId ?? x.createdBy ?? x.by) === me);
/** Whether this cousin's completions appear in the squad feed. */
const shares = (s: GameState, me: string, priv?: boolean) => !priv && memberOf(s, me)?.shareActivity !== false;

/* ------------------------------------------------------------------ */
/* ledger and feed primitives                                          */
/* ------------------------------------------------------------------ */
type NewLog = Omit<LogEntry, "id" | "ts" | "date" | "userId"> & { date?: string };
type NewEvent = Omit<FeedEvent, "id" | "ts" | "reactions">;

function award(s: GameState, userId: string, l: NewLog): GameState {
  const entry: LogEntry = { ...l, id: uid(), ts: Date.now(), date: l.date ?? today(), userId };
  if (!entry.private) delete entry.private;
  if (!entry.dim2) delete entry.dim2;
  return { ...s, logs: [...s.logs, entry] };
}
function share(s: GameState, ev: NewEvent): GameState {
  return { ...s, feed: [{ ...ev, id: uid(), ts: Date.now(), reactions: {} }, ...s.feed].slice(0, FEED_MAX) };
}
const unshare = (s: GameState, userId: string, ref: string): GameState => ({ ...s, feed: s.feed.filter((e) => !(e.userId === userId && e.ref === ref)) });
const hasRef = (s: GameState, userId: string, ref: string) => ledger(s, userId).refs.has(ref);
const dropRef = (s: GameState, userId: string, ref: string): GameState => unshare({ ...s, logs: s.logs.filter((l) => !(l.userId === userId && l.ref === ref)) }, userId, ref);
/** Makes a claim exist (or not), with its feed event. Idempotent either way. */
function setRef(s: GameState, userId: string, ref: string, on: boolean, l: NewLog, ev?: Omit<NewEvent, "userId" | "ref">): GameState {
  const has = hasRef(s, userId, ref);
  if (on && !has) {
    const next = award(s, userId, { ...l, ref });
    return ev ? share(next, { ...ev, userId, ref }) : next;
  }
  if (!on && has) return dropRef(s, userId, ref);
  return s;
}
type NotifExtra = Pick<Notif, "from" | "link" | "kind" | "ref">;
/** A notification for some cousins. With a `kind`, the server also sends it to their phones if they opted in to that kind. */
const notify = (s: GameState, icon: NotifIcon, title: string, body?: string, to?: string[], extra: NotifExtra = {}): GameState => {
  if (to && !to.length) return s;
  const n = tidy({ id: uid(), ts: Date.now(), icon, title, body, to, ...extra }) as Notif;
  return { ...s, notifs: [n, ...s.notifs].slice(0, NOTIFS_MAX) };
};
function manualCount(s: GameState, userId: string): number {
  const t = today();
  return ledger(s, userId).logs.filter((l) => l.date === t && l.kind === "activity").length;
}
const capReached = () => new Nope("You've hit today's logging limit. Rest is part of the game, so come back tomorrow.");

const ownGoal = (s: GameState, me: string, id: unknown): Goal | undefined => s.goals.find((g) => g.id === id && g.userId === me);
const ownHabit = (s: GameState, me: string, id: unknown): Habit | undefined => s.habits.find((h) => h.id === id && h.userId === me);
const ownTodo = (s: GameState, me: string, id: unknown): Todo | undefined => s.todos.find((x) => x.id === id && x.userId === me);

/* ---------- shared quests ---------- */
/** The shared quest a copy belongs to, while it's still running. */
const liveShare = (s: GameState, id: string | undefined, me: string) => {
  const sq = shareOf(s, id);
  return sq && isLive(sq) && sq.members[me]?.status === "accepted" ? sq : undefined;
};
/** Valid cousins to invite: real members, not yourself, each once. */
const invitees = (s: GameState, me: string, list: unknown) =>
  Array.from(new Set((Array.isArray(list) ? list : []).filter((p): p is string => isMember(s, p) && p !== me)));
export const shareLink = (id: string) => `/quests?tab=shared&q=${id}`;
const setMember = (s: GameState, id: string, userId: string, m: ShareMember): GameState =>
  ({ ...s, shares: s.shares.map((x) => (x.id === id ? { ...x, members: { ...x.members, [userId]: tidy({ ...m }) } } : x)) });
const hourOf = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : int(v, 5, 22));
const describe = (sq: SharedQuest) =>
  sq.mode === "team" ? `A team quest: ${sq.target} completions together${sq.endsOn ? ` by ${fmtShort(sq.endsOn)}` : ""}.` : sq.kind === "habit" ? "A shared habit. Everyone keeps their own streak." : "A shared one-time quest.";

/**
 * Retires a habit: a brand-new, unused one just disappears; anything with
 * history is archived so its record still counts. Returns the retire date.
 */
function retireHabit(s: GameState, me: string, h: Habit, t: string): { s: GameState; on: string } {
  const L = ledger(s, me);
  const used = h.created < t || L.logs.some((l) => l.ref?.startsWith(`h:${h.id}:`));
  const archivedOn = L.refs.has(habitRef(h.id, t)) ? addDays(t, 1) : t;
  if (!used) return { s: { ...s, habits: s.habits.filter((x) => x.id !== h.id) }, on: archivedOn };
  return { s: { ...s, habits: s.habits.map((x) => (x.id === h.id ? { ...x, archivedOn } : x)) }, on: archivedOn };
}

function inviteNotify(s: GameState, sq: SharedQuest, me: string, to: string[]): GameState {
  return notify(s, "users", `${nameOf(s, me)} invited you to “${sq.title}”`, `${describe(sq)} Want to join?`, to,
    { from: me, link: shareLink(sq.id), kind: "invites", ref: `share:${sq.id}` });
}

/** Shared fields of a new or edited quest, sanitised. */
function questFields(s: GameState, me: string, q: Partial<QuestInput> | undefined, kind: "daily" | "once", base?: Habit | Todo) {
  const dim = q?.dim !== undefined ? dimOf(q.dim) : base?.dim ?? "health";
  const out: Partial<Habit & Todo> = { dim };
  if (q?.title !== undefined || !base) {
    out.title = line(q?.title, 80);
    if (!out.title) throw new Nope("Give your quest a name.");
  }
  if (q?.icon !== undefined || !base) out.icon = iconOf(q?.icon);
  if (q?.dim2 !== undefined || q?.dim !== undefined || !base) out.dim2 = dim2Of(q?.dim2 ?? base?.dim2, dim);
  if (q?.xp !== undefined || !base) out.xp = auraOf(q?.xp ?? 20, kind);
  if (q?.private !== undefined || !base) out.private = q?.private === undefined ? PRIVATE_BY_DEFAULT.includes(dim) : !!q.private;
  if (q?.goalId !== undefined || !base) out.goalId = ownGoal(s, me, q?.goalId)?.id;
  return out;
}
/** When something's visibility changes, its history follows: labels hide (or show again) and its feed posts go. */
function revisibility(s: GameState, me: string, prefix: string, priv: boolean): GameState {
  const relabel = (l: LogEntry): LogEntry => {
    if (l.userId !== me || !l.ref?.startsWith(prefix)) return l;
    if (priv) return { ...l, private: true };
    const { private: _p, ...rest } = l;
    return rest;
  };
  return { ...s, logs: s.logs.map(relabel), feed: priv ? s.feed.filter((e) => !(e.userId === me && e.ref?.startsWith(prefix))) : s.feed };
}

/** Drops undefined fields so stored records stay tidy. */
function tidy<T extends object>(x: T): T {
  for (const k of Object.keys(x) as (keyof T)[]) if (x[k] === undefined || x[k] === false) delete x[k];
  return x;
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */
export function reduce(s: GameState, a: Action, me: string, opts: { admin?: boolean } = {}): GameState {
  if (!isMember(s, me)) throw new Nope("Your account isn't part of the squad.");
  if (ADMIN_ONLY.has(a.t) && !opts.admin) throw new Nope("Only the squad organiser can do that.");
  const t = today();
  switch (a.t) {
    /* ---------------- daily quests ---------------- */
    case "habit": {
      const h = ownHabit(s, me, a.habitId);
      if (!h || h.archivedOn || (h.endsOn && t > h.endsOn)) return s;
      const ref = habitRef(h.id, t);
      const on = !hasRef(s, me, ref);
      const visible = shares(s, me, h.private);
      let next = setRef(s, me, ref, on, { label: h.title, xp: h.xp, dim: h.dim, dim2: h.dim2, kind: "habit", tag: ICON_TAG[h.icon ?? ""], private: h.private },
        visible ? { kind: "quest", text: `completed ${h.title}`, dim: h.dim, xp: h.xp } : undefined);
      if (on && visible) {
        const n = habitStreak(next, me, h, t);
        if (STREAK_MILESTONES.includes(n)) next = share(next, { userId: me, kind: "streak", text: `is on a ${n}-day streak: ${h.title}`, dim: h.dim, ref });
      }
      return next;
    }
    case "habitAdd": {
      if (repeat(a.id, s.habits, me)) return s;
      if (s.habits.filter((h) => h.userId === me && !h.archivedOn).length >= MAX_HABITS) throw new Nope(`You can have up to ${MAX_HABITS} daily quests. Retire one first.`);
      const h = tidy({ ...questFields(s, me, a.habit, "daily"), days: daysOf(a.habit?.days), remindAt: hourOf(a.habit?.remindAt), id: newId(a.id, s.habits), userId: me, created: t }) as Habit;
      return { ...s, habits: [...s.habits, h] };
    }
    case "habitEdit": {
      const h = ownHabit(s, me, a.id);
      if (!h || h.archivedOn) return s;
      const patch = questFields(s, me, a.habit, "daily", h);
      const days = a.habit && "days" in a.habit ? daysOf(a.habit.days) : h.days;
      const remindAt = a.habit && "remindAt" in a.habit ? hourOf(a.habit.remindAt) : h.remindAt;
      const sq = liveShare(s, h.shareId, me);
      let next: GameState;
      if (sq) {
        // a shared habit: everyone may change their own reminder, visibility and goal; only the organiser changes the habit itself
        const mine: Partial<Habit> = { remindAt };
        if ("private" in patch) mine.private = patch.private;
        if ("goalId" in patch) mine.goalId = patch.goalId;
        const template = sq.createdBy === me ? { title: patch.title ?? h.title, icon: patch.icon ?? h.icon, dim: patch.dim ?? h.dim, dim2: "dim2" in patch ? patch.dim2 : h.dim2, xp: patch.xp ?? h.xp, days } : null;
        const copies = new Set(Object.values(sq.members).filter((m) => m.status === "accepted" && m.copyId).map((m) => m.copyId!));
        next = {
          ...s,
          habits: s.habits.map((x) => {
            if (x.id === h.id) return tidy({ ...x, ...(template ?? {}), ...mine });
            if (template && copies.has(x.id) && !x.archivedOn) return tidy({ ...x, ...template });
            return x;
          }),
          shares: template ? s.shares.map((x) => (x.id === sq.id ? tidy({ ...x, ...template }) : x)) : s.shares,
        };
      } else {
        next = { ...s, habits: s.habits.map((x) => (x.id === h.id ? tidy({ ...x, ...patch, days, remindAt }) : x)) };
      }
      return patch.private !== undefined && !!patch.private !== !!h.private ? revisibility(next, me, `h:${h.id}:`, !!patch.private) : next;
    }
    case "habitRemove": {
      const h = ownHabit(s, me, a.habitId);
      if (!h || h.archivedOn) return s;
      const sq = liveShare(s, h.shareId, me);
      // retiring a shared habit: the organiser ends it for everyone (they keep their copies); anyone else leaves it
      if (sq) return sq.createdBy === me ? reduce(reduce(s, { t: "shareEnd", id: sq.id }, me), a, me) : reduce(s, { t: "shareLeave", id: sq.id }, me);
      return retireHabit(s, me, h, t).s;
    }

    /* ---------------- one-time quests ---------------- */
    case "todoAdd": {
      if (repeat(a.id, s.todos, me)) return s;
      if (s.todos.filter((x) => x.userId === me && !x.done).length >= MAX_OPEN_TODOS) throw new Nope("That's a lot of open quests. Finish or clear a few first.");
      const td = tidy({ ...questFields(s, me, a.todo, "once"), id: newId(a.id, s.todos), userId: me, done: false, created: t }) as Todo;
      td.done = false;
      return { ...s, todos: [...s.todos, td] };
    }
    case "todoEdit": {
      const td = ownTodo(s, me, a.id);
      if (!td) return s;
      // a completed quest's Aura is already in the ledger, so only its name, icon and visibility can change
      const q = td.done ? { title: a.todo?.title, icon: a.todo?.icon, private: a.todo?.private } : a.todo;
      const patch = questFields(s, me, q, "once", td);
      const sq = liveShare(s, td.shareId, me);
      let next: GameState;
      if (sq) {
        // shared: the organiser changes the quest for everyone (Aura and dimension only where it isn't done yet); others only their visibility and goal
        const mine: Partial<Todo> = {};
        if ("private" in patch) mine.private = patch.private;
        if ("goalId" in patch) mine.goalId = patch.goalId;
        const own = sq.createdBy === me;
        const named = own ? { title: patch.title ?? td.title, icon: patch.icon ?? td.icon } : {};
        const open = own && !td.done ? { dim: patch.dim ?? td.dim, dim2: "dim2" in patch ? patch.dim2 : td.dim2, xp: patch.xp ?? td.xp } : {};
        const copies = new Set(Object.values(sq.members).filter((m) => m.status === "accepted" && m.copyId).map((m) => m.copyId!));
        next = {
          ...s,
          todos: s.todos.map((x) => {
            if (x.id === td.id) return { ...tidy({ ...x, ...named, ...open, ...mine }), done: x.done };
            if (own && copies.has(x.id)) return { ...tidy({ ...x, ...named, ...(x.done ? {} : open) }), done: x.done };
            return x;
          }),
          shares: own ? s.shares.map((x) => (x.id === sq.id ? tidy({ ...x, ...named, ...open }) : x)) : s.shares,
        };
      } else {
        next = { ...s, todos: s.todos.map((x) => (x.id === td.id ? { ...tidy({ ...x, ...patch }), done: x.done } : x)) };
      }
      return patch.private !== undefined && !!patch.private !== !!td.private ? revisibility(next, me, `todo:${td.id}`, !!patch.private) : next;
    }
    case "todo": {
      const td = ownTodo(s, me, a.id);
      if (!td) return s;
      const done = !td.done;
      const flip = (x: Todo): Todo => {
        const y = { ...x, done };
        if (done) y.doneOn = t;
        else delete y.doneOn;
        return y;
      };
      const next = { ...s, todos: s.todos.map((x) => (x.id === td.id ? flip(x) : x)) };
      return setRef(next, me, `todo:${td.id}`, done, { label: td.title, xp: td.xp, dim: td.dim, dim2: td.dim2, kind: "todo", tag: ICON_TAG[td.icon ?? ""], private: td.private },
        shares(s, me, td.private) ? { kind: "quest", text: `completed ${td.title}`, dim: td.dim, xp: td.xp } : undefined);
    }
    case "todoDel": {
      const td = ownTodo(s, me, a.id);
      if (!td) return s;
      // deleting a shared quest: the organiser ends it for everyone; anyone else leaves it first
      const sq = liveShare(s, td.shareId, me);
      if (sq) return reduce(reduce(s, { t: sq.createdBy === me ? "shareEnd" : "shareLeave", id: sq.id }, me), a, me);
      // a finished quest keeps its Aura; an unfinished one never earned any
      return { ...s, todos: s.todos.filter((x) => x.id !== td.id) };
    }

    /* ---------------- logged activities ---------------- */
    case "activity": {
      const act = ACTIVITIES.find((x) => x.id === a.activityId);
      if (!act) return s;
      const id = validId(a.id) ? a.id : uid();
      const ref = `act:${id}`;
      if (hasRef(s, me, ref)) return s; // the same submission twice
      if (manualCount(s, me) >= MANUAL_DAILY_CAP) throw capReached();
      const mins = int(a.minutes, 10, 120);
      const xp = Math.round(act.xp * Math.min(2, Math.max(0.5, mins / 30)));
      const note = line(a.note, 80);
      const priv = a.private === undefined ? PRIVATE_ACTIVITIES.has(act.id) : !!a.private;
      const next = award(s, me, { label: note ? `${act.label}: ${note}` : act.label, xp, dim: act.dim, kind: "activity", tag: act.tag, ref, private: priv });
      return shares(s, me, priv) ? share(next, { userId: me, kind: "quest", text: `logged ${act.label.toLowerCase()} · ${mins} min`, dim: act.dim, xp, ref }) : next;
    }
    case "logUndo": {
      // a mistaken log can be taken back on the day it was made
      const l = s.logs.find((x) => x.id === a.id && x.userId === me && x.kind === "activity" && x.date === t);
      return l?.ref ? dropRef(s, me, l.ref) : s;
    }

    /* ---------------- today ---------------- */
    case "rest": {
      const used = s.restDays[me] ?? [];
      if (used.includes(t)) return s;
      if (used.some((d) => d >= weekStart(t))) throw new Nope("You've already used this week's rest day.");
      return { ...s, restDays: { ...s.restDays, [me]: [...used, t] } };
    }
    case "prioritize": {
      const ids = (Array.isArray(a.ids) ? a.ids : []).filter((id) => s.habits.some((h) => h.id === id && h.userId === me && !h.archivedOn) || s.todos.some((x) => x.id === id && x.userId === me));
      return { ...s, priorities: { ...s.priorities, [me]: { date: t, ids: Array.from(new Set(ids)).slice(0, 3) } } };
    }

    /* ---------------- challenges and missions ---------------- */
    case "chCreate": {
      if (repeat(a.id, s.challenges, me)) return s;
      const title = line(a.ch?.title, 80);
      if (!title) throw new Nope("Give your challenge a name.");
      if (s.challenges.filter((c) => c.createdBy === me && c.endsOn >= t).length >= MAX_LIVE_CHALLENGES) throw new Nope("You have a lot of challenges running. Let a few finish first.");
      const period = (["daily", "weekly", "monthly"] as const).includes(a.ch.period) ? a.ch.period : "weekly";
      const invited = Array.isArray(a.ch.participants) ? a.ch.participants.filter((p) => isMember(s, p) && p !== me) : [];
      const scope: Challenge["scope"] = invited.length === 0 ? "solo" : a.ch.scope === "squad" || a.ch.scope === "team" ? a.ch.scope : "solo";
      const c: Challenge = tidy({
        id: newId(a.id, s.challenges), title, desc: para(a.ch.desc, 240), icon: iconOf(a.ch.icon), period, scope,
        track: a.ch.track === "quests" ? "quests" : "manual", dim: dimOf(a.ch.dim), xp: CHALLENGE_AURA[period],
        target: int(a.ch.target, 1, 1_000_000), unit: line(a.ch.unit, 20) || "times",
        participants: [me, ...Array.from(new Set(invited))], progress: {}, completedBy: [], createdBy: me,
        startsOn: t, endsOn: addDays(t, period === "daily" ? 0 : period === "weekly" ? 6 : 29),
      }) as Challenge;
      let next: GameState = { ...s, challenges: [c, ...s.challenges] };
      if (invited.length) {
        next = share(next, { userId: me, kind: "started", text: `started a mission: ${c.title}`, dim: c.dim, ref: `start:${c.id}` });
        next = notify(next, "quest", `${nameOf(s, me)} invited you to “${c.title}”`, "Open the Arena to see it.", invited, { from: me, link: "/arena?tab=missions", kind: "invites", ref: `ch:${c.id}` });
      }
      return next;
    }
    case "chJoin": {
      const c = s.challenges.find((x) => x.id === a.id);
      if (!c || c.endsOn < t || c.participants.includes(me)) return s;
      if (c.scope !== "solo" && c.completedBy.length) throw new Nope("This mission is already complete.");
      return { ...s, challenges: s.challenges.map((x) => (x.id === c.id ? { ...x, participants: [...x.participants, me] } : x)) };
    }
    case "chLeave": {
      const c = s.challenges.find((x) => x.id === a.id);
      if (!c || c.createdBy === me || !c.participants.includes(me) || c.endsOn < t || c.completedBy.includes(me)) return s;
      const { [me]: _gone, ...progress } = c.progress;
      return { ...s, challenges: s.challenges.map((x) => (x.id === c.id ? { ...x, participants: x.participants.filter((p) => p !== me), progress } : x)) };
    }
    case "chLog": {
      const c = s.challenges.find((x) => x.id === a.id);
      if (!c || !c.participants.includes(me) || c.track === "quests") return s;
      if (c.endsOn < t) throw new Nope("This challenge has ended.");
      const amount = int(a.amount, -c.target, c.target);
      const progress = { ...c.progress, [me]: Math.max(0, (c.progress[me] ?? 0) + amount) };
      return { ...s, challenges: s.challenges.map((x) => (x.id === c.id ? { ...x, progress } : x)) };
    }
    case "chDel": {
      const c = s.challenges.find((x) => x.id === a.id && x.createdBy === me);
      if (!c) return s;
      if (c.completedBy.length) throw new Nope("Someone has already completed this, so it stays in the record.");
      return unshare({ ...s, challenges: s.challenges.filter((x) => x.id !== c.id) }, me, `start:${c.id}`);
    }

    /* ---------------- rivalries ---------------- */
    case "rivalCreate": {
      if (repeat(a.id, s.rivalries, me)) return s;
      const title = line(a.r?.title, 60);
      if (!title) throw new Nope("Give your rivalry a name.");
      if (s.rivalries.filter((r) => r.end >= t).length >= MAX_LIVE_RIVALRIES) throw new Nope("Plenty of rivalries are already running this week.");
      const metric = (["aura", "days", "dim"] as const).includes(a.r.metric) ? a.r.metric : "aura";
      const invited = Array.isArray(a.r.participants) ? a.r.participants.filter((p) => isMember(s, p) && p !== me) : [];
      const sunday = addDays(weekStart(t), 6);
      const r: Rivalry = tidy({
        id: newId(a.id, s.rivalries), title, metric, dim: metric === "dim" ? dimOf(a.r.dim) : undefined, start: t,
        end: addDays(sunday, sunday < addDays(t, 2) ? 7 : 0), participants: [me, ...Array.from(new Set(invited))], createdBy: me,
        stake: line(a.r.stake, 100) || undefined,
      }) as Rivalry;
      let next: GameState = { ...s, rivalries: [r, ...s.rivalries] };
      next = share(next, { userId: me, kind: "started", text: `started a rivalry: ${r.title}`, ref: `start:${r.id}` });
      return invited.length ? notify(next, "duel", `${nameOf(s, me)} challenged you: ${r.title}`, r.stake ? `Stakes: ${r.stake}` : "Open the Arena to accept.", invited, { from: me, link: "/arena?tab=rivalries", kind: "invites" }) : next;
    }
    case "rivalJoin": {
      const r = s.rivalries.find((x) => x.id === a.id);
      if (!r || r.end < t || r.participants.includes(me)) return s;
      return { ...s, rivalries: s.rivalries.map((x) => (x.id === r.id ? { ...x, participants: [...x.participants, me] } : x)) };
    }
    case "rivalLeave": {
      const r = s.rivalries.find((x) => x.id === a.id);
      if (!r || r.end < t || r.createdBy === me || !r.participants.includes(me)) return s;
      return { ...s, rivalries: s.rivalries.map((x) => (x.id === r.id ? { ...x, participants: x.participants.filter((p) => p !== me) } : x)) };
    }
    case "rivalDel": {
      const r = s.rivalries.find((x) => x.id === a.id && x.createdBy === me);
      // finished rivalries stay: they're how winners are remembered
      if (!r || r.end < t) return s;
      return unshare({ ...s, rivalries: s.rivalries.filter((x) => x.id !== r.id) }, me, `start:${r.id}`);
    }

    /* ---------------- together ---------------- */
    case "meetup": {
      if (validId(a.id) && s.meetups.some((m) => m.id === a.id)) return s;
      const attendees = Array.from(new Set((Array.isArray(a.m?.attendees) ? a.m.attendees : []).filter((p) => isMember(s, p))));
      if (!attendees.includes(me)) attendees.unshift(me);
      if (attendees.length < 2) throw new Nope("A meetup needs at least two cousins.");
      const place = line(a.m.place, 80);
      if (!place) throw new Nope("Where did you meet?");
      const date = isDate(a.m.date) && a.m.date <= t && a.m.date >= addDays(t, -60) ? a.m.date : t;
      const full = attendees.length === s.members.length && attendees.length >= 3;
      const xpEach = full ? MEETUP_FULL_AURA : MEETUP_AURA;
      const m: Meetup = { id: newId(a.id, s.meetups), date, place, kind: line(a.m.kind, 40) || "Meetup", attendees, note: line(a.m.note, 200), xpEach, by: me };
      let next: GameState = { ...s, meetups: [...s.meetups, m] };
      for (const p of attendees) next = award(next, p, { label: `Meetup: ${m.place}`, xp: xpEach, dim: "social", kind: "meetup", tag: "family", ref: `mt:${m.id}:${p}`, date });
      const caption = line(a.memory?.caption, 280);
      if (caption) next = { ...next, memories: [tidy({ id: uid(), meetupId: m.id, date, icon: iconOf(a.memory?.icon) ?? "sun", title: m.place, caption, by: me, cheers: [] as string[] }), ...next.memories] };
      next = share(next, { userId: me, kind: "meetup", text: full ? `got the whole squad together at ${m.place}` : `met up with ${attendees.length - 1} ${attendees.length === 2 ? "cousin" : "cousins"} at ${m.place}`, dim: "social", xp: xpEach, ref: `mt:${m.id}:${me}` });
      return notify(next, "users", `${nameOf(s, me)} logged a meetup with you`, `${m.place}: +${xpEach} Aura Points each`, attendees.filter((p) => p !== me), { from: me, link: "/arena", kind: "meetups" });
    }
    case "cheer": return { ...s, memories: s.memories.map((m) => (m.id === a.id ? { ...m, cheers: m.cheers.includes(me) ? m.cheers.filter((x) => x !== me) : [...m.cheers, me] } : m)) };
    case "react": {
      const ev = s.feed.find((e) => e.id === a.id);
      if (!ev || ev.userId === me) return s;
      const kind = (["zap", "fire", "clap", "heart"] as const).includes(a.kind as ReactionKind) ? (a.kind as ReactionKind) : null;
      const { [me]: prev, ...others } = ev.reactions;
      const reactions = kind ? { ...others, [me]: kind } : others;
      const next = { ...s, feed: s.feed.map((e) => (e.id === ev.id ? { ...e, reactions } : e)) };
      return kind && !prev ? notify(next, "react", `${nameOf(s, me)} reacted to your update`, `“${ev.text}”`, [ev.userId], { from: me, link: "/" }) : next;
    }

    /* ---------------- goals ---------------- */
    case "goalAdd": {
      if (repeat(a.id, s.goals, me)) return s;
      const title = line(a.g?.title, 100);
      if (!title) throw new Nope("Give your goal a name.");
      if (s.goals.filter((g) => g.userId === me && !g.done).length >= MAX_GOALS) throw new Nope("That's a lot of goals. Achieve or let go of a few first.");
      const target = a.g.target == null || a.g.target === 0 ? undefined : int(a.g.target, 1, 100_000_000);
      const dim = dimOf(a.g.dim, "character");
      const g: Goal = tidy({
        id: newId(a.id, s.goals), userId: me, title, dim, current: 0, xpPerStep: 10, created: t,
        why: line(a.g.why, 200) || undefined, target, unit: target ? line(a.g.unit, 20) || "steps" : undefined,
        due: isDate(a.g.due) ? a.g.due : undefined, private: a.g.private === undefined ? PRIVATE_BY_DEFAULT.includes(dim) : !!a.g.private,
      }) as Goal;
      return { ...s, goals: [...s.goals, g] };
    }
    case "goalEdit": {
      const g = ownGoal(s, me, a.id);
      if (!g) return s;
      const p = a.g ?? {};
      const next: Goal = { ...g };
      if (p.title !== undefined) { next.title = line(p.title, 100); if (!next.title) throw new Nope("Give your goal a name."); }
      if (p.dim !== undefined && !g.done) next.dim = dimOf(p.dim, g.dim);
      if (p.why !== undefined) next.why = line(p.why, 200) || undefined;
      if (p.due !== undefined) next.due = isDate(p.due) ? p.due : undefined;
      if (p.private !== undefined) next.private = !!p.private;
      if (p.unit !== undefined && g.target) next.unit = line(p.unit, 20) || g.unit;
      if (p.target !== undefined && g.target && !g.done) next.target = Math.max(int(p.target, 1, 100_000_000), g.current || 1);
      const out = { ...s, goals: s.goals.map((x) => (x.id === g.id ? tidy(next) : x)) };
      if (!!next.private === !!g.private) return out;
      return revisibility(revisibility(out, me, `goal:${g.id}`, !!next.private), me, `gp:${g.id}:`, !!next.private);
    }
    case "goalStep": {
      const g = ownGoal(s, me, a.id);
      if (!g || g.done || !g.target) return s;
      const amount = int(a.amount, -g.target, g.target);
      const current = Math.min(g.target, Math.max(0, g.current + amount));
      const done = current >= g.target;
      // Aura is only paid for new ground: stepping back and forward again earns nothing twice
      const peak = Math.max(g.peak ?? g.current, g.current);
      const gained = Math.max(0, current - peak);
      let next: GameState = { ...s, goals: s.goals.map((x) => (x.id === g.id ? tidy({ ...x, current, peak: Math.max(peak, current), done, doneOn: done ? t : undefined }) : x)) };
      const aura = g.unit === "₹" ? Math.min(30, Math.round(gained / 200)) : Math.min(60, Math.round(g.xpPerStep * gained));
      if (aura > 0) next = award(next, me, { label: `Progress: ${g.title}`, xp: aura, dim: g.dim, kind: "goal", ref: `gp:${g.id}:${current}`, private: g.private || g.unit === "₹" });
      if (done) {
        next = setRef(next, me, `goal:${g.id}`, true, { label: `Goal achieved: ${g.title}`, xp: 100, dim: g.dim, kind: "goal", private: g.private },
          shares(s, me, g.private) ? { kind: "goal", text: `achieved a goal: ${g.title}`, dim: g.dim, xp: 100 } : undefined);
      }
      return next;
    }
    case "goalToggle": {
      const g = ownGoal(s, me, a.id);
      if (!g || g.target) return s;
      const done = !g.done;
      const next: GameState = { ...s, goals: s.goals.map((x) => (x.id === g.id ? tidy({ ...x, done, doneOn: done ? t : undefined }) : x)) };
      return setRef(next, me, `goal:${g.id}`, done, { label: `Goal achieved: ${g.title}`, xp: 100, dim: g.dim, kind: "goal", private: g.private },
        shares(s, me, g.private) ? { kind: "goal", text: `achieved a goal: ${g.title}`, dim: g.dim, xp: 100 } : undefined);
    }
    case "goalDel": {
      const g = ownGoal(s, me, a.id);
      if (!g) return s;
      const unlink = <T extends { goalId?: string }>(x: T): T => (x.goalId === g.id ? tidy({ ...x, goalId: undefined }) : x);
      return { ...s, goals: s.goals.filter((x) => x.id !== g.id), habits: s.habits.map(unlink), todos: s.todos.map(unlink) };
    }

    /* ---------------- shared quests and habits ---------------- */
    case "shareCreate": {
      if (validId(a.id) && s.shares.some((x) => x.id === a.id)) return s;
      const type = a.source?.type === "todo" ? "todo" : "habit";
      const src: Habit | Todo | undefined = type === "todo" ? ownTodo(s, me, a.source?.id) : ownHabit(s, me, a.source?.id);
      if (!src) throw new Nope("Only your own quests can be shared.");
      if ((src as Habit).archivedOn) throw new Nope("Retired habits can't be shared. Start it again first.");
      if ((src as Todo).done) throw new Nope("That quest is already done. Share one that's still open.");
      if (liveShare(s, src.shareId, me)) throw new Nope("This one is already shared. Invite more cousins from its details.");
      const invited = invitees(s, me, a.invite);
      if (!invited.length) throw new Nope("Pick at least one cousin to invite.");
      if (s.shares.filter((x) => x.createdBy === me && isLive(x, t)).length >= MAX_LIVE_SHARES) throw new Nope("You're running a lot of shared quests. Let a few finish first.");
      const mode: SharedQuest["mode"] = a.mode === "team" ? "team" : "together";
      const endsOn = isDate(a.endsOn) && a.endsOn >= t && a.endsOn <= addDays(t, 365) ? a.endsOn : mode === "team" ? addDays(t, 6) : undefined;
      const target = mode === "team" ? int(a.target, 2, 1000) : undefined;
      const bonus = mode === "team" && a.bonus ? teamBonusFor(daysBetween(t, endsOn!) + 1) : undefined;
      const now = Date.now();
      const members: Record<string, ShareMember> = { [me]: { status: "accepted", invitedBy: me, invitedAt: now, respondedAt: now, joinedOn: t, copyId: src.id } };
      for (const p of invited) members[p] = { status: "pending", invitedBy: me, invitedAt: now };
      const sq = tidy({
        id: newId(a.id, s.shares), kind: type, mode, title: src.title, desc: para(a.desc, 240) || undefined, icon: src.icon, dim: src.dim, dim2: src.dim2, xp: src.xp,
        days: type === "habit" ? (src as Habit).days : undefined, private: src.private, createdBy: me, startsOn: t, endsOn, target, bonus, members, created: now,
      }) as SharedQuest;
      const link = <T extends Habit | Todo>(x: T): T => (x.id === src.id && x.userId === me ? tidy({ ...x, shareId: sq.id, ...(type === "habit" && endsOn ? { endsOn } : {}) }) : x);
      const next: GameState = { ...s, shares: [sq, ...s.shares], habits: s.habits.map(link), todos: s.todos.map(link) };
      return inviteNotify(next, sq, me, invited);
    }
    case "shareInvite": {
      const sq = shareOf(s, a.id);
      if (!sq || !isLive(sq, t) || sq.members[me]?.status !== "accepted") return s;
      // invite anyone not already in or asked; people who declined or left can be asked again
      const invited = invitees(s, me, a.invite).filter((p) => !["pending", "accepted"].includes(sq.members[p]?.status ?? ""));
      if (!invited.length) return s;
      const now = Date.now();
      let next = s;
      for (const p of invited) {
        const prev = sq.members[p];
        next = setMember(next, sq.id, p, { status: "pending", invitedBy: me, invitedAt: now, joinedOn: prev?.joinedOn, leftOn: prev?.leftOn, copyId: prev?.copyId });
      }
      return inviteNotify(next, sq, me, invited);
    }
    case "shareRespond": {
      const sq = shareOf(s, a.id);
      const m = sq?.members[me];
      if (!sq || !m || m.status !== "pending") return s;
      if (!isLive(sq, t)) throw new Nope("This shared quest has already ended.");
      const now = Date.now();
      if (!a.accept) {
        const next = setMember(s, sq.id, me, { ...m, status: "declined", respondedAt: now });
        return notify(next, "users", `${nameOf(s, me)} can't join “${sq.title}” this time`, undefined, [m.invitedBy], { from: me, link: shareLink(sq.id) });
      }
      const template = { title: sq.title, icon: sq.icon, dim: sq.dim, dim2: sq.dim2, xp: sq.xp, shareId: sq.id };
      const visibility = { private: sq.private };
      let next = s;
      let copyId: string;
      const old = m.copyId && (sq.kind === "habit" ? ownHabit(s, me, m.copyId) : ownTodo(s, me, m.copyId));
      if (old) {
        // coming back after leaving: pick up the same copy, so earlier progress still counts
        copyId = old.id;
        if (sq.kind === "habit") next = { ...next, habits: next.habits.map((h) => (h.id === old.id ? tidy({ ...h, ...template, days: sq.days, endsOn: sq.endsOn, archivedOn: undefined }) : h)) };
        else next = { ...next, todos: next.todos.map((x) => (x.id === old.id ? { ...tidy({ ...x, ...template }), done: x.done } : x)) };
      } else if (sq.kind === "habit") {
        if (s.habits.filter((h) => h.userId === me && !h.archivedOn).length >= MAX_HABITS) throw new Nope(`You can have up to ${MAX_HABITS} daily quests. Retire one first.`);
        copyId = newId(a.copyId, s.habits);
        next = { ...next, habits: [...next.habits, tidy({ id: copyId, userId: me, ...template, ...visibility, days: sq.days, endsOn: sq.endsOn, created: t }) as Habit] };
      } else {
        if (s.todos.filter((x) => x.userId === me && !x.done).length >= MAX_OPEN_TODOS) throw new Nope("That's a lot of open quests. Finish or clear a few first.");
        copyId = newId(a.copyId, s.todos);
        next = { ...next, todos: [...next.todos, { ...tidy({ id: copyId, userId: me, ...template, ...visibility, created: t }), done: false } as Todo] };
      }
      next = setMember(next, sq.id, me, { ...m, status: "accepted", respondedAt: now, joinedOn: m.joinedOn ?? t, leftOn: undefined, copyId });
      const tell = Array.from(new Set([sq.createdBy, m.invitedBy])).filter((p) => p !== me);
      return notify(next, "users", `${nameOf(s, me)} joined “${sq.title}”`, sq.mode === "team" ? "One more on the team." : "You're in it together now.", tell, { from: me, link: shareLink(sq.id), kind: "cousins" });
    }
    case "shareLeave": {
      const sq = shareOf(s, a.id);
      const m = sq?.members[me];
      if (!sq || !m || m.status !== "accepted" || sq.createdBy === me || !isLive(sq, t)) return s;
      let next = s;
      let leftOn = t;
      // your history stays: a used habit is retired, a finished quest is kept, an untouched one-time quest goes
      if (sq.kind === "habit") {
        const h = ownHabit(s, me, m.copyId);
        if (h && !h.archivedOn) { const r = retireHabit(next, me, h, t); next = r.s; leftOn = r.on; }
      } else {
        const td = ownTodo(s, me, m.copyId);
        if (td && !td.done) next = { ...next, todos: next.todos.filter((x) => x.id !== td.id) };
        if (td?.done) leftOn = addDays(t, 1);
      }
      next = setMember(next, sq.id, me, { ...m, status: "left", leftOn });
      return notify(next, "users", `${nameOf(s, me)} left “${sq.title}”`, "Their progress so far still counts.", [sq.createdBy], { from: me, link: shareLink(sq.id) });
    }
    case "shareEnd": {
      const sq = shareOf(s, a.id);
      if (!sq || sq.createdBy !== me || sq.endedOn) return s;
      // nobody loses anything: each participant keeps their copy as a personal quest, with its history
      const next = { ...s, shares: s.shares.map((x) => (x.id === sq.id ? { ...x, endedOn: t } : x)) };
      const others = Object.keys(sq.members).filter((p) => p !== me && sq.members[p].status === "accepted");
      return notify(next, "users", `${nameOf(s, me)} ended “${sq.title}”`, "It stays in your quests as a personal one, with all your progress.", others, { from: me, link: shareLink(sq.id), kind: "missions" });
    }

    case "notifsRead": {
      const newest = s.notifs.filter((n) => !n.to || n.to.includes(me)).reduce((m, n) => Math.max(m, n.ts), 0);
      return { ...s, notifsSeen: { ...s.notifsSeen, [me]: Math.max(newest, s.notifsSeen[me] ?? 0) } };
    }
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* derived progress                                                    */
/* ------------------------------------------------------------------ */

/**
 * Challenges pay out when they're met and take it back if progress is undone,
 * until they end; after that the result is final.
 */
function syncChallenges(s: GameState): GameState {
  const t = today();
  let next = s;
  for (const c of s.challenges) {
    if (c.endsOn < t) continue;
    const prog = (p: string) => challengeProgress(next, c.id, p);
    let winners: string[] = [];
    if (c.scope === "solo") winners = c.participants.filter((p) => prog(p) >= c.target);
    else if (c.scope === "team") winners = c.participants.length && c.participants.every((p) => prog(p) >= c.target) ? c.participants : [];
    else winners = c.participants.reduce((a, p) => a + prog(p), 0) >= c.target ? c.participants : [];
    const mission = c.scope !== "solo" && c.participants.length > 1;
    const before = new Set(c.completedBy);
    for (const p of c.participants) {
      const won = winners.includes(p);
      const ev = !mission && won && !before.has(p) && memberOf(next, p)?.shareActivity !== false ? { kind: "challenge" as const, text: `completed the challenge ${c.title}`, dim: c.dim, xp: c.xp } : undefined;
      next = setRef(next, p, `ch:${c.id}`, won, { label: `${mission ? "Mission" : "Challenge"} complete: ${c.title}`, xp: c.xp, dim: c.dim, kind: "challenge", tag: mission ? "mission" : "challenge" }, ev);
    }
    if (mission) {
      const ref = `mission:${c.id}`;
      const has = next.feed.some((e) => e.ref === ref);
      if (winners.length && !has) next = share(next, { userId: c.createdBy, kind: "mission", text: `and ${winners.length - 1} ${winners.length === 2 ? "cousin" : "cousins"} completed the mission ${c.title}`, dim: c.dim, xp: c.xp, ref });
      if (!winners.length && has) next = { ...next, feed: next.feed.filter((e) => e.ref !== ref) };
    }
    if (winners.length !== c.completedBy.length || winners.some((p) => !before.has(p))) {
      next = { ...next, challenges: next.challenges.map((x) => (x.id === c.id ? { ...x, completedBy: winners } : x)) };
    }
  }
  return next;
}

/**
 * Shared quests: a team quest's bonus is paid to each contributing cousin
 * when the shared target is met (and taken back if completions are undone)
 * until it ends, after which the result is final. When everyone in a shared
 * habit completes it on the same day, that's worth a moment in the feed.
 * Neither adds Aura beyond what the quest's rules said up front.
 */
function syncShares(s: GameState): GameState {
  const t = today();
  let next = s;
  for (const sq of s.shares) {
    if (!isLive(sq, t)) continue;
    const p = shareProgress(next, sq, t);
    if (sq.mode === "team" && sq.target) {
      const met = p.total >= sq.target;
      if (sq.bonus) {
        const ref = `sq:${sq.id}`;
        for (const m of p.members) {
          // anyone who contributed and is still in; someone who leaves later keeps what they earned
          const eligible = m.done > 0 && (m.status === "accepted" || hasRef(next, m.id, ref));
          next = setRef(next, m.id, ref, met && eligible, { label: `Team quest complete: ${sq.title}`, xp: sq.bonus, dim: sq.dim, kind: "challenge", tag: "mission" });
        }
      }
      const ref = `sqdone:${sq.id}`;
      const posted = next.feed.some((e) => e.ref === ref);
      if (met && !posted) next = share(next, { userId: sq.createdBy, kind: "together", text: `Team quest complete: ${sq.title}`, dim: sq.dim, xp: sq.bonus, ref });
      else if (!met && posted) next = { ...next, feed: next.feed.filter((e) => e.ref !== ref) };
    }
    if (sq.kind === "habit") {
      const ref = `sqall:${sq.id}:${t}`;
      const posted = next.feed.some((e) => e.ref === ref);
      if (p.allDoneToday && !posted) next = share(next, { userId: sq.createdBy, kind: "together", text: `Everyone completed today's ${sq.title}!`, dim: sq.dim, ref });
      else if (!p.allDoneToday && posted) next = { ...next, feed: next.feed.filter((e) => e.ref !== ref) };
    }
  }
  return next;
}

/**
 * Records newly earned badges and levels, daily objectives and rivalry
 * results, and posts them to the feed. `ids` limits the per-cousin part to
 * some members (the client only knows its own private data).
 */
export function syncProgress(s: GameState, opts: { ids?: string[]; silent?: boolean } = {}): GameState {
  let next = syncShares(syncChallenges(s));
  const t = today();
  for (const m of next.members) {
    if (opts.ids && !opts.ids.includes(m.id)) continue;
    const have = next.badges[m.id] ?? {};
    const c = ctxFor(next, m.id);
    const fresh = BADGES.filter((b) => !b.legacy && !have[b.id] && b.test(c)).map((b) => b.id);
    const lvl = levelOf(lifetimeAura(userLogs(next, m.id))).level;
    const seen = next.levelSeen[m.id] ?? 0;
    if (fresh.length || lvl > seen) {
      const badges = { ...have };
      for (const b of fresh) badges[b] = Date.now();
      next = { ...next, badges: { ...next.badges, [m.id]: badges }, levelSeen: { ...next.levelSeen, [m.id]: Math.max(lvl, seen) } };
      if (!opts.silent) {
        for (const b of fresh) next = share(next, { userId: m.id, kind: "badge", text: `earned “${BADGES.find((x) => x.id === b)!.name}”`, ref: `badge:${b}` });
        if (lvl > seen && seen > 0) next = share(next, { userId: m.id, kind: "level", text: `reached Level ${lvl} · ${levelOf(lifetimeAura(userLogs(next, m.id))).title}`, ref: `lvl:${lvl}` });
      }
    }
    if (opts.silent) continue;
    const objective = dailyPlan(next, m.id, m.dailyGoal ?? "auto", t).objective;
    const earned = Math.max(0, auraBetween(userLogs(next, m.id), t, t));
    const ref = `daily:${t}`;
    const posted = next.feed.some((e) => e.userId === m.id && e.ref === ref);
    if (earned >= objective && earned > 0 && !posted && m.shareActivity !== false) next = share(next, { userId: m.id, kind: "daily", text: `hit their daily objective · ${earned} Aura Points today`, xp: earned, ref });
    else if (earned < objective && posted) next = unshare(next, m.id, ref);
  }
  if (!opts.silent) {
    for (const r of next.rivalries) {
      if (r.end >= t || next.feed.some((e) => e.ref === `rival:${r.id}`)) continue;
      for (const id of rivalryWinners(next, r, t)) next = share(next, { userId: id, kind: "rivalry", text: `won the rivalry ${r.title}`, ref: `rival:${r.id}` });
    }
  }
  return next;
}

/** One complete, validated game step. The client passes scope "self", since it only knows its own private data. */
export function applyAction(s: GameState, a: Action, me: string, opts: { admin?: boolean; scope?: "self" | "all" } = {}): GameState {
  if (!a || typeof a !== "object" || !ACTION_TYPES.has(a.t)) throw new Nope("Unknown action.");
  return syncProgress(reduce(s, a, me, opts), { ids: opts.scope === "self" ? [me] : undefined });
}
