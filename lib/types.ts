/**
 * Ten life dimensions. Life Vision ("vision") is never assigned directly: it
 * is the composite of the other nine.
 */
export type DimId =
  | "health" | "intellectual" | "emotional" | "character" | "spiritual"
  | "social" | "financial" | "career" | "quality" | "vision";
/** The nine dimensions quests and habits can belong to. */
export type ActiveDim = Exclude<DimId, "vision">;

export type LogKind =
  | "habit" | "activity" | "challenge" | "meetup" | "goal" | "todo"
  // kinds kept only for history from earlier versions
  | "health" | "career" | "money" | "reflect" | "penalty" | "bonus";

/** Public profile of a signed-up cousin. Comes from the accounts table, never from game data. */
export interface Member {
  id: string;
  name: string;
  username: string;
  /** legacy emoji avatar, no longer shown */
  emoji: string;
  color: string;
  /** URL of an uploaded profile picture, if any */
  photo?: string;
  /** id of the chosen character portrait */
  character?: string;
  /** avatar frame, unlocked by achievements */
  frame?: string;
  bio?: string;
  joinedAt: number;
  dailyGoal?: DailyGoal;
  /** false: cousins see Aura totals but not what each completion was, and nothing goes to the feed */
  shareActivity?: boolean;
}

export type DailyGoal = "auto" | 50 | 100 | 150 | 200;

/** The signed-in user's own account details. */
export interface Me extends Member {
  role: "admin" | "member";
  onboarded: boolean;
  dailyGoal: DailyGoal;
  shareActivity: boolean;
}

/**
 * One Aura Points transaction. The log is the ledger: every point anyone has
 * ever earned is one of these, and `ref` makes each claim unique.
 * (Stored as `xp` for compatibility with earlier versions; it is Aura Points.)
 */
export interface LogEntry {
  id: string;
  userId: string;
  ts: number;
  date: string;
  label: string;
  xp: number;
  dim: DimId;
  /** a second dimension; the Aura is split evenly between the two */
  dim2?: ActiveDim;
  kind: LogKind;
  tag?: string;
  ref?: string;
  /** cousins see the amount and dimension but not the label */
  private?: boolean;
}

/** A daily quest (habit). Repeats on its scheduled weekdays. */
export interface Habit {
  id: string;
  userId: string;
  title: string;
  /** line-icon key from the quest icon set */
  icon?: string;
  /** legacy emoji icon */
  emoji?: string;
  dim: ActiveDim;
  dim2?: ActiveDim;
  xp: number;
  /** weekdays it's due, Monday = 0; missing means every day */
  days?: number[];
  tag?: string;
  goalId?: string;
  private?: boolean;
  created: string;
  /** retired from this date on; history before it still counts */
  archivedOn?: string;
  /** the shared quest this is the owner's copy of */
  shareId?: string;
  /** last day it's due (shared habits with an end date) */
  endsOn?: string;
  /** hour (India time) for a personal reminder about this habit */
  remindAt?: number;
}

/** A one-time quest. */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  icon?: string;
  emoji?: string;
  dim: ActiveDim;
  dim2?: ActiveDim;
  xp: number;
  done: boolean;
  doneOn?: string;
  goalId?: string;
  private?: boolean;
  created: string;
  /** the shared quest this is the owner's copy of */
  shareId?: string;
}

export type InviteStatus = "pending" | "accepted" | "declined" | "left";

/** One cousin's place in a shared quest: invited, joined, declined or left. */
export interface ShareMember {
  status: InviteStatus;
  invitedBy: string;
  invitedAt: number;
  respondedAt?: number;
  /** the day they joined; their progress counts from here */
  joinedOn?: string;
  /** the day they left; their earlier progress still counts */
  leftOn?: string;
  /** id of their own habit or one-time quest for it */
  copyId?: string;
}

/**
 * A quest or habit cousins do together. Each participant has their own copy
 * (a normal habit or one-time quest), so completions, streaks, Aura and Life
 * Balance stay individual.
 * - together: everyone completes it independently, side by side
 * - team: completions add up toward one shared target before the deadline
 */
