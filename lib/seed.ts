import { ACTIVITIES, BASE_HABITS, COUSINS, DEFAULT_PENALTIES, DIMS, MEALS } from "./catalog";
import type { Challenge, DimId, GameState, HealthDay, LogEntry } from "./types";
import { addDays, mulberry32, monthStart, parseD, today, weekStart } from "./utils";

const CONSISTENCY: Record<string, number> = { arjun: 0.78, karthik: 0.62, vignesh: 0.55, meghana: 0.74, ananya: 0.7 };

const SELF: Record<string, Partial<Record<DimId, number>>> = {
  arjun: { health: 6, mind: 7, career: 7, money: 5, family: 6, creativity: 4, calm: 4 },
  karthik: { health: 5, mind: 7, career: 6, creativity: 8, money: 4, adventure: 6 },
  vignesh: { health: 5, career: 7, money: 6, mind: 6, friends: 5, calm: 5 },
  meghana: { friends: 8, creativity: 8, emotional: 7, career: 6, giving: 6, family: 7 },
  ananya: { mind: 8, career: 7, money: 7, family: 6, health: 6, vision: 7 },
};

export function makeSeed(): GameState {
  const rnd = mulberry32(2025);
  const t = today();
  const logs: LogEntry[] = [];
  let n = 0;
  const push = (l: Omit<LogEntry, "id" | "ts">, hour = 9) => {
    const d = parseD(l.date);
    d.setHours(hour, Math.floor(rnd() * 59));
    // never in the future: today's seeded actions happened within the last few hours
    const ts = Math.min(d.getTime(), Date.now() - Math.floor(rnd() * 3 * 3600_000) - 60_000);
    logs.push({ ...l, id: `s${n++}`, ts });
  };

  const health: GameState["health"] = {};
  const mood: GameState["mood"] = {};

  for (const c of COUSINS) {
    health[c.id] = {};
    mood[c.id] = {};
    const habits = BASE_HABITS.filter((h) => h.userId === "all" || h.userId === c.id);
    for (let i = 34; i >= 0; i--) {
      const date = addDays(t, -i);
      const isToday = i === 0;
      // a couple of natural "off" days, so streaks look real
      const skipDay = !isToday && rnd() < (1 - CONSISTENCY[c.id]) * 0.4;
      if (skipDay) continue;
      const p = isToday ? CONSISTENCY[c.id] * 0.5 : CONSISTENCY[c.id];
      if (isToday && c.id === "arjun") continue; // the default player starts today fresh
      habits.forEach((h, k) => {
        if (rnd() < p) push({ userId: c.id, date, label: h.title, xp: h.xp, dim: h.dim, kind: "habit", tag: h.tag, ref: `h:${h.id}:${date}` }, 7 + k);
      });
      if (!isToday && rnd() < 0.45) {
        const a = ACTIVITIES[Math.floor(rnd() * ACTIVITIES.length)];
        push({ userId: c.id, date, label: a.label, xp: a.xp, dim: a.dim, kind: "activity", tag: a.tag }, 19);
      }
      if (i < 14) {
        const base = 3 + (rnd() < 0.55 ? 1 : 0) - (rnd() < 0.18 ? 1 : 0);
        mood[c.id][date] = { mood: Math.min(5, base + (rnd() < 0.15 ? 1 : 0)), energy: Math.max(1, Math.min(5, base + Math.round(rnd() * 2 - 1))) };
      }
      if (i < 10) {
        const hd: HealthDay = {
          water: 4 + Math.floor(rnd() * 6),
          sleep: Math.round((5.5 + rnd() * 3) * 2) / 2,
          meals: MEALS.filter(() => rnd() < 0.3).map((m) => m.id).slice(0, 3),
          workouts: rnd() < 0.6 ? [{ type: ["Gym", "Yoga", "Running", "Badminton", "Brisk walk"][Math.floor(rnd() * 5)], mins: 20 + Math.floor(rnd() * 5) * 10 }] : [],
        };
        if (!isToday || c.id !== "arjun") health[c.id][date] = hd;
      }
    }
  }

  // meetups
  const meetups: GameState["meetups"] = [
    { id: "mt1", date: addDays(t, -31), place: "Chutneys, Banjara Hills", kind: "Veg dinner", attendees: ["arjun", "karthik", "vignesh", "meghana"], note: "Steamed dosa debate, round 47. Karthik still wrong.", xpEach: 50 },
    { id: "mt2", date: addDays(t, -19), place: "Nandi Hills sunrise", kind: "Trip", attendees: ["arjun", "karthik", "vignesh", "meghana", "ananya"], note: "Full squad! 4am start, worth every yawn.", xpEach: 110 },
    { id: "mt3", date: addDays(t, -9), place: "Ram Ki Bandi, Gachibowli", kind: "Outing", attendees: ["arjun", "vignesh", "meghana"], note: "Midnight butter dosa after Meghana's promotion news 🎉", xpEach: 40 },
    { id: "mt4", date: addDays(t, -3), place: "Home – Sunday lunch", kind: "Festival", attendees: ["arjun", "karthik", "meghana"], note: "Video-called Ananya during the payasam round.", xpEach: 40 },
  ];
  for (const m of meetups) for (const a of m.attendees)
    push({ userId: a, date: m.date, label: `Meetup: ${m.place}`, xp: m.xpEach, dim: "family", kind: "meetup", tag: "family", ref: `mt:${m.id}:${a}` }, 20);

  const memories: GameState["memories"] = [
    { id: "me1", meetupId: "mt2", date: addDays(t, -19), emoji: "🌄", title: "Nandi Hills sunrise", caption: "Ananya took the 2am bus from Koramangala just to beat us to the viewpoint.", by: "ananya", cheers: ["arjun", "meghana", "karthik"] },
    { id: "me2", meetupId: "mt1", date: addDays(t, -31), emoji: "🫓", title: "The Great Dosa Debate", caption: "Ghee roast vs. MLA pesarattu. No winner. Only fuller stomachs.", by: "karthik", cheers: ["vignesh"] },
    { id: "me3", meetupId: "mt3", date: addDays(t, -9), emoji: "🎉", title: "Promotion night", caption: "Meghana is now Senior Talent Partner! Butter dosa toast at 12:40 am.", by: "arjun", cheers: ["meghana", "vignesh", "ananya", "karthik"] },
    { id: "me4", date: addDays(t, -55), emoji: "🪔", title: "Diwali at Ammamma's", caption: "Rangoli competition: Meghana 1, everyone else 0.", by: "meghana", cheers: ["ananya"] },
  ];

  const ws = weekStart(t);
  const ms = monthStart(t);
  const wEnd = addDays(ws, 6);
  const mEnd = addDays(monthStart(addDays(ms, 32)), -1);
  const ch = (c: Omit<Challenge, "completedBy">): Challenge => ({ ...c, completedBy: [] });
  const challenges: Challenge[] = [
    ch({ id: "c1", title: "Leetcode Lightning", desc: "Solve 7 coding problems this week. Any platform counts.", emoji: "🧩", period: "weekly", scope: "solo", dim: "career", xp: 120, target: 7, unit: "problems", participants: ["arjun", "karthik", "vignesh"], progress: { arjun: 3, karthik: 5, vignesh: 2 }, createdBy: "arjun", endsOn: wEnd }),
    ch({ id: "c2", title: "No-Junk Week", desc: "5 days without ordering junk food. Home food, tiffin centres and treats with family are all fine.", emoji: "🥗", period: "weekly", scope: "solo", dim: "health", xp: 100, target: 5, unit: "days", participants: ["arjun", "meghana", "ananya", "vignesh"], progress: { arjun: 2, meghana: 3, ananya: 4, vignesh: 1 }, createdBy: "meghana", endsOn: wEnd }),
    ch({ id: "c3", title: "Squad Steps: Hyderabad → Bangalore", desc: "Walk 570 km together, the distance between our cities. Log km as a team.", emoji: "🗺️", period: "monthly", scope: "squad", dim: "health", xp: 200, target: 570, unit: "km", participants: ["arjun", "karthik", "vignesh", "meghana", "ananya"], progress: { arjun: 92, karthik: 61, vignesh: 48, meghana: 77, ananya: 104 }, createdBy: "ananya", endsOn: mEnd }),
    ch({ id: "c4", title: "Reading Marathon", desc: "Read 300 pages as a squad this month. Novels, Mint long-reads, anything.", emoji: "📚", period: "monthly", scope: "squad", dim: "mind", xp: 150, target: 300, unit: "pages", participants: ["karthik", "meghana", "ananya"], progress: { karthik: 84, meghana: 40, ananya: 66 }, createdBy: "karthik", endsOn: mEnd }),
    ch({ id: "c5", title: "MBA Sprint: 10 Case Studies", desc: "Crack 10 cases before placement season. Cousins can cheer and quiz.", emoji: "📈", period: "monthly", scope: "solo", dim: "career", xp: 180, target: 10, unit: "cases", participants: ["ananya"], progress: { ananya: 6 }, createdBy: "ananya", endsOn: mEnd }),
    ch({ id: "c6", title: "Hydration Station", desc: "Drink 8 glasses of water today.", emoji: "💧", period: "daily", scope: "solo", dim: "health", xp: 25, target: 8, unit: "glasses", participants: ["arjun", "karthik", "vignesh", "meghana", "ananya"], progress: { karthik: 5, meghana: 6, ananya: 3 }, createdBy: "meghana", endsOn: t }),
    ch({ id: "c7", title: "Plan the Next Trip", desc: "Each cousin suggests 1 destination + 1 date. Coorg? Araku? Gokarna?", emoji: "🏕️", period: "weekly", scope: "squad", dim: "adventure", xp: 60, target: 5, unit: "ideas", participants: ["arjun", "karthik", "vignesh", "meghana", "ananya"], progress: { meghana: 1, ananya: 1 }, createdBy: "vignesh", endsOn: wEnd }),
  ];

  const goals: GameState["goals"] = [
    { id: "g1", userId: "arjun", title: "Crack 150 LeetCode problems", dim: "career", cat: "career", current: 96, target: 150, unit: "problems", xpPerStep: 4, due: addDays(t, 75) },
    { id: "g2", userId: "arjun", title: "Run the Hyderabad 10K", dim: "health", cat: "health", current: 6, target: 10, unit: "km long run", xpPerStep: 15, due: addDays(t, 50) },
    { id: "g3", userId: "arjun", title: "Read 12 books this year", dim: "mind", cat: "learning", current: 7, target: 12, unit: "books", xpPerStep: 30, due: addDays(t, 70) },
    { id: "g4", userId: "karthik", title: "Launch side project v1 (expense splitter)", dim: "creativity", cat: "career", current: 14, target: 20, unit: "features", xpPerStep: 15, due: addDays(t, 30) },
    { id: "g5", userId: "vignesh", title: "AWS Solutions Architect – Associate", dim: "career", cat: "career", current: 18, target: 30, unit: "study modules", xpPerStep: 12, due: addDays(t, 40) },
    { id: "g6", userId: "vignesh", title: "Emergency fund: ₹1.5 lakh", dim: "money", cat: "finance", current: 92000, target: 150000, unit: "₹", xpPerStep: 0, due: addDays(t, 120) },
    { id: "g7", userId: "meghana", title: "SHRM-CP certification", dim: "career", cat: "career", current: 9, target: 16, unit: "chapters", xpPerStep: 15, due: addDays(t, 60) },
    { id: "g8", userId: "meghana", title: "Perform at the Ugadi showcase", dim: "creativity", cat: "hobby", current: 5, target: 12, unit: "rehearsals", xpPerStep: 15, due: addDays(t, 150) },
    { id: "g9", userId: "ananya", title: "Summer internship shortlists", dim: "career", cat: "career", current: 2, target: 5, unit: "shortlists", xpPerStep: 40, due: addDays(t, 45) },
    { id: "g10", userId: "ananya", title: "CFA Level 1 readings", dim: "mind", cat: "learning", current: 4, target: 10, unit: "readings", xpPerStep: 20, due: addDays(t, 90) },
  ];

  const savings: GameState["savings"] = [];
  const sv = [
    ["arjun", 3000, "SIP – Nifty 50 index"], ["arjun", 1200, "Cooked all week, skipped Swiggy"], ["vignesh", 5000, "Emergency fund top-up"],
    ["vignesh", 2500, "Sold old monitor"], ["meghana", 2000, "RD instalment"], ["karthik", 1500, "Cancelled unused OTT subs"],
    ["ananya", 800, "Mess food over cafes"], ["ananya", 2000, "Stipend → liquid fund"], ["meghana", 1000, "Gold SIP"],
  ] as const;
  sv.forEach(([u, a, note], i) => {
    const date = addDays(t, -2 - i * 3);
    savings.push({ id: `sv${i}`, userId: u, date, amount: a, note });
    push({ userId: u, date, label: `Saved ₹${a}: ${note}`, xp: Math.min(30, Math.round(a / 100)), dim: "money", kind: "money", tag: "save" }, 21);
  });

  const gratitude: GameState["gratitude"] = [
    { id: "gr1", userId: "arjun", date: addDays(t, -1), text: "Amma packed extra pulihora for my team lunch." },
    { id: "gr2", userId: "ananya", date: addDays(t, -1), text: "Group project actually came together at 2am. Grateful for patient teammates." },
    { id: "gr3", userId: "meghana", date: addDays(t, -2), text: "A candidate I placed sent a thank-you note." },
    { id: "gr4", userId: "arjun", date: addDays(t, -3), text: "Rain on the ORR drive back with the windows down." },
    { id: "gr5", userId: "karthik", date: addDays(t, -2), text: "Badminton win after 3 weeks of losing to Vignesh." },
  ];

  const selfRatings = Object.fromEntries(COUSINS.map((c) => [c.id, Object.fromEntries(DIMS.map((d) => [d.id, SELF[c.id][d.id] ?? 5]))])) as GameState["selfRatings"];

  return {
    v: 1,
    activeId: "arjun",
    logs: logs.sort((a, b) => a.ts - b.ts),
    todos: [
      { id: "td1", userId: "arjun", title: "Book train tickets for Ananya's Bangalore weekend", dim: "family", xp: 15, done: false, created: t },
      { id: "td2", userId: "arjun", title: "Finish the design doc for the payments service", dim: "career", xp: 20, done: false, created: t },
      { id: "td3", userId: "ananya", title: "Submit marketing assignment", dim: "career", xp: 20, done: false, created: t },
    ],
    customHabits: [],
    hiddenHabits: [],
    challenges,
    meetups,
    memories,
    goals,
    health,
    mood,
    gratitude,
    reviews: [],
    savings,
    lessons: { arjun: ["emerg"], vignesh: ["emerg", "sip", "tax"], ananya: ["sip", "cc", "emerg", "upi"], meghana: ["cc"], karthik: [] },
    duels: [
      { id: "d1", a: "arjun", b: "karthik", metric: "xp", period: "week", stake: "Loser buys Kakatiya filter coffee ☕", start: ws },
      { id: "d2", a: "meghana", b: "ananya", metric: "days", period: "month", stake: "Loser plans the next outing 🗓️", start: ms },
    ],
    penalties: DEFAULT_PENALTIES,
    settings: { penaltiesOn: true, penaltyCap: 20, liveSim: true },
    badges: {},
    levelSeen: {},
    notifs: [
      { id: "n0", ts: Date.now() - 3600_000, icon: "⛈️", title: "Welcome to Thunderstorms 'n' All!", body: "Complete today's quests, keep your streak, and out-thunder your cousins.", read: false },
    ],
    avatars: Object.fromEntries(COUSINS.map((c, i) => [c.id, { emoji: c.emoji, aura: i % 2 ? "storm" : "bolt" }])),
    selfRatings,
    restDays: {},
    boxOpened: {},
    savingsTarget: { arjun: 10000, karthik: 8000, vignesh: 15000, meghana: 10000, ananya: 5000 },
  };
}
