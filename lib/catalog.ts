import type { DimId, PenaltyDef } from "./types";

export interface Dim { id: DimId; name: string; short: string; color: string; blurb: string }

// 12 life areas, inspired by the Lifebook framework and adapted for cousins in their 20s.
export const DIMS: Dim[] = [
  { id: "health", name: "Health & Fitness", short: "Health", color: "#34A37B", blurb: "Energy, strength, sleep, food" },
  { id: "mind", name: "Mind & Learning", short: "Learning", color: "#4C7DFF", blurb: "Skills, books, curiosity" },
  { id: "emotional", name: "Emotional Life", short: "Emotional", color: "#6D6AE8", blurb: "Mood, resilience, self-talk" },
  { id: "career", name: "Career & Craft", short: "Career", color: "#E09B3D", blurb: "Work, growth, networking" },
  { id: "money", name: "Money & Freedom", short: "Money", color: "#2E9FB3", blurb: "Saving, budgeting, literacy" },
  { id: "family", name: "Family & Cousins", short: "Family", color: "#E06C7A", blurb: "Parents, cousins, traditions" },
  { id: "friends", name: "Friends & Community", short: "Friends", color: "#E8845C", blurb: "Friendships and belonging" },
  { id: "creativity", name: "Creativity & Play", short: "Creativity", color: "#A06CD5", blurb: "Hobbies, art, music, fun" },
  { id: "giving", name: "Contribution", short: "Giving", color: "#7DAA3C", blurb: "Volunteering and giving back" },
  { id: "calm", name: "Inner Calm", short: "Calm", color: "#4AA8A0", blurb: "Mindfulness, stillness, faith" },
  { id: "adventure", name: "Adventure & Life", short: "Adventure", color: "#C8794B", blurb: "Trips, new experiences" },
  { id: "vision", name: "Vision & Purpose", short: "Purpose", color: "#5872B8", blurb: "Direction and long-term goals" },
];
export const DIM = Object.fromEntries(DIMS.map((d) => [d.id, d])) as Record<DimId, Dim>;
export const DIM_IDS = DIMS.map((d) => d.id);

/** Five cousins, five accounts. */
export const MAX_MEMBERS = 5;

export const AVATAR_EMOJIS = ["⛅", "⚡", "🌙", "🌿", "🌊", "🌸", "🦊", "🦉", "🐯", "🐬", "🎧", "📚", "🎨", "🏔️", "☕", "🍀"];
export const MEMBER_COLORS = ["#4C7DFF", "#6D6AE8", "#2E9FB3", "#34A37B", "#E09B3D", "#E06C7A", "#A06CD5", "#5F7A99"];

export const INTERESTS = [
  "Fitness", "Reading", "Music", "Cooking", "Travel", "Technology", "Art", "Movies",
  "Cricket", "Badminton", "Photography", "Finance", "Writing", "Nature", "Yoga", "Dance",
];

/* ------------------------------------------------------------------ */
/* Suggestions. Shown as optional ideas only; nothing here is ever     */
/* saved to a profile unless the user picks it and confirms.           */
/* ------------------------------------------------------------------ */
export const GOAL_SUGGESTIONS: { title: string; dim: DimId }[] = [
  { title: "Improve physical fitness", dim: "health" },
  { title: "Develop a new skill", dim: "mind" },
  { title: "Read more books", dim: "mind" },
  { title: "Improve professional skills", dim: "career" },
  { title: "Spend more time with family", dim: "family" },
  { title: "Improve personal finances", dim: "money" },
];

export type QuestKind = "daily" | "once" | "challenge";
export const QUEST_SUGGESTIONS: { title: string; dim: DimId; kind: Exclude<QuestKind, "challenge">; emoji: string }[] = [
  { title: "Walk for 20 minutes", dim: "health", kind: "daily", emoji: "🚶" },
  { title: "Read 10 pages", dim: "mind", kind: "daily", emoji: "📖" },
  { title: "Drink 8 glasses of water", dim: "health", kind: "daily", emoji: "💧" },
  { title: "Call a cousin", dim: "family", kind: "once", emoji: "📞" },
  { title: "Set up a monthly budget", dim: "money", kind: "once", emoji: "🪙" },
  { title: "Cook a new recipe", dim: "creativity", kind: "once", emoji: "🍳" },
];

