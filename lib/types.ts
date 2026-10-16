export type DimId =
  | "health" | "mind" | "emotional" | "career" | "money" | "family"
  | "friends" | "creativity" | "giving" | "calm" | "adventure" | "vision";

export type LogKind =
  | "habit" | "activity" | "challenge" | "meetup" | "health" | "career"
  | "money" | "reflect" | "penalty" | "bonus" | "goal" | "todo";

export interface Cousin {
  id: string;
  name: string;
  role: string;
  city: string;
  area: string;
  emoji: string;
  color: string;
  bio: string;
  focus: string;
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

export interface Habit {
  id: string;
  userId: string; // cousin id or "all"
  title: string;
  emoji: string;
  dim: DimId;
  xp: number;
  tag?: string;
}

export interface Todo {
  id: string;
  userId: string;
  title: string;
  dim: DimId;
  xp: number;
  done: boolean;
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
  cat: "career" | "learning" | "health" | "finance" | "hobby" | "personal";
  current: number;
  target: number;
  unit: string;
  xpPerStep: number;
  due: string;
  done?: boolean;
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

export interface Notif {
  id: string;
  ts: number;
  icon: string;
  title: string;
  body?: string;
  read: boolean;
}

export interface Settings {
  penaltiesOn: boolean;
  penaltyCap: number;
  liveSim: boolean;
}

export interface GameState {
  v: number;
  activeId: string;
  logs: LogEntry[];
  todos: Todo[];
  customHabits: Habit[];
  hiddenHabits: string[];
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
  avatars: Record<string, { emoji: string; aura: string }>;
  selfRatings: Record<string, Record<DimId, number>>;
  restDays: Record<string, string[]>;
  boxOpened: Record<string, string>; // user -> date of last surprise bolt
  savingsTarget: Record<string, number>;
}
