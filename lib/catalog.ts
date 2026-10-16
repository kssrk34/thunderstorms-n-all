import type { Cousin, DimId, Habit, PenaltyDef } from "./types";

export interface Dim { id: DimId; name: string; emoji: string; color: string; blurb: string }

// 12 life areas, inspired by the Lifebook framework and adapted for cousins in their 20s.
export const DIMS: Dim[] = [
  { id: "health", name: "Health & Fitness", emoji: "💪", color: "#34d399", blurb: "Energy, strength, sleep, food" },
  { id: "mind", name: "Mind & Learning", emoji: "🧠", color: "#38bdf8", blurb: "Skills, books, curiosity" },
  { id: "emotional", name: "Emotional Life", emoji: "🌊", color: "#a78bfa", blurb: "Mood, resilience, self-talk" },
  { id: "career", name: "Career & Craft", emoji: "🚀", color: "#facc15", blurb: "Work, growth, networking" },
  { id: "money", name: "Money & Freedom", emoji: "🪙", color: "#fbbf24", blurb: "Saving, budgeting, literacy" },
  { id: "family", name: "Family & Cousins", emoji: "🏡", color: "#fb7185", blurb: "Parents, cousins, traditions" },
  { id: "friends", name: "Friends & Community", emoji: "🤝", color: "#f472b6", blurb: "Friendships and belonging" },
  { id: "creativity", name: "Creativity & Play", emoji: "🎨", color: "#c084fc", blurb: "Hobbies, art, music, fun" },
  { id: "giving", name: "Contribution", emoji: "🌱", color: "#4ade80", blurb: "Volunteering and giving back" },
  { id: "calm", name: "Inner Calm", emoji: "🧘", color: "#2dd4bf", blurb: "Mindfulness, stillness, faith" },
  { id: "adventure", name: "Adventure & Life", emoji: "🏔️", color: "#fb923c", blurb: "Trips, new experiences" },
  { id: "vision", name: "Vision & Purpose", emoji: "🧭", color: "#60a5fa", blurb: "Direction and long-term goals" },
];
export const DIM = Object.fromEntries(DIMS.map((d) => [d.id, d])) as Record<DimId, Dim>;

export const COUSINS: Cousin[] = [
  { id: "arjun", name: "Arjun", role: "Software Engineer", city: "Hyderabad", area: "Gachibowli", emoji: "🧑‍💻", color: "#38bdf8",
    bio: "Backend dev at a product startup. Cricket nerd, filter-coffee loyalist.", focus: "System design + staying active" },
  { id: "karthik", name: "Karthik", role: "Software Engineer", city: "Hyderabad", area: "Madhapur", emoji: "🎧", color: "#8b5cf6",
    bio: "Frontend engineer, weekend side-project builder, badminton regular.", focus: "Side projects + sleep" },
  { id: "vignesh", name: "Vignesh", role: "Software Engineer", city: "Hyderabad", area: "Kondapur", emoji: "🛠️", color: "#facc15",
    bio: "Cloud/DevOps engineer prepping for his next certification.", focus: "Certifications + saving ₹" },
  { id: "meghana", name: "Meghana", role: "HR Professional", city: "Hyderabad", area: "Banjara Hills", emoji: "🌸", color: "#f472b6",
    bio: "Talent partner who loves people, Kuchipudi and Sunday filter-kaapi.", focus: "HR craft + creative time" },
  { id: "ananya", name: "Ananya", role: "MBA Student", city: "Bangalore", area: "Koramangala", emoji: "📚", color: "#34d399",
    bio: "MBA at a Bangalore B-school, case-comp enthusiast, 7am Cubbon Park runner.", focus: "Finance + case prep + family calls" },
];
export const COUSIN = Object.fromEntries(COUSINS.map((c) => [c.id, c])) as Record<string, Cousin>;

