import type { ActiveDim, Challenge, DimId, NotifyKind, Rivalry } from "./types";

/* ------------------------------------------------------------------ */
/* Ten life dimensions                                                 */
/* ------------------------------------------------------------------ */
export interface Dim { id: DimId; name: string; short: string; color: string; blurb: string }

export const DIMS: Dim[] = [
  { id: "health", name: "Health and Fitness", short: "Health", color: "#47D188", blurb: "Energy, strength, sleep and movement" },
  { id: "intellectual", name: "Intellectual Life", short: "Intellect", color: "#4CBCF0", blurb: "Reading, learning and curiosity" },
  { id: "emotional", name: "Emotional Life", short: "Emotional", color: "#E87DCB", blurb: "Self-awareness, resilience and calm" },
  { id: "character", name: "Character", short: "Character", color: "#9688F2", blurb: "Integrity, discipline and keeping your word" },
  { id: "spiritual", name: "Spiritual Life", short: "Spiritual", color: "#C286E9", blurb: "Meditation, gratitude and meaning" },
  { id: "social", name: "Social Life", short: "Social", color: "#EF6C82", blurb: "Family, cousins, friends and community" },
  { id: "financial", name: "Financial Life", short: "Financial", color: "#2DD2B7", blurb: "Saving, budgeting and investing" },
  { id: "career", name: "Career", short: "Career", color: "#F59847", blurb: "Craft, growth and professional milestones" },
  { id: "quality", name: "Quality of Life", short: "Quality", color: "#ADD454", blurb: "Home, hobbies, adventures and rest" },
  { id: "vision", name: "Life Vision", short: "Vision", color: "#8EC5FF", blurb: "Your overall balance across the other nine" },
];
export const DIM = Object.fromEntries(DIMS.map((d) => [d.id, d])) as Record<DimId, Dim>;
export const DIM_IDS = DIMS.map((d) => d.id);
/** The nine dimensions quests can belong to. Life Vision is calculated from them. */
export const ACTIVE_DIMS = DIM_IDS.filter((d) => d !== "vision") as ActiveDim[];

/** Gentle next steps for a dimension that needs attention. */
export const DIM_IDEAS: Record<ActiveDim, string> = {
  health: "A 20-minute walk after dinner, three times this week.",
  intellectual: "Ten pages before bed. That's a book a month.",
  emotional: "Two minutes each night to name one feeling and what caused it.",
  character: "Pick one promise you've been putting off and keep it this week.",
  spiritual: "Five quiet minutes after waking, before your phone.",
  social: "Call a cousin or a grandparent this weekend.",
  financial: "One no-spend day a week, or automate a small SIP.",
  career: "One 45-minute deep-work block a day with notifications off.",
  quality: "Ten minutes of tidying, or plan a small weekend adventure.",
};

/** Five cousins, five accounts. */
export const MAX_MEMBERS = 5;

/* ------------------------------------------------------------------ */
/* Identity: characters, frames, ranks                                 */
/* ------------------------------------------------------------------ */
export interface Character { id: string; name: string; title: string; color: string; tagline: string }

/** Original storm-agent characters. Each can be claimed by one cousin. */
export const CHARACTERS: Character[] = [
  { id: "volt", name: "Volt", title: "The Striker", color: "#3FD0FF", tagline: "First in, fastest out." },
  { id: "nimbus", name: "Nimbus", title: "The Warden", color: "#8FB4E8", tagline: "Calm before every storm." },
  { id: "aurelia", name: "Aurelia", title: "The Skyblade", color: "#F5B544", tagline: "Rides the lightning, never the wind." },
  { id: "rune", name: "Rune", title: "The Seer", color: "#A78BFA", tagline: "Reads the storm before it breaks." },
  { id: "tempest", name: "Tempest", title: "The Rogue", color: "#4C8DFF", tagline: "Rules are just weather." },
  { id: "aegis", name: "Aegis", title: "The Guardian", color: "#2DD2B7", tagline: "Holds the line. Every day." },
  { id: "sable", name: "Sable", title: "The Shade", color: "#E87DCB", tagline: "Strikes from the dark." },
  { id: "gale", name: "Gale", title: "The Ranger", color: "#47D188", tagline: "Always one ridge further." },
];
export const CHARACTER = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<string, Character>;

