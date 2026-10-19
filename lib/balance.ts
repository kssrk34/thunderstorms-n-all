import { ACTIVE_DIMS } from "./catalog";
import { habitRef, isDue, ledger, sharesOf } from "./ledger";
import type { ActiveDim, DimId, GameState, Scores } from "./types";
import { addDays, daysBetween, today } from "./utils";

/**
 * Life Balance: how well each cousin follows through on what they planned in
 * each dimension. Nobody enters a score. It is calculated from quests and
 * habits:
 *
 *   score = completed weight / max(planned weight, FULL_PER_DAY × tracked days)
 *
 * - Weight is a quest's Aura Points, so harder commitments count for more.
 *   A quest in two dimensions splits its weight between them.
 * - A daily quest is planned on each scheduled day (rest days excepted).
 *   Today only counts once it's done, because the day isn't over.
 * - A one-time quest counts when it's completed, or as missed once it has
 *   been open for a week.
 * - Challenges count once they finish, with partial credit if they ended
 *   short of the target.
 * - Logged activities and meetups weren't planned, so they count as planned
 *   and done.
 * - The floor (FULL_PER_DAY) stops very easy tasks from maxing out an area:
 *   reaching 100% takes about 10 Aura Points of activity a day there (one
 *   light daily habit, or a few bigger quests a week).
 * - With fewer than MIN_COUNT planned items or MIN_DAYS of tracking, the
 *   score is null ("not enough data") rather than a misleading number.
 * - Life Vision is the average of all nine, with untracked areas counting as
 *   zero, so it rewards breadth. It needs at least three tracked areas.
 */
export const FULL_PER_DAY = 10;
export const MIN_COUNT = 3;
export const MIN_DAYS = 3;
export const OPEN_TODO_GRACE_DAYS = 7;

const UNPLANNED = new Set(["activity", "meetup", "health", "career", "money", "reflect"]);

export interface Contribution {
  key: string;
  label: string;
  kind: "habit" | "todo" | "challenge" | "logged";
  planned: number;
  done: number;
  plannedCount: number;
  doneCount: number;
}
export interface DimResult { planned: number; done: number; count: number; days: number; score: number | null }
export interface BalanceResult {
  dims: Record<ActiveDim, DimResult>;
  vision: number | null;
  /** dimensions with enough data for a score */
  tracked: number;
  planned: number;
  done: number;
  items?: Record<ActiveDim, Contribution[]>;
}