export const AVATARS: { emoji: string; level: number }[] = [
  { emoji: "🧑‍💻", level: 1 }, { emoji: "🎧", level: 1 }, { emoji: "🛠️", level: 1 }, { emoji: "🌸", level: 1 }, { emoji: "📚", level: 1 },
  { emoji: "🦊", level: 2 }, { emoji: "🐯", level: 3 }, { emoji: "🦅", level: 4 }, { emoji: "🐉", level: 6 },
  { emoji: "⚡", level: 5 }, { emoji: "🔥", level: 7 }, { emoji: "👑", level: 9 },
];
export const AURAS: { id: string; name: string; level: number; from: string; to: string }[] = [
  { id: "bolt", name: "Bolt Blue", level: 1, from: "#38bdf8", to: "#3b82f6" },
  { id: "storm", name: "Storm Purple", level: 1, from: "#a78bfa", to: "#7c3aed" },
  { id: "volt", name: "Volt Yellow", level: 3, from: "#fde047", to: "#f59e0b" },
  { id: "ember", name: "Ember", level: 5, from: "#fb923c", to: "#ef4444" },
  { id: "aurora", name: "Aurora", level: 8, from: "#34d399", to: "#38bdf8" },
];

const H = (id: string, userId: string, title: string, emoji: string, dim: DimId, xp: number, tag?: string): Habit =>
  ({ id, userId, title, emoji, dim, xp, tag });

export const BASE_HABITS: Habit[] = [
  // shared
  H("water", "all", "Drink 3 litres of water", "💧", "health", 10, "water"),
  H("move", "all", "Move 30 min (walk, yoga, sport)", "🏃", "health", 20, "workout"),
  H("sleep", "all", "Lights out before 11:30 pm", "🌙", "health", 15, "sleep"),
  H("gratitude", "all", "Write one gratitude line", "🙏", "emotional", 10, "journal"),
  H("homefood", "all", "Eat one balanced home-style meal", "🍛", "health", 10, "meal"),
  // Arjun
  H("a-dsa", "arjun", "Solve 1 LeetCode problem", "🧩", "career", 20, "code"),
  H("a-sd", "arjun", "30 min system design reading", "📐", "mind", 20, "study"),
  H("a-gym", "arjun", "Gym or cricket nets session", "🏏", "health", 25, "workout"),
  // Karthik
  H("k-side", "karthik", "45 min on side project", "💡", "creativity", 25, "code"),
  H("k-read", "karthik", "Read 20 pages", "📖", "mind", 15, "read"),
  H("k-bad", "karthik", "Badminton or cycling", "🏸", "health", 20, "workout"),
  // Vignesh
  H("v-cert", "vignesh", "1 hour cert prep (AWS / CKA)", "☁️", "career", 25, "study"),
  H("v-save", "vignesh", "Log today's UPI spends", "📲", "money", 10, "save"),
  H("v-run", "vignesh", "Evening run or Surya Namaskar", "🌅", "health", 20, "workout"),
  // Meghana
  H("m-net", "meghana", "Reach out to 1 professional", "🔗", "career", 15, "network"),
  H("m-hr", "meghana", "Learn 1 HR analytics / labour-law topic", "📊", "mind", 20, "study"),
  H("m-dance", "meghana", "Kuchipudi / painting practice", "💃", "creativity", 20, "hobby"),
  // Ananya
  H("n-case", "ananya", "Solve 1 case / quant set", "📈", "career", 25, "study"),
  H("n-news", "ananya", "Read Mint / ET for 15 min", "📰", "mind", 10, "read"),
  H("n-call", "ananya", "Call family back home", "📞", "family", 15, "family"),
];

