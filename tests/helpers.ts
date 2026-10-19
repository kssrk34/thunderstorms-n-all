import { emptyGame } from "../lib/seed";
import type { GameState, LogEntry } from "../lib/types";
import { addDays, today } from "../lib/utils";

export const A = "asha0001";
export const B = "bala0002";
export const C = "chit0003";

/** A squad of three who joined 60 days ago, with nothing in it yet. */
export function squad(): GameState {
  const g = emptyGame();
  const joinedAt = Date.now() - 60 * 86_400_000;
  g.members = [
    { id: A, name: "Asha", username: "asha", emoji: "⚡", color: "#4C8DFF", joinedAt },
    { id: B, name: "Bala", username: "bala", emoji: "⚡", color: "#9688F2", joinedAt },
    { id: C, name: "Chitra", username: "chitra", emoji: "⚡", color: "#2DD2B7", joinedAt },
  ];
  return g;
}

export const ago = (n: number) => addDays(today(), -n);

let n = 0;
/** A ledger entry as the reducer would have written it on an earlier day. */
export function past(userId: string, date: string, l: Partial<LogEntry> & Pick<LogEntry, "xp" | "dim" | "kind">): LogEntry {
  return { id: `l${++n}`, userId, date, ts: Date.parse(`${date}T12:00:00+05:30`), label: l.label ?? "Something", ...l };
}