/** Avatar frames. Each one after the first is unlocked by an achievement. */
export const FRAMES: { id: string; name: string; badge?: string; hint: string }[] = [
  { id: "classic", name: "Classic", hint: "Always yours" },
  { id: "charged", name: "Charged", badge: "rod", hint: "Keep a 7-day streak" },
  { id: "arc", name: "Arc", badge: "collab", hint: "Complete a mission with cousins" },
  { id: "gilded", name: "Gilded", badge: "lvl5", hint: "Reach level 5" },
  { id: "radiant", name: "Stormborn", badge: "balanced", hint: "Reach 50% in all nine areas" },
];

/** Competitive rank tiers, from the rank score (recent balance and consistency). */
export const RANKS = [
  { id: "mist", name: "Mist", min: 0, color: "#8693AD" },
  { id: "drizzle", name: "Drizzle", min: 15, color: "#86AEE0" },
  { id: "squall", name: "Squall", min: 30, color: "#4CBCF0" },
  { id: "cyclone", name: "Cyclone", min: 45, color: "#2DD2B7" },
  { id: "thunderhead", name: "Thunderhead", min: 60, color: "#9688F2" },
  { id: "lightning", name: "Lightning", min: 75, color: "#F5B544" },
  { id: "stormborn", name: "Stormborn", min: 90, color: "#E8F1FF" },
] as const;

/** Legacy emoji avatars and colours, still assigned at sign-up for older code paths. */
export const AVATAR_EMOJIS = ["⛅", "⚡", "🌙", "🌿", "🌊", "🌸", "🦊", "🦉", "🐯", "🐬", "🎧", "📚", "🎨", "🏔️", "☕", "🍀"];
export const MEMBER_COLORS = ["#4C8DFF", "#9688F2", "#2DD2B7", "#47D188", "#F59847", "#EF6C82", "#C286E9", "#8FB4E8"];

/* ------------------------------------------------------------------ */
/* Quests                                                              */
/* ------------------------------------------------------------------ */
/** Keys of the line icons a quest can use (see components/icons.tsx). */
export const QUEST_ICONS = [
  "bolt", "dumbbell", "run", "walk", "water", "sleep", "book", "study", "code", "briefcase", "brain", "meditate",
  "heart", "shield", "users", "phone", "coins", "home", "palette", "music", "mountain", "sun", "pen", "sprout",
] as const;
export type QuestIcon = (typeof QUEST_ICONS)[number];
/** Earlier versions used emoji; they map onto the closest line icon. */
export const EMOJI_TO_ICON: Record<string, QuestIcon> = {
  "✨": "bolt", "⚡": "bolt", "🚶": "walk", "🏃": "run", "💧": "water", "📖": "book", "📚": "book", "🧘": "meditate", "🎓": "study",
  "💻": "code", "🪙": "coins", "📞": "phone", "🍳": "home", "🎨": "palette", "🌱": "sprout", "🌙": "sleep", "🏸": "run", "🤝": "users",
  "📸": "sun", "🎉": "users", "🍛": "home", "🌄": "mountain", "🪔": "sun", "🎂": "heart", "🏏": "run", "🎶": "music", "🚗": "mountain", "😂": "heart",
};

export type QuestKind = "daily" | "once" | "challenge";

/** Aura Points presets by effort. Custom values must stay within the limits. */
export const EFFORT = {
  daily: [{ label: "Light", xp: 10 }, { label: "Steady", xp: 20 }, { label: "Strong", xp: 30 }, { label: "Intense", xp: 40 }],
  once: [{ label: "Light", xp: 10 }, { label: "Steady", xp: 20 }, { label: "Strong", xp: 40 }, { label: "Milestone", xp: 100 }],
} as const;
export const AURA_LIMITS = { daily: [5, 50], once: [5, 100] } as const;
/** Aura for finishing a challenge or mission, by length. */
export const CHALLENGE_AURA: Record<Challenge["period"], number> = { daily: 25, weekly: 100, monthly: 200 };
/** Aura for a cousin meetup, each; more when the whole squad is there. */
export const MEETUP_AURA = 75;
export const MEETUP_FULL_AURA = 100;
/** Areas whose quests start out private: money and feelings are personal. */
export const PRIVATE_BY_DEFAULT: ActiveDim[] = ["emotional", "financial"];