export interface ActivityType {
  id: string; label: string; emoji: string; dim: DimId; xp: number; tag: string; hint: string;
}
export const ACTIVITIES: ActivityType[] = [
  { id: "exercise", label: "Exercise", emoji: "🏋️", dim: "health", xp: 30, tag: "workout", hint: "e.g. KBR Park run, Gachibowli badminton, yoga" },
  { id: "study", label: "Study / MBA prep", emoji: "🎓", dim: "mind", xp: 25, tag: "study", hint: "e.g. Marketing case, Finance chapter, GRE words" },
  { id: "upskill", label: "Upskill / code", emoji: "⌨️", dim: "career", xp: 30, tag: "code", hint: "e.g. React course, Kubernetes lab, LeetCode set" },
  { id: "read", label: "Read", emoji: "📚", dim: "mind", xp: 20, tag: "read", hint: "e.g. Atomic Habits ch. 4, Mint Long Reads" },
  { id: "save", label: "Save money", emoji: "🪙", dim: "money", xp: 20, tag: "save", hint: "e.g. Moved ₹2,000 to SIP, cooked instead of ordering" },
  { id: "volunteer", label: "Volunteer", emoji: "🌱", dim: "giving", xp: 40, tag: "volunteer", hint: "e.g. Teaching kids at a NGO, tree planting weekend" },
  { id: "hobby", label: "Hobby / creative", emoji: "🎨", dim: "creativity", xp: 20, tag: "hobby", hint: "e.g. Kolam, guitar, photography, painting" },
  { id: "family", label: "Family time", emoji: "👨‍👩‍👧", dim: "family", xp: 25, tag: "family", hint: "e.g. Dinner with Amma & Nanna, called Paatti" },
  { id: "calm", label: "Meditate / pray", emoji: "🧘", dim: "calm", xp: 15, tag: "calm", hint: "e.g. 10 min meditation, temple visit, pranayama" },
  { id: "cook", label: "Cooked a veg meal", emoji: "🥘", dim: "health", xp: 15, tag: "meal", hint: "e.g. Pesarattu, bisibele bath, millet pongal" },
  { id: "friends", label: "Friends & community", emoji: "🤝", dim: "friends", xp: 20, tag: "friends", hint: "e.g. Coffee with an old friend, meetup group" },
  { id: "explore", label: "Explore something new", emoji: "🧭", dim: "adventure", xp: 25, tag: "explore", hint: "e.g. Trek near Hyderabad, new cafe, Lalbagh walk" },
];

export const DEFAULT_PENALTIES: PenaltyDef[] = [
  { id: "p1", label: "Skipped a workout I committed to", xp: 10, dim: "health", on: true },
  { id: "p2", label: "Junk / outside-food binge", xp: 8, dim: "health", on: true },
  { id: "p3", label: "Doomscrolling for 2+ hours", xp: 6, dim: "calm", on: true },
  { id: "p4", label: "Broke a promise to a cousin", xp: 8, dim: "family", on: true },
  { id: "p5", label: "Impulse purchase over budget", xp: 10, dim: "money", on: true },
  { id: "p6", label: "Stayed up past 1 am", xp: 6, dim: "health", on: true },
];

export const MEALS: { id: string; label: string; emoji: string; balanced?: boolean }[] = [
  { id: "idli", label: "Idli + sambar + chutney", emoji: "🍚", balanced: true },
  { id: "pesarattu", label: "Pesarattu + upma", emoji: "🥞", balanced: true },
  { id: "dosa", label: "Ragi / millet dosa", emoji: "🫓", balanced: true },
  { id: "curdrice", label: "Curd rice + pickle", emoji: "🥣" },
  { id: "meals", label: "Dal, rice, veg curry & rasam", emoji: "🍛", balanced: true },
  { id: "sprouts", label: "Sprouts / chana salad", emoji: "🥗", balanced: true },
  { id: "buttermilk", label: "Buttermilk (majjiga / mor)", emoji: "🥛" },
  { id: "fruit", label: "Seasonal fruit bowl", emoji: "🍌" },
  { id: "treat", label: "Mindful treat (mirchi bajji, gulab jamun…)", emoji: "😋" },
];