export function balance(s: GameState, id: string, from: string, to: string, opts: { details?: boolean } = {}): BalanceResult {
  const t = today();
  const end = to < t ? to : t;
  const L = ledger(s, id);
  const rest = new Set(s.restDays[id] ?? []);
  const acc = Object.fromEntries(ACTIVE_DIMS.map((d) => [d, { planned: 0, done: 0, count: 0, first: null as string | null }])) as Record<ActiveDim, { planned: number; done: number; count: number; first: string | null }>;
  const items = opts.details ? (Object.fromEntries(ACTIVE_DIMS.map((d) => [d, new Map<string, Contribution>()])) as Record<ActiveDim, Map<string, Contribution>>) : null;

  const add = (dim: DimId, dim2: ActiveDim | undefined, planned: number, done: number, date: string, item: Omit<Contribution, "planned" | "done" | "plannedCount" | "doneCount">) => {
    for (const [d, f] of sharesOf(dim, dim2)) {
      if (d === "vision") continue;
      const a = acc[d as ActiveDim];
      a.planned += planned * f;
      a.done += done * f;
      a.count += 1;
      if (!a.first || date < a.first) a.first = date;
      if (items) {
        const m = items[d as ActiveDim];
        const c = m.get(item.key) ?? { ...item, planned: 0, done: 0, plannedCount: 0, doneCount: 0 };
        c.planned += planned * f;
        c.done += done * f;
        c.plannedCount += 1;
        if (done > 0) c.doneCount += 1;
        m.set(item.key, c);
      }
    }
  };

  const habitIds = new Set<string>();
  for (const h of s.habits) {
    if (h.userId !== id) continue;
    habitIds.add(h.id);
    const start = h.created > from ? h.created : from;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (h.archivedOn && d >= h.archivedOn) break;
      const done = L.refs.has(habitRef(h.id, d));
      const due = isDue(h, d) && !rest.has(d) && (d < t || done);
      if (due || done) add(h.dim, h.dim2, h.xp, done ? h.xp : 0, d, { key: `h:${h.id}`, label: h.title, kind: "habit" });
    }
  }

  const todoIds = new Set<string>();
  for (const x of s.todos) {
    if (x.userId !== id) continue;
    todoIds.add(x.id);
    const date = x.done && x.doneOn ? x.doneOn : addDays(x.created, OPEN_TODO_GRACE_DAYS);
    if (date < from || date > end) continue;
    add(x.dim, x.dim2, x.xp, x.done ? x.xp : 0, date, { key: `t:${x.id}`, label: x.title, kind: "todo" });
  }

  for (const c of s.challenges) {
    if (!c.participants.includes(id)) continue;
    const won = c.completedBy.includes(id);
    if (!won && c.endsOn >= t) continue; // still running
    const date = won ? L.refDate.get(`ch:${c.id}`) ?? c.endsOn : c.endsOn;
    if (date < from || date > end) continue;
    const frac = won ? 1 : Math.min(1, challengeShare(s, c.id, id));
    add(c.dim, undefined, c.xp, c.xp * frac, date, { key: `c:${c.id}`, label: c.title, kind: "challenge" });
  }

  for (const l of L.logs) {
    if (l.xp <= 0 || l.date < from || l.date > end) continue;
    const orphan = (l.kind === "habit" && l.ref && !habitIds.has(l.ref.split(":")[1])) || (l.kind === "todo" && l.ref && !todoIds.has(l.ref.slice(5)));
    if (!UNPLANNED.has(l.kind) && !orphan) continue;
    add(l.dim, l.dim2, l.xp, l.xp, l.date, { key: `l:${l.kind}:${l.tag ?? l.label}`, label: l.private ? "Private activity" : l.label.split(":")[0], kind: "logged" });
  }

  const dims = {} as Record<ActiveDim, DimResult>;
  let tracked = 0, sum = 0, planned = 0, done = 0;
  for (const d of ACTIVE_DIMS) {
    const a = acc[d];
    const days = a.first ? daysBetween(a.first, end) + 1 : 0;
    const score = a.count < MIN_COUNT || days < MIN_DAYS ? null : Math.round((100 * a.done) / Math.max(a.planned, FULL_PER_DAY * days, 1));
    dims[d] = { planned: a.planned, done: a.done, count: a.count, days, score: score === null ? null : Math.min(100, score) };
    if (score !== null) { tracked++; sum += Math.min(100, score); }
    planned += a.planned;
    done += a.done;
  }
  const out: BalanceResult = { dims, vision: tracked >= 3 ? Math.round(sum / ACTIVE_DIMS.length) : null, tracked, planned, done };
  if (items) {
    out.items = Object.fromEntries(ACTIVE_DIMS.map((d) => [d, Array.from(items[d].values()).sort((a, b) => b.planned - a.planned)])) as Record<ActiveDim, Contribution[]>;
  }
  return out;
}

/** Progress toward a challenge as a share of its target, for partial credit. */
function challengeShare(s: GameState, challengeId: string, userId: string): number {
  const c = s.challenges.find((x) => x.id === challengeId)!;
  if (c.scope === "squad") {
    const total = c.participants.reduce((a, p) => a + challengeProgress(s, c.id, p), 0);
    return total / c.target;
  }
  return challengeProgress(s, c.id, userId) / c.target;
}

/** A participant's progress: logged by hand, or counted from completed quests in the challenge's dimension. */
export function challengeProgress(s: GameState, challengeId: string, userId: string): number {
  const c = s.challenges.find((x) => x.id === challengeId);
  if (!c) return 0;
  if (c.track !== "quests") return c.progress[userId] ?? 0;
  let n = 0;
  for (const l of ledger(s, userId).logs) {
    if (l.xp > 0 && l.date >= c.startsOn && l.date <= c.endsOn && (l.kind === "habit" || l.kind === "todo" || l.kind === "activity") && (l.dim === c.dim || l.dim2 === c.dim)) n++;
  }
  return n;
}

export function scoresOf(b: BalanceResult): Scores {
  const out = { vision: b.vision } as Scores;
  for (const d of ACTIVE_DIMS) out[d] = b.dims[d].score;
  return out;
}

/** Scores for the `days` days ending on `end` (inclusive). */
export const lastDays = (s: GameState, id: string, days: number, end = today(), opts: { details?: boolean } = {}) => balance(s, id, addDays(end, -(days - 1)), end, opts);