export interface QuestIdea { title: string; dim: ActiveDim; kind: "daily" | "once"; xp: number; icon: QuestIcon }
export const QUEST_SUGGESTIONS: QuestIdea[] = [
  { title: "Morning workout", dim: "health", kind: "daily", xp: 30, icon: "dumbbell" },
  { title: "Walk 8,000 steps", dim: "health", kind: "daily", xp: 20, icon: "walk" },
  { title: "Sleep by 11 pm", dim: "health", kind: "daily", xp: 20, icon: "sleep" },
  { title: "Read for 30 minutes", dim: "intellectual", kind: "daily", xp: 20, icon: "book" },
  { title: "Finish a book", dim: "intellectual", kind: "once", xp: 40, icon: "book" },
  { title: "Practise emotional regulation", dim: "emotional", kind: "daily", xp: 15, icon: "heart" },
  { title: "Keep a difficult promise", dim: "character", kind: "once", xp: 40, icon: "shield" },
  { title: "Meditate for 10 minutes", dim: "spiritual", kind: "daily", xp: 15, icon: "meditate" },
  { title: "Meet cousins", dim: "social", kind: "once", xp: 40, icon: "users" },
  { title: "Call a grandparent", dim: "social", kind: "once", xp: 20, icon: "phone" },
  { title: "No-spend day", dim: "financial", kind: "daily", xp: 15, icon: "coins" },
  { title: "Set up a monthly budget", dim: "financial", kind: "once", xp: 40, icon: "coins" },
  { title: "Finish a coding challenge", dim: "career", kind: "once", xp: 40, icon: "code" },
  { title: "Complete a professional certification", dim: "career", kind: "once", xp: 100, icon: "study" },
  { title: "Deep-work session", dim: "career", kind: "daily", xp: 30, icon: "briefcase" },
  { title: "Organise your living space", dim: "quality", kind: "once", xp: 40, icon: "home" },
];

export const GOAL_SUGGESTIONS: { title: string; dim: ActiveDim }[] = [
  { title: "Improve physical fitness", dim: "health" },
  { title: "Read 12 books this year", dim: "intellectual" },
  { title: "Build an emergency fund", dim: "financial" },
  { title: "Earn a professional certification", dim: "career" },
  { title: "Spend more time with family", dim: "social" },
  { title: "Build a daily meditation practice", dim: "spiritual" },
];

export interface MissionIdea extends Pick<Challenge, "title" | "desc" | "period" | "scope" | "track" | "dim" | "target" | "unit"> { icon: QuestIcon }
export const MISSION_SUGGESTIONS: MissionIdea[] = [
  { title: "Three workouts each", desc: "Everyone completes three Health quests this week.", icon: "dumbbell", period: "weekly", scope: "team", track: "quests", dim: "health", target: 3, unit: "workouts" },
  { title: "Five reading days", desc: "Every cousin completes five Intellectual quests this week.", icon: "book", period: "weekly", scope: "team", track: "quests", dim: "intellectual", target: 5, unit: "sessions" },
  { title: "Organise a cousin meetup", desc: "Get together in person before the month is out.", icon: "users", period: "monthly", scope: "squad", track: "manual", dim: "social", target: 1, unit: "meetup" },
  { title: "Shared savings streak", desc: "Twenty no-spend days between all of us. Counts, never amounts.", icon: "coins", period: "monthly", scope: "squad", track: "manual", dim: "financial", target: 20, unit: "no-spend days" },
  { title: "Move every day", desc: "Seven Health quests this week, solo.", icon: "run", period: "weekly", scope: "solo", track: "quests", dim: "health", target: 7, unit: "quests" },
];

export const RIVALRY_TEMPLATES: Pick<Rivalry, "title" | "metric" | "dim">[] = [
  { title: "Most Aura this week", metric: "aura" },
  { title: "Most consistent week", metric: "days" },
  { title: "Career sprint", metric: "dim", dim: "career" },
  { title: "Fitness face-off", metric: "dim", dim: "health" },
  { title: "Learning league", metric: "dim", dim: "intellectual" },
];