export const WORKOUTS = ["Gym", "Yoga", "Surya Namaskar", "Brisk walk", "Running", "Badminton", "Cricket", "Cycling", "Swimming", "Dance", "Home HIIT"];

export const LESSONS: { id: string; title: string; blurb: string }[] = [
  { id: "emerg", title: "Emergency fund 101", blurb: "Aim for 3–6 months of expenses in a liquid fund or savings account." },
  { id: "sip", title: "SIP vs lump-sum", blurb: "Small monthly SIPs in index funds beat waiting for the 'perfect time'." },
  { id: "cc", title: "Credit card traps", blurb: "Always pay the full bill. Revolving interest can cross 40% a year." },
  { id: "tax", title: "Old vs new tax regime", blurb: "Compare deductions (80C, HRA) with the lower new-regime slabs before choosing." },
  { id: "upi", title: "UPI budgeting", blurb: "Use monthly UPI summaries to tag needs, wants and savings." },
  { id: "ppf", title: "PPF, EPF & NPS basics", blurb: "Long-term, tax-efficient, low-risk buckets of your portfolio." },
];

export const CAREER_QUICK: Record<string, { id: string; label: string; emoji: string; xp: number; dim: DimId; tag: string }[]> = {
  arjun: [
    { id: "dsa", label: "Solved a DSA problem", emoji: "🧩", xp: 10, dim: "career", tag: "code" },
    { id: "sd", label: "Studied a system-design topic", emoji: "📐", xp: 15, dim: "mind", tag: "study" },
    { id: "pr", label: "Merged a meaningful PR", emoji: "🔀", xp: 20, dim: "career", tag: "code" },
  ],
  karthik: [
    { id: "commit", label: "Shipped a side-project feature", emoji: "🚢", xp: 20, dim: "creativity", tag: "code" },
    { id: "talk", label: "Learned from a tech talk / blog", emoji: "🎤", xp: 10, dim: "mind", tag: "study" },
    { id: "oss", label: "Open-source contribution", emoji: "🌍", xp: 25, dim: "career", tag: "code" },
  ],
  vignesh: [
    { id: "lab", label: "Finished a cloud lab", emoji: "☁️", xp: 15, dim: "career", tag: "code" },
    { id: "mock", label: "Took a mock exam", emoji: "📝", xp: 20, dim: "mind", tag: "study" },
    { id: "iac", label: "Automated something with IaC", emoji: "⚙️", xp: 20, dim: "career", tag: "code" },
  ],
  meghana: [
    { id: "net", label: "Networked with a professional", emoji: "🔗", xp: 10, dim: "career", tag: "network" },
    { id: "hr", label: "Studied an HR / people-analytics topic", emoji: "📊", xp: 15, dim: "mind", tag: "study" },
    { id: "mentor", label: "Mentored or coached someone", emoji: "🌟", xp: 25, dim: "giving", tag: "network" },
  ],
  ananya: [
    { id: "case", label: "Solved a case study", emoji: "📈", xp: 15, dim: "career", tag: "study" },
    { id: "mba", label: "1 hour MBA study block", emoji: "🎓", xp: 12, dim: "mind", tag: "study" },
    { id: "alumni", label: "Spoke with an alum / recruiter", emoji: "🎯", xp: 15, dim: "career", tag: "network" },
  ],
};

export const PLACES = [
  "Hussain Sagar lakeside", "Chutneys, Banjara Hills", "Ram Ki Bandi, Gachibowli", "Shilparamam", "Durgam Cheruvu",
  "Charminar evening + Irani chai", "Lamakaan", "Wonderla Hyderabad", "Nandi Hills sunrise", "MTR, Bangalore",
  "Lalbagh Botanical Garden", "Cubbon Park", "Home – Sunday lunch", "Prasads IMAX", "Kakatiya Cafe",
];
export const MEETUP_KINDS = ["Veg dinner", "Outing", "Trip", "Festival", "Game night", "Workout together", "Study jam", "Movie", "Birthday"];
