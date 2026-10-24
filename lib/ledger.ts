import type { ActiveDim, DimId, GameState, Habit, LogEntry } from "./types";
import { weekday } from "./utils";

/**
 * A per-cousin index over the Aura ledger. Game states are immutable, so the
 * index is built once per logs array and reused by every calculation that
 * reads the same state.
 */
export interface Ledger {
  logs: LogEntry[];
  /** every claim ref this cousin holds, e.g. "h:<habit>:<date>" */
  refs: Set<string>;
  /** dates with at least one positive action */
  active: Set<string>;
  /** the date each ref was claimed on */
  refDate: Map<string, string>;
}

const cache = new WeakMap<LogEntry[], { length: number; byUser: Map<string, Ledger> }>();

export function ledger(s: GameState, id: string): Ledger {
  let byUser = cache.get(s.logs)?.length === s.logs.length ? cache.get(s.logs)!.byUser : undefined;
  if (!byUser) {
    byUser = new Map();
    for (const l of s.logs) {
      let L = byUser.get(l.userId);
      if (!L) byUser.set(l.userId, (L = { logs: [], refs: new Set(), active: new Set(), refDate: new Map() }));
      L.logs.push(l);
      if (l.ref) { L.refs.add(l.ref); L.refDate.set(l.ref, l.date); }
      if (l.xp > 0 && l.kind !== "penalty") L.active.add(l.date);
    }
    // the length check guards against code that pushes into a logs array in place
    cache.set(s.logs, { length: s.logs.length, byUser });
  }
  return byUser.get(id) ?? { logs: [], refs: new Set(), active: new Set(), refDate: new Map() };
}

export const habitRef = (habitId: string, date: string) => `h:${habitId}:${date}`;

export function habitDone(s: GameState, userId: string, habitId: string, date: string): boolean {
  return ledger(s, userId).refs.has(habitRef(habitId, date));
}

/** Whether a habit is scheduled on a date (ignoring rest days). */
export function isDue(h: Habit, date: string): boolean {
  if (date < h.created || (h.archivedOn && date >= h.archivedOn) || (h.endsOn && date > h.endsOn)) return false;
  return !h.days || h.days.length === 0 || h.days.includes(weekday(date));
}

/** How Aura (or weight) splits across a quest's dimensions: evenly when it has two. */
export function sharesOf(dim: DimId, dim2?: ActiveDim): [DimId, number][] {
  return dim2 && dim2 !== dim ? [[dim, 0.5], [dim2, 0.5]] : [[dim, 1]];
}
