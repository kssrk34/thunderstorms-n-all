import { COUSINS, DEFAULT_PENALTIES, DIMS } from "./catalog";
import type { GameState } from "./types";

/** A clean slate: no XP, logs, goals, challenges or history for any cousin. */
export function makeSeed(): GameState {
  const selfRatings = Object.fromEntries(COUSINS.map((c) => [c.id, Object.fromEntries(DIMS.map((d) => [d.id, 5]))])) as GameState["selfRatings"];

  return {
    v: 2,
    activeId: COUSINS[0].id,
    logs: [],
    todos: [],
    customHabits: [],
    hiddenHabits: [],
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
    penalties: DEFAULT_PENALTIES,
    settings: { penaltiesOn: true, penaltyCap: 20, liveSim: false },
    badges: {},
    levelSeen: {},
    notifs: [
      { id: "n0", ts: Date.now(), icon: "⛈️", title: "Welcome to Thunderstorms 'n' All!", body: "Complete today's quests, keep your streak, and out-thunder your cousins.", read: false },
    ],
    avatars: Object.fromEntries(COUSINS.map((c, i) => [c.id, { emoji: c.emoji, aura: i % 2 ? "storm" : "bolt" }])),
    selfRatings,
    restDays: {},
    boxOpened: {},
    savingsTarget: {},
  };
}
