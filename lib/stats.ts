import { balance, lastDays, scoresOf } from "./balance";
import { consistency, dailyPlan, rankScoreOf } from "./engine";
import type { GameState, MemberStats } from "./types";
import { addDays, today, weekStart } from "./utils";

/**
 * Everything the dashboard compares between cousins. The server computes it
 * for every member from their full data and shares only these aggregates, so
 * habits and one-time quests stay private. The client recomputes its own
 * figures locally for instant feedback, with the same function.
 */
export function memberStats(s: GameState, id: string, t = today()): MemberStats {
  const m = s.members.find((x) => x.id === id);
  const joined = m ? today(m.joinedAt) : addDays(t, -365);
  const b30 = lastDays(s, id, 30, t);
  const cons = consistency(s, id, 30, t);
  const trend: (number | null)[] = [];
  for (let k = 7; k >= 0; k--) {
    const end = k === 0 ? t : addDays(weekStart(t), -1 - 7 * (k - 1));
    trend.push(end < joined ? null : lastDays(s, id, 30, end).vision);
  }
  const week = balance(s, id, weekStart(t), t);
  return {
    b7: scoresOf(lastDays(s, id, 7, t)),
    bPrev7: scoresOf(lastDays(s, id, 7, addDays(t, -7))),
    b30: scoresOf(b30),
    bPrev30: scoresOf(lastDays(s, id, 30, addDays(t, -30))),
    bAll: scoresOf(balance(s, id, joined, t)),
    trend,
    weekCompletion: week.planned > 0 ? Math.round((100 * week.done) / week.planned) : null,
    consistency: cons,
    rankScore: rankScoreOf(b30.vision, cons),
    objective: dailyPlan(s, id, m?.dailyGoal ?? "auto", t).objective,
  };
}
