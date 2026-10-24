import type { GameState, StoredGame } from "./types";

export const GAME_VERSION = 4;

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
    shares: [],
    rivalries: [],
    meetups: [],
    memories: [],
    goals: [],
    feed: [],
    badges: {},
    levelSeen: {},
    notifs: [],
    notifsSeen: {},
    restDays: {},
    priorities: {},
    health: {},
    mood: {},
    gratitude: [],
    reviews: [],
    savings: [],
    lessons: {},
    penalties: [],
    settings: { penaltiesOn: false, penaltyCap: 20 },
    selfRatings: {},
    boxOpened: {},
    savingsTarget: {},
  };
}

export function toStored(g: GameState): StoredGame {
  const { members: _members, ...rest } = g;
  return rest;
}