/* ------------------------------------------------------------------ */
/* Log an activity: wins that weren't on the list                      */
/* ------------------------------------------------------------------ */
export interface ActivityType { id: string; label: string; dim: ActiveDim; xp: number; tag: string; hint: string; icon: QuestIcon }
/** Aura is for 30 minutes and scales with duration (half to double). The server never trusts a client-sent amount. */
export const ACTIVITIES: ActivityType[] = [
  { id: "exercise", label: "Workout", dim: "health", xp: 30, tag: "workout", hint: "e.g. KBR Park run, badminton, yoga", icon: "dumbbell" },
  { id: "walk", label: "Walk", dim: "health", xp: 15, tag: "walk", hint: "e.g. Evening walk around Durgam Cheruvu", icon: "walk" },
  { id: "read", label: "Read", dim: "intellectual", xp: 20, tag: "read", hint: "e.g. Atomic Habits, chapter 4", icon: "book" },
  { id: "study", label: "Study", dim: "intellectual", xp: 25, tag: "study", hint: "e.g. A finance chapter, GRE words", icon: "study" },
  { id: "upskill", label: "Upskill", dim: "career", xp: 30, tag: "code", hint: "e.g. A course module, a coding set", icon: "code" },
  { id: "deepwork", label: "Deep work", dim: "career", xp: 25, tag: "deepwork", hint: "e.g. Shipped the onboarding flow", icon: "briefcase" },
  { id: "meditate", label: "Meditate", dim: "spiritual", xp: 15, tag: "calm", hint: "e.g. Ten minutes of pranayama", icon: "meditate" },
  { id: "journal", label: "Journal", dim: "emotional", xp: 15, tag: "journal", hint: "Only you see the note", icon: "pen" },
  { id: "kindness", label: "Kindness", dim: "character", xp: 20, tag: "kindness", hint: "e.g. Helped a friend move", icon: "heart" },
  { id: "volunteer", label: "Volunteer", dim: "character", xp: 40, tag: "volunteer", hint: "e.g. Teaching kids at an NGO", icon: "sprout" },
  { id: "family", label: "Family", dim: "social", xp: 25, tag: "family", hint: "e.g. Dinner with Amma and Nanna", icon: "home" },
  { id: "friends", label: "Friends", dim: "social", xp: 20, tag: "friends", hint: "e.g. Coffee with an old friend", icon: "users" },
  { id: "save", label: "Save", dim: "financial", xp: 20, tag: "save", hint: "e.g. Cooked instead of ordering in", icon: "coins" },
  { id: "hobby", label: "Hobby", dim: "quality", xp: 20, tag: "hobby", hint: "e.g. Guitar, photography, painting", icon: "palette" },
  { id: "tidy", label: "Tidy up", dim: "quality", xp: 15, tag: "tidy", hint: "e.g. Cleared the desk and wardrobe", icon: "home" },
  { id: "explore", label: "Explore", dim: "quality", xp: 25, tag: "explore", hint: "e.g. A trek, a new neighbourhood", icon: "mountain" },
];
/** Activity types that start out private when logged. */
export const PRIVATE_ACTIVITIES = new Set(["journal", "save"]);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export const NOTIFY_KINDS: { id: Exclude<NotifyKind, "test">; label: string; example: string }[] = [
  { id: "daily", label: "Daily quest reminder", example: "Your daily quests are waiting." },
  { id: "overtaken", label: "A cousin passes your weekly score", example: "Your cousin just passed your weekly Aura Points score." },
  { id: "challengeDone", label: "Challenge or mission completed", example: "You've completed your weekly challenge!" },
  { id: "ending", label: "Group challenge ending soon", example: "The group challenge ends tomorrow." },
  { id: "recap", label: "Weekly recap ready", example: "Your weekly Life Balance recap is ready." },
];

/* ------------------------------------------------------------------ */
/* Meetups                                                             */
/* ------------------------------------------------------------------ */
export const PLACES = [
  "Hussain Sagar", "Chutneys, Banjara Hills", "Shilparamam", "Durgam Cheruvu", "Charminar", "Lamakaan",
  "Nandi Hills", "MTR, Bangalore", "Lalbagh", "Cubbon Park", "Home, Sunday lunch",
];
export const MEETUP_KINDS = ["Dinner", "Outing", "Trip", "Festival", "Game night", "Workout together", "Study session", "Movie", "Birthday"];
export const MEMORY_ICONS: QuestIcon[] = ["sun", "users", "home", "mountain", "heart", "music", "run", "palette"];
export const HANGOUT_IDEAS = [
  { title: "Board game night", desc: "Pallanguzhi, Ludo, or something new" },
  { title: "Cook-off", desc: "Teams of two, the parents judge" },
  { title: "Badminton doubles", desc: "Losers buy the filter coffee" },
  { title: "A weekend visit", desc: "Go see whoever lives furthest away" },
  { title: "Classic movie marathon", desc: "Everyone picks one film" },
];
