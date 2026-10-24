import { habitRef, ledger } from "./ledger";
import type { FeedEvent, GameState, SharedQuest, ShareMember } from "./types";
import { addDays, today, weekStart, weekday } from "./utils";

/**
 * Progress on shared quests, worked out from each participant's own copy and
 * the Aura ledger. Pure and shared by server and client: everything it reads
 * (the shared quest and the ledger's claim refs) is visible to participants,
 * so nobody needs anyone else's habits.
 */

export const participantIds = (sq: SharedQuest) => Object.keys(sq.members).filter((id) => sq.members[id].status === "accepted");
/** Everyone who ever took part, including those who left: their contributions still count. */
export const contributorIds = (sq: SharedQuest) => Object.keys(sq.members).filter((id) => !!sq.members[id].copyId);
export const isLive = (sq: SharedQuest, t = today()) => !sq.endedOn && (!sq.endsOn || sq.endsOn >= t);
export const pendingInvites = (s: GameState, me: string) => s.shares.filter((sq) => isLive(sq) && sq.members[me]?.status === "pending");
export const shareOf = (s: GameState, id?: string) => (id ? s.shares.find((sq) => sq.id === id) : undefined);
export const dueOnDay = (sq: Pick<SharedQuest, "days">, d: string) => !sq.days || sq.days.length === 0 || sq.days.includes(weekday(d));

/** The days a member's progress counts: from joining until today, the end date, leaving or the organiser ending it. */
function window(sq: SharedQuest, m: ShareMember, t: string): [string, string] | null {
  if (!m.joinedOn) return null;
  const from = m.joinedOn > sq.startsOn ? m.joinedOn : sq.startsOn;
  let to = t;
  if (sq.endsOn && sq.endsOn < to) to = sq.endsOn;
  if (sq.endedOn && sq.endedOn < to) to = sq.endedOn;
  if (m.leftOn && addDays(m.leftOn, -1) < to) to = addDays(m.leftOn, -1);
  return from <= to ? [from, to] : null;
}

export interface MemberProgress {
  id: string;
  status: ShareMember["status"];
  /** completions in their window */
  done: number;
  /** scheduled days so far (today only once it's done); 1 for a one-time quest */
  scheduled: number;
  /** done ÷ scheduled, as a percentage; null before anything was due */
  consistency: number | null;
  streak: number;
  aura: number;
  dueToday: boolean;
  doneToday: boolean;
  /** completion dates, newest first */
  dates: string[];
  week: { done: number; scheduled: number };
  lastWeek: { done: number; scheduled: number };
}

export interface ShareProgress {
  members: MemberProgress[];
  /** team: completions by everyone inside the quest's dates */
  total: number;
  target: number | null;
  /** everyone due today has done it (and at least two were due) */
  allDoneToday: boolean;
}

export function shareProgress(s: GameState, sq: SharedQuest, t = today()): ShareProgress {
  const ws = weekStart(t);
  const lws = addDays(ws, -7);
  const members = contributorIds(sq).map((id): MemberProgress => {
    const m = sq.members[id];
    const L = ledger(s, id);
    const copy = m.copyId!;
    const win = window(sq, m, t);
    const out: MemberProgress = {
      id, status: m.status, done: 0, scheduled: 0, consistency: null, streak: 0, aura: 0, dueToday: false, doneToday: false, dates: [],
      week: { done: 0, scheduled: 0 }, lastWeek: { done: 0, scheduled: 0 },
    };
    const prefix = sq.kind === "habit" ? `h:${copy}:` : `todo:${copy}`;
    for (const l of L.logs) if (l.ref && (sq.kind === "habit" ? l.ref.startsWith(prefix) : l.ref === prefix)) out.aura += l.xp;
    if (!win) return out;
    const [from, to] = win;

    if (sq.kind === "todo") {
      const doneOn = L.refDate.get(prefix);
      out.scheduled = 1;
      if (doneOn && doneOn >= from && doneOn <= to) { out.done = 1; out.dates = [doneOn]; out.doneToday = doneOn === t; }
      out.dueToday = !out.done && to === t;
      out.consistency = out.done ? 100 : null;
      return out;
    }

    const bump = (d: string, done: boolean, sched: boolean) => {
      if (d >= ws) { out.week.done += +done; out.week.scheduled += +sched; }
      else if (d >= lws) { out.lastWeek.done += +done; out.lastWeek.scheduled += +sched; }
    };
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const done = L.refs.has(habitRef(copy, d));
      const due = dueOnDay(sq, d);
      // today counts once it's done, because the day isn't over; a bonus day off-schedule counts as planned and done
      const sched = (due && (d < t || done)) || done;
      if (done) { out.done++; out.dates.push(d); }
      if (sched) out.scheduled++;
      bump(d, done, sched);
      if (d === t) { out.dueToday = due; out.doneToday = done; }
    }
    out.dates.reverse();
    out.consistency = out.scheduled ? Math.round((100 * out.done) / out.scheduled) : null;
    // streak: scheduled days in a row, unscheduled days don't break it, today doesn't until it's over
    let d = L.refs.has(habitRef(copy, to)) ? to : addDays(to, -1);
    for (let guard = 0; guard < 400 && d >= from; guard++, d = addDays(d, -1)) {
      if (L.refs.has(habitRef(copy, d))) out.streak++;
      else if (dueOnDay(sq, d)) break;
    }
    return out;
  });

  let total = 0;
  if (sq.mode === "team") {
    const end = sq.endsOn && sq.endsOn < t ? sq.endsOn : t;
    for (const p of members) total += p.dates.filter((d) => d >= sq.startsOn && d <= end).length;
  }
  const due = members.filter((p) => p.status === "accepted" && p.dueToday);
  return { members, total, target: sq.mode === "team" ? sq.target ?? null : null, allDoneToday: due.length >= 2 && due.every((p) => p.doneToday) };
}

const rate = (x: { done: number; scheduled: number }) => (x.scheduled ? x.done / x.scheduled : null);

/** Friendly highlights for the participant panel. Ties share the honour; nobody is ranked last. */
export function highlights(p: ShareProgress) {
  const pick = (score: (m: MemberProgress) => number | null) => {
    const scored = p.members.map((m) => ({ id: m.id, v: score(m) })).filter((x): x is { id: string; v: number } => x.v !== null && x.v > 0);
    if (!scored.length) return [];
    const top = Math.max(...scored.map((x) => x.v));
    return scored.filter((x) => x.v === top).map((x) => x.id);
  };
  return {
    consistent: pick((m) => rate(m.week)),
    streak: pick((m) => m.streak),
    improved: pick((m) => {
      const now = rate(m.week);
      const before = rate(m.lastWeek);
      return now !== null && before !== null ? now - before : null;
    }),
    contributions: pick((m) => m.done),
  };
}

/** Who may see a feed event: everyone, except moments of a shared quest, which only its members see. */
export function canSeeEvent(g: GameState, e: FeedEvent, userId: string): boolean {
  if (!e.ref?.startsWith("sq")) return true;
  const sq = g.shares.find((x) => x.id === e.ref!.split(":")[1]);
  return !!sq && userId in sq.members;
}