export const CHALLENGE_SUGGESTIONS: { title: string; desc: string; emoji: string; period: "daily" | "weekly" | "monthly"; scope: "solo" | "squad"; dim: DimId; target: number; unit: string }[] = [
  { title: "Move every day", desc: "Any movement counts: a walk, yoga, a game.", emoji: "🏃", period: "weekly", scope: "solo", dim: "health", target: 7, unit: "days" },
  { title: "Squad reading marathon", desc: "Read 300 pages together this month.", emoji: "📚", period: "monthly", scope: "squad", dim: "mind", target: 300, unit: "pages" },
  { title: "Call the grandparents", desc: "Everyone calls a grandparent at least once.", emoji: "📞", period: "weekly", scope: "squad", dim: "family", target: 5, unit: "calls" },
  { title: "Focused study hours", desc: "Clock focused learning hours this week.", emoji: "🎓", period: "weekly", scope: "solo", dim: "mind", target: 8, unit: "hours" },
];

export const QUEST_EMOJIS = ["✨", "🚶", "🏃", "💧", "📖", "🧘", "🎓", "💻", "🪙", "📞", "🍳", "🎨", "🌱", "🌙", "🏸", "🤝"];

export const CHALLENGE_XP: Record<"daily" | "weekly" | "monthly", number> = { daily: 25, weekly: 100, monthly: 200 };
export const QUEST_SIZES = [
  { id: "small", label: "Small", xp: 10 },
  { id: "medium", label: "Medium", xp: 15 },
  { id: "big", label: "Big", xp: 25 },
] as const;

/* ------------------------------------------------------------------ */
/* Activity catalog for "Log an activity"                              */
/* ------------------------------------------------------------------ */
export interface ActivityType {
  id: string; label: string; dim: DimId; xp: number; tag: string; hint: string;
}
export const ACTIVITIES: ActivityType[] = [
  { id: "exercise", label: "Exercise", dim: "health", xp: 30, tag: "workout", hint: "e.g. KBR Park run, badminton, yoga" },
  { id: "study", label: "Study", dim: "mind", xp: 25, tag: "study", hint: "e.g. A finance chapter, GRE words" },
  { id: "upskill", label: "Upskill", dim: "career", xp: 30, tag: "code", hint: "e.g. A course module, a coding set" },
  { id: "read", label: "Read", dim: "mind", xp: 20, tag: "read", hint: "e.g. Atomic Habits, chapter 4" },
  { id: "save", label: "Save money", dim: "money", xp: 20, tag: "save", hint: "e.g. Cooked instead of ordering in" },
  { id: "volunteer", label: "Volunteer", dim: "giving", xp: 40, tag: "volunteer", hint: "e.g. Teaching kids at an NGO" },
  { id: "hobby", label: "Hobby", dim: "creativity", xp: 20, tag: "hobby", hint: "e.g. Guitar, photography, painting" },
  { id: "family", label: "Family time", dim: "family", xp: 25, tag: "family", hint: "e.g. Dinner with Amma and Nanna" },
  { id: "calm", label: "Meditate", dim: "calm", xp: 15, tag: "calm", hint: "e.g. 10 minutes of quiet, pranayama" },
  { id: "cook", label: "Cook", dim: "health", xp: 15, tag: "meal", hint: "e.g. Pesarattu, millet pongal" },
  { id: "friends", label: "Friends", dim: "friends", xp: 20, tag: "friends", hint: "e.g. Coffee with an old friend" },
  { id: "explore", label: "Explore", dim: "adventure", xp: 25, tag: "explore", hint: "e.g. A trek, a new neighbourhood" },
];

