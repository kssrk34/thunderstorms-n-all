import { canSeeEvent } from "../shared";
import { memberStats } from "../stats";
import type { FeedEvent, GameState, Goal, LogEntry, Me, Member, MemberStats, View } from "../types";
import { today } from "../utils";
import type { DB, UserRecord } from "./db";

export function publicMember(u: UserRecord): Member {
  return {
    id: u.id, name: u.name, username: u.username, emoji: u.emoji, color: u.color,
    photo: u.photo ? `/api/avatar/${u.id}?v=${u.photoV ?? 0}` : undefined,
    character: u.character, frame: u.frame, bio: u.bio, joinedAt: u.createdAt,
    dailyGoal: u.dailyGoal ?? "auto", shareActivity: u.shareActivity !== false,
  };
}

export const meOf = (u: UserRecord): Me => ({ ...publicMember(u), role: u.role, onboarded: u.onboarded, dailyGoal: u.dailyGoal ?? "auto", shareActivity: u.shareActivity !== false });

/** The complete game with member profiles attached, for running the rules. */
export function fullGame(db: DB): GameState {
  return { ...db.game, members: db.users.map(publicMember) };
}

/* Everyone's stats are computed once per change (and per day), not once per cousin. */
const g = globalThis as unknown as { __tnaStats?: { key: string; stats: Record<string, MemberStats> } };
export function squadStats(db: DB): Record<string, MemberStats> {
  const key = `${db.rev}:${today()}:${db.users.map((u) => u.id).join(",")}`;
  if (g.__tnaStats?.key === key) return g.__tnaStats.stats;
  const game = fullGame(db);
  const stats = Object.fromEntries(db.users.map((u) => [u.id, memberStats(game, u.id)]));
  g.__tnaStats = { key, stats };
  return stats;
}

/** Feed kinds that describe a specific completion; hidden for cousins who stopped sharing. */
const COMPLETION_EVENTS = new Set<FeedEvent["kind"]>(["quest", "streak", "challenge", "goal", "daily", "meetup"]);

/**
 * What one cousin is allowed to see.
 * - Shared: profiles, Aura totals, achievements, challenges, rivalries,
 *   meetups, shared goals, the feed, and aggregated Life Balance scores.
 * - Only to the cousins invited: shared quests and habits, their invitations
 *   and their moments in the feed. Participants see each other's progress
 *   on them through the ledger, never each other's other habits.
 * - Only to the owner: daily and one-time quests, private goals, today's
 *   priorities, notes, money amounts, and anything from earlier versions that
 *   was personal (health, mood, reviews, savings).
 * - Other cousins' private completions arrive as "Private activity" with only
 *   the amount and dimension, which is what their totals are made of.
 */
export function viewFor(db: DB, userId: string): View {
  const u = db.users.find((x) => x.id === userId)!;
  const game = fullGame(db);
  const sharing = new Map(db.users.map((x) => [x.id, x.shareActivity !== false]));
  const mine = (x: { userId: string }) => x.userId === userId;
  const own = <T,>(rec: Record<string, T>): Record<string, T> => (userId in rec ? { [userId]: rec[userId] } : {});

  const log = (l: LogEntry): LogEntry => {
    if (l.userId === userId) return l;
    if (l.kind === "penalty") return { ...l, label: "Logged a slip-up", tag: undefined };
    if (l.private || l.kind === "money" || !sharing.get(l.userId)) return { ...l, label: "Private activity", tag: undefined };
    return l;
  };
  const goal = (x: Goal): Goal => {
    if (mine(x) || !x.target || x.unit !== "₹") return x;
    // money goals show progress as a percentage, never the amounts
    return { ...x, target: 100, current: Math.round((100 * x.current) / x.target), unit: "%", peak: undefined };
  };

  const view: GameState = {
    ...game,
    logs: game.logs.map(log),
    habits: game.habits.filter(mine),
    todos: game.todos.filter(mine),
    goals: game.goals.filter((x) => mine(x) || !x.private).map(goal),
    // a shared quest, its invitations and its moments are only for the cousins invited to it
    shares: game.shares.filter((x) => userId in x.members),
    feed: game.feed.filter((e) => (e.userId === userId || sharing.get(e.userId) || !COMPLETION_EVENTS.has(e.kind)) && canSeeEvent(game, e, userId)),
    notifs: game.notifs.filter((n) => !n.to || n.to.includes(userId)).map(({ to: _to, ...n }) => n),
    notifsSeen: own(game.notifsSeen),
    priorities: own(game.priorities),
    health: own(game.health),
    mood: own(game.mood),
    gratitude: game.gratitude.filter(mine),
    reviews: game.reviews.filter(mine),
    savings: game.savings.filter(mine),
    lessons: own(game.lessons),
    selfRatings: own(game.selfRatings),
    boxOpened: own(game.boxOpened),
    savingsTarget: own(game.savingsTarget),
    // retired features: nothing on screen uses them any more
    penalties: [],
  };
  return { rev: db.rev, day: today(), me: meOf(u), game: view, stats: squadStats(db) };
}