export interface SharedQuest {
  id: string;
  kind: "habit" | "todo";
  mode: "together" | "team";
  title: string;
  desc?: string;
  icon?: string;
  dim: ActiveDim;
  dim2?: ActiveDim;
  xp: number;
  /** weekdays a shared habit is due, Monday = 0; missing means every day */
  days?: number[];
  /** the organiser's visibility choice, which new copies start with: private titles stay hidden from cousins outside it */
  private?: boolean;
  createdBy: string;
  startsOn: string;
  endsOn?: string;
  /** team: total completions needed */
  target?: number;
  /** team: Aura each contributing participant earns when the target is met, fixed when it was created */
  bonus?: number;
  /** everyone ever invited, keyed by user id; the organiser is "accepted" from the start */
  members: Record<string, ShareMember>;
  /** the organiser ended it; everyone keeps their copy as a personal quest */
  endedOn?: string;
  created: number;
}

/**
 * A challenge or collaborative mission.
 * - solo: each participant earns the reward on reaching their own target
 * - team: everyone must reach their own target; then everyone earns it
 * - squad: one shared total; everyone earns it when the total is reached
 */
export interface Challenge {
  id: string;
  title: string;
  desc: string;
  icon?: string;
  emoji?: string;
  period: "daily" | "weekly" | "monthly";
  scope: "solo" | "team" | "squad";
  /** "quests" counts completed quests in the dimension automatically; "manual" is logged by each participant */
  track: "manual" | "quests";
  dim: ActiveDim;
  xp: number;
  target: number;
  unit: string;
  participants: string[];
  /** manual progress per participant */
  progress: Record<string, number>;
  completedBy: string[];
  createdBy: string;
  startsOn: string;
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
  icon?: string;
  emoji?: string;
  title: string;
  caption: string;
  by: string;
  cheers: string[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  dim: ActiveDim;
  why?: string;
  /** Optional measurable target; goals without one are simply marked achieved. */
  target?: number;
  current: number;
  unit?: string;
  xpPerStep: number;
  /** the furthest progress ever reached; Aura is only paid beyond it */
  peak?: number;
  due?: string;
  done?: boolean;
  doneOn?: string;
  private?: boolean;
  created: string;
}

/** An optional weekly competition between cousins who opt in. */
export interface Rivalry {
  id: string;
  title: string;
  /** aura: Aura earned; days: active days; dim: Aura earned in one dimension */
  metric: "aura" | "days" | "dim";
  dim?: ActiveDim;
  start: string;
  end: string;
  participants: string[];
  createdBy: string;
  stake?: string;
}

export type ReactionKind = "zap" | "fire" | "clap" | "heart";

/** Something a cousin chose to share with the squad. */
export interface FeedEvent {
  id: string;
  ts: number;
  userId: string;
  kind: "quest" | "streak" | "challenge" | "mission" | "meetup" | "goal" | "level" | "badge" | "daily" | "rivalry" | "started" | "together";
  text: string;
  dim?: DimId;
  xp?: number;
  /** ties the event to the Aura claim it came from, so undoing removes it */
  ref?: string;
  reactions: Record<string, ReactionKind>;
}

export type NotifIcon = "bolt" | "trophy" | "level" | "badge" | "goal" | "users" | "rest" | "duel" | "quest" | "react";

export interface Notif {
  id: string;
  ts: number;
  icon: NotifIcon;
  title: string;
  body?: string;
  /** recipients; missing means the whole squad (older notifications) */
  to?: string[];
  /** the cousin it's about, for their avatar */
  from?: string;
  /** where tapping it goes */
  link?: string;
  /** also sent as a phone notification in this category, if the recipient opted in */
  kind?: NotifyCategory;
  /** what it refers to, e.g. "share:<id>" for an invitation */
  ref?: string;
}

/* ---------- kept only for history from earlier versions ---------- */
export interface HealthDay { water: number; sleep: number; meals: string[]; workouts: { type: string; mins: number }[] }
export interface MoodEntry { mood: number; energy: number; note?: string }
export interface Gratitude { id: string; userId: string; date: string; text: string }
export interface Review { id: string; userId: string; weekOf: string; wins: string; struggles: string; intention: string; rating: number }
export interface Saving { id: string; userId: string; date: string; amount: number; note: string }
export interface PenaltyDef { id: string; label: string; xp: number; dim: DimId; on: boolean }
export interface Settings { penaltiesOn: boolean; penaltyCap: number }

export interface GameState {
  v: number;
  /** Injected from the accounts table at read time; never persisted with the game. */
  members: Member[];
  logs: LogEntry[];
  todos: Todo[];
  habits: Habit[];
  challenges: Challenge[];
  /** quests and habits shared between cousins, with their invitations */
  shares: SharedQuest[];
  rivalries: Rivalry[];
  meetups: Meetup[];
  memories: Memory[];
  goals: Goal[];
  feed: FeedEvent[];
  badges: Record<string, Record<string, number>>;
  levelSeen: Record<string, number>;
  notifs: Notif[];
  /** user -> timestamp of the newest notification they have seen */
  notifsSeen: Record<string, number>;
  restDays: Record<string, string[]>;
  /** user -> today's top three, picked by them */
  priorities: Record<string, { date: string; ids: string[] }>;
  /* history from earlier versions: preserved, no longer shown */
  health: Record<string, Record<string, HealthDay>>;
  mood: Record<string, Record<string, MoodEntry>>;
  gratitude: Gratitude[];
  reviews: Review[];
  savings: Saving[];
  lessons: Record<string, string[]>;
  penalties: PenaltyDef[];
  settings: Settings;
  selfRatings: Record<string, Partial<Record<string, number>>>;
  boxOpened: Record<string, string>;
  savingsTarget: Record<string, number>;
  duels?: unknown[];
}

/** The game as persisted on the server (profiles live with the accounts). */
export type StoredGame = Omit<GameState, "members">;

/** A score per dimension, 0–100, or null when there isn't enough data yet. */
export type Scores = Record<DimId, number | null>;

/** Aggregated progress the server shares about every cousin (never the habits behind it). */
export interface MemberStats {
  b7: Scores;
  bPrev7: Scores;
  b30: Scores;
  bPrev30: Scores;
  bAll: Scores;
  /** Life Vision over the 30 days ending each of the last eight weeks, oldest first */
  trend: (number | null)[];
  /** share of this week's planned habits and quests completed so far */
  weekCompletion: number | null;
  consistency: number;
  rankScore: number;
  objective: number;
}

/* ---------- notifications ---------- */
/** What a phone notification is about. Each can be switched on or off. */
export type NotifyCategory = "habits" | "quests" | "invites" | "cousins" | "leaderboard" | "missions" | "recap" | "meetups";
/** Categories, plus a test message and kinds recorded by earlier versions. */
export type NotifyKind = NotifyCategory | "test" | "daily" | "overtaken" | "challengeDone" | "ending";

/** A cousin's choices about messages outside the app. Everything is off until they opt in. */
export interface NotifyPrefs {
  /** E.164, e.g. +919876543210 */
  phone?: string;
  phoneVerified?: boolean;
  /** explicit WhatsApp opt-in, with when it was given */
  whatsapp: boolean;
  whatsappAt?: number;
  push: boolean;
  kinds: Record<NotifyCategory, boolean>;
  /** quiet hours, India time; no messages from start until end */
  quietStart: number;
  quietEnd: number;
  /** most messages a day, across channels */
  dailyLimit: number;
  /** hour (India time) for the daily reminder */
  reminderHour: number;
}

export type OutboxStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "skipped" | "simulated";
/** One message on its way (or not) to one cousin over one channel. */
export interface OutboxItem {
  id: string;
  userId: string;
  kind: NotifyKind;
  channel: "whatsapp" | "push";
  /** the same event never produces two messages with the same key */
  dedupe: string;
  createdAt: number;
  notBefore: number;
  updatedAt: number;
  status: OutboxStatus;
  attempts: number;
  /** the headline on a phone notification */
  title?: string;
  /** the exact text, which never includes other cousins' private data */
  body: string;
  url?: string;
  template?: { name: string; params: string[] };
  providerId?: string;
  error?: string;
}

/** What the server sends a signed-in cousin. */
export interface View {
  rev: number;
  day: string;
  me: Me;
  game: GameState;
  stats: Record<string, MemberStats>;
}
