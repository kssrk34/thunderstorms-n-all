export type DimId =
  | "health" | "mind" | "emotional" | "career" | "money" | "family"
  | "friends" | "creativity" | "giving" | "calm" | "adventure" | "vision";

export type LogKind =
  | "habit" | "activity" | "challenge" | "meetup" | "health" | "career"
  | "money" | "reflect" | "penalty" | "bonus" | "goal" | "todo";

/** Public profile of a signed-up cousin. Comes from the accounts table, never from game data. */
export interface Member {
  id: string;
  name: string;
  username: string;
  emoji: string;
  color: string;
  /** URL of an uploaded profile picture, if any */
  photo?: string;
  bio?: string;
  interests: string[];
  joinedAt: number;
}

/** The signed-in user's own account details. */
export interface Me extends Member {
  role: "admin" | "member";
  onboarded: boolean;
}

export interface LogEntry {
  id: string;
  userId: string;
  ts: number;
  date: string;
  label: string;
  xp: number;
  dim: DimId;
  kind: LogKind;
  tag?: string;
  ref?: string;
}

/** A daily quest: repeats every day. */
export interface Habit {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  dim: DimId;
  xp: number;
  tag?: string;
  goalId?: string;
  created: string;
}

/** A one-time quest. */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  emoji?: string;
  dim: DimId;
  xp: number;
  done: boolean;
  doneOn?: string;
  goalId?: string;
  created: string;
}

export interface Challenge {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  period: "daily" | "weekly" | "monthly";
  scope: "solo" | "squad";
  dim: DimId;
  xp: number;
  target: number;
  unit: string;
  participants: string[];
  progress: Record<string, number>;
  completedBy: string[];
  createdBy: string;
  endsOn: string;
}

export interface Meetup {
  id: string;
  date: string;
  place: string;
  kind: string;
  attendees: string[];
  note: string;
  xpEach: number;
  by?: string;
}

export interface Memory {
  id: string;
  meetupId?: string;
  date: string;
  emoji: string;
  title: string;
  caption: string;
  by: string;
  cheers: string[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  dim: DimId;
  why?: string;
  /** Optional measurable target; goals without one are simply marked achieved. */
  target?: number;
  current: number;
  unit?: string;
  xpPerStep: number;
  due?: string;
  done?: boolean;
  doneOn?: string;
  created: string;
}

export interface HealthDay {
  water: number;
  sleep: number;
  meals: string[];
  workouts: { type: string; mins: number }[];
}

export interface MoodEntry {
  mood: number; // 1-5
  energy: number; // 1-5
  note?: string;
}

export interface Gratitude {
  id: string;
  userId: string;
  date: string;
  text: string;
}

export interface Review {
  id: string;
  userId: string;
  weekOf: string;
  wins: string;
  struggles: string;
  intention: string;
  rating: number;
}

export interface Saving {
  id: string;
  userId: string;
  date: string;
  amount: number;
  note: string;
}

export interface Duel {
  id: string;
  a: string;
  b: string;
  metric: "xp" | "days";
  period: "week" | "month";
  stake: string;
  start: string;
}

export interface PenaltyDef {
  id: string;
  label: string;
  xp: number; // positive number, applied as negative
  dim: DimId;
  on: boolean;
}

export type NotifIcon = "bolt" | "trophy" | "level" | "badge" | "goal" | "users" | "rest" | "duel" | "quest";

export interface Notif {
  id: string;
  ts: number;
  icon: NotifIcon;
  title: string;
  body?: string;
}

export interface Settings {
  penaltiesOn: boolean;
  penaltyCap: number;
}

export interface GameState {
  v: number;
  /** Injected from the accounts table at read time; never persisted with the game. */
  members: Member[];
  logs: LogEntry[];
  todos: Todo[];
  habits: Habit[];
  challenges: Challenge[];
  meetups: Meetup[];
  memories: Memory[];
  goals: Goal[];
  health: Record<string, Record<string, HealthDay>>;
  mood: Record<string, Record<string, MoodEntry>>;
  gratitude: Gratitude[];
  reviews: Review[];
  savings: Saving[];
  lessons: Record<string, string[]>;
  duels: Duel[];
  penalties: PenaltyDef[];
  settings: Settings;
  badges: Record<string, Record<string, number>>;
  levelSeen: Record<string, number>;
  notifs: Notif[];
  /** user -> timestamp of the newest notification they have seen */
  notifsSeen: Record<string, number>;
  selfRatings: Record<string, Partial<Record<DimId, number>>>;
  restDays: Record<string, string[]>;
  boxOpened: Record<string, string>; // user -> date of last daily spark
  savingsTarget: Record<string, number>;
}

/** The game as persisted on the server (profiles live with the accounts). */
export type StoredGame = Omit<GameState, "members">;

/** What the server sends a signed-in cousin. */
export interface View {
  rev: number;
  me: Me;
  game: GameState;
}