export const DEFAULT_PENALTIES: PenaltyDef[] = [
  { id: "p1", label: "Skipped a workout I committed to", xp: 10, dim: "health", on: true },
  { id: "p2", label: "Junk food binge", xp: 8, dim: "health", on: true },
  { id: "p3", label: "Doomscrolling for 2+ hours", xp: 6, dim: "calm", on: true },
  { id: "p4", label: "Broke a promise to a cousin", xp: 8, dim: "family", on: true },
  { id: "p5", label: "Impulse purchase over budget", xp: 10, dim: "money", on: true },
  { id: "p6", label: "Stayed up past 1 am", xp: 6, dim: "health", on: true },
];

export const MEALS: { id: string; label: string; balanced?: boolean }[] = [
  { id: "idli", label: "Idli, sambar and chutney", balanced: true },
  { id: "pesarattu", label: "Pesarattu and upma", balanced: true },
  { id: "dosa", label: "Ragi or millet dosa", balanced: true },
  { id: "curdrice", label: "Curd rice" },
  { id: "meals", label: "Dal, rice, veg curry and rasam", balanced: true },
  { id: "sprouts", label: "Sprouts or chana salad", balanced: true },
  { id: "buttermilk", label: "Buttermilk" },
  { id: "fruit", label: "Seasonal fruit" },
  { id: "treat", label: "A mindful treat" },
];

export const WORKOUTS = ["Walk", "Run", "Gym", "Yoga", "Surya Namaskar", "Badminton", "Cricket", "Cycling", "Swimming", "Dance", "Home workout"];

export const LESSONS: { id: string; title: string; blurb: string }[] = [
  { id: "emerg", title: "Emergency fund 101", blurb: "Aim for 3–6 months of expenses in a liquid fund or savings account." },
  { id: "sip", title: "SIP vs lump sum", blurb: "Small monthly SIPs in index funds beat waiting for the perfect time." },
  { id: "cc", title: "Credit card traps", blurb: "Always pay the full bill. Revolving interest can cross 40% a year." },
  { id: "tax", title: "Old vs new tax regime", blurb: "Compare deductions (80C, HRA) with the lower new-regime slabs before choosing." },
  { id: "upi", title: "UPI budgeting", blurb: "Use monthly UPI summaries to tag needs, wants and savings." },
  { id: "ppf", title: "PPF, EPF and NPS basics", blurb: "Long-term, tax-efficient, low-risk buckets of your portfolio." },
];

/** Role-agnostic quick logs for the Career page. XP is fixed here so the server never trusts a client-sent amount. */
export const CAREER_QUICK: { id: string; label: string; xp: number; dim: DimId; tag: string }[] = [
  { id: "deep", label: "Did a focused deep-work session", xp: 15, dim: "career", tag: "code" },
  { id: "learn", label: "Learned from a course, talk or article", xp: 10, dim: "mind", tag: "study" },
  { id: "practice", label: "Practised a core skill", xp: 15, dim: "career", tag: "study" },
  { id: "ship", label: "Finished something meaningful", xp: 20, dim: "career", tag: "code" },
  { id: "network", label: "Connected with someone in my field", xp: 10, dim: "career", tag: "network" },
  { id: "mentor", label: "Helped or mentored someone", xp: 20, dim: "giving", tag: "network" },
];

export const PLACES = [
  "Hussain Sagar", "Chutneys, Banjara Hills", "Shilparamam", "Durgam Cheruvu", "Charminar", "Lamakaan",
  "Nandi Hills", "MTR, Bangalore", "Lalbagh", "Cubbon Park", "Home, Sunday lunch",
];
export const MEETUP_KINDS = ["Dinner", "Outing", "Trip", "Festival", "Game night", "Workout together", "Study session", "Movie", "Birthday"];

export const HANGOUT_IDEAS = [
  { title: "Board game night", desc: "Pallanguzhi, Ludo, or something new" },
  { title: "Cook-off", desc: "Teams of two, the parents judge" },
  { title: "Badminton doubles", desc: "Losers buy the filter coffee" },
  { title: "A weekend visit", desc: "Go see whoever lives furthest away" },
  { title: "Classic movie marathon", desc: "Everyone picks one film" },
];
