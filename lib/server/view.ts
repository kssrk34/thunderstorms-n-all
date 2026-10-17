import type { GameState, Me, Member, View } from "../types";
import type { DB, UserRecord } from "./db";

export function publicMember(u: UserRecord): Member {
  return {
    id: u.id, name: u.name, username: u.username, emoji: u.emoji, color: u.color,
    photo: u.photo ? `/api/avatar/${u.id}?v=${u.photoV ?? 0}` : undefined,
    bio: u.bio, interests: u.interests, joinedAt: u.createdAt,
  };
}

export const meOf = (u: UserRecord): Me => ({ ...publicMember(u), role: u.role, onboarded: u.onboarded });

/** The complete game with member profiles attached, for running the rules. */
export function fullGame(db: DB): GameState {
  return { ...db.game, members: db.users.map(publicMember) };
}

/**
 * What one cousin is allowed to see. Shared things (leaderboard activity,
 * challenges, goals, meetups, the gratitude wall) stay visible; personal
 * things (to-dos, health, mood, weekly reviews, savings notes, slip-up
 * details) are only sent to their owner.
 */
export function viewFor(db: DB, userId: string): View {
  const u = db.users.find((x) => x.id === userId)!;
  const g = fullGame(db);
  const mine = (x: { userId: string }) => x.userId === userId;
  const own = <T,>(rec: Record<string, T>): Record<string, T> => (userId in rec ? { [userId]: rec[userId] } : {});
  const game: GameState = {
    ...g,
    habits: g.habits.filter(mine),
    todos: g.todos.filter(mine),
    health: own(g.health),
    mood: own(g.mood),
    reviews: g.reviews.filter(mine),
    notifsSeen: own(g.notifsSeen),
    savings: g.savings.map((x) => (mine(x) ? x : { ...x, note: "" })),
    logs: g.logs.map((l) => (l.userId !== userId && l.kind === "penalty" ? { ...l, label: "Logged a slip-up" } : l)),
  };
  return { rev: db.rev, me: meOf(u), game };
}
