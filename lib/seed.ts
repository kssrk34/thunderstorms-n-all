import { DEFAULT_PENALTIES } from "./catalog";
import type { GameState, StoredGame } from "./types";

export const GAME_VERSION = 3;

/**
 * The starting state for a brand-new squad: no quests, goals, logs or history
 * for anyone. Every item in the game is created by a signed-in cousin.
 */
export function emptyGame(): GameState {
  return {
    v: GAME_VERSION,
    members: [],
    logs: [],
    todos: [],
    habits: [],
    challenges: [],
    meetups: [],
    memories: [],
    goals: [],
    health: {},
    mood: {},
    gratitude: [],
    reviews: [],
    savings: [],
    lessons: {},
    duels: [],
    penalties: DEFAULT_PENALTIES.map((p) => ({ ...p })),
    settings: { penaltiesOn: true, penaltyCap: 20 },
    badges: {},
    levelSeen: {},
    notifs: [],
    notifsSeen: {},
    selfRatings: {},
    restDays: {},
    boxOpened: {},
    savingsTarget: {},
  };
}

export function toStored(g: GameState): StoredGame {
  const { members: _members, ...rest } = g;
  return rest;
}
