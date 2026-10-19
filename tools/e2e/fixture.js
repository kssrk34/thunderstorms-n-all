// A schema-3 database shaped like production's: 4 real cousins, ~18 days of mixed history from the current live version.
const { scryptSync, randomBytes } = require("crypto");
const fs = require("fs");
const path = require("path");
const out = path.join(process.env.E2E_DATA_DIR || path.join(__dirname, "data"), "thunderstorms.json");
const hash = (pw) => { const salt = randomBytes(16); const key = scryptSync(pw.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }); return `scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`; };
const pad = (n) => String(n).padStart(2, "0");
const ist = (ms = Date.now()) => new Date(ms + 330 * 60000);
const day = (k) => { const d = ist(Date.now() - k * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const ts = (k, h = 9) => Date.parse(`${day(k)}T${pad(h)}:15:00+05:30`);
let n = 0; const id = () => "l" + (++n).toString(36).padStart(6, "0");
const pw = hash("testpass123");
const created = Date.now() - 20 * 86400000;
const U = [
  { id: "u1asha", username: "asha", name: "Asha Reddy", role: "admin", emoji: "⛅", color: "#4C7DFF", interests: ["Fitness", "Reading"] },
  { id: "u2bala", username: "bala", name: "Bala Krishna", role: "member", emoji: "⚡", color: "#6D6AE8", interests: [] },
  { id: "u3chit", username: "chitra", name: "Chitra", role: "member", emoji: "🌙", color: "#2E9FB3", interests: ["Music"] },
  { id: "u4dev", username: "dev", name: "Dev Varma", role: "member", emoji: "🌿", color: "#34A37B", interests: [] },
].map((u, i) => ({ ...u, passHash: pw, onboarded: true, createdAt: created + i * 3600000, ...(i ? { invitedBy: "u1asha" } : {}) }));
const habits = [
  { id: "h1run", userId: "u1asha", title: "Morning run", emoji: "🏃", dim: "health", xp: 25, created: day(18) },
  { id: "h1read", userId: "u1asha", title: "Read 10 pages", emoji: "📖", dim: "mind", xp: 15, created: day(18) },
  { id: "h1med", userId: "u1asha", title: "Meditate", emoji: "🧘", dim: "calm", xp: 10, created: day(12) },
  { id: "h2gym", userId: "u2bala", title: "Gym session", emoji: "🏃", dim: "health", xp: 25, created: day(17) },
  { id: "h2code", userId: "u2bala", title: "LeetCode problem", emoji: "💻", dim: "career", xp: 15, created: day(17) },
  { id: "h3call", userId: "u3chit", title: "Call Ammamma", emoji: "📞", dim: "family", xp: 10, created: day(16) },
  { id: "h3water", userId: "u3chit", title: "Drink 8 glasses of water", emoji: "💧", dim: "health", xp: 10, created: day(16) },
  { id: "h3jour", userId: "u3chit", title: "Journal", emoji: "🌙", dim: "emotional", xp: 10, created: day(16) },
  { id: "h4walk", userId: "u4dev", title: "Walk 20 minutes", emoji: "🚶", dim: "health", xp: 10, created: day(15) },
  { id: "h4save", userId: "u4dev", title: "No impulse buys", emoji: "🪙", dim: "money", xp: 15, created: day(15) },
];
const rate = { u1asha: 0.85, u2bala: 0.7, u3chit: 0.55, u4dev: 0.4 };
const logs = [];
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (const h of habits) {
  for (let k = 18; k >= 1; k--) {
    if (day(k) < h.created) continue;
    if (rnd() < rate[h.userId]) logs.push({ id: id(), userId: h.userId, ts: ts(k, 7 + (k % 5)), date: day(k), label: h.title, xp: h.xp, dim: h.dim, kind: "habit", ref: `h:${h.id}:${day(k)}` });
  }
}
// today: Asha already ran
logs.push({ id: id(), userId: "u1asha", ts: Date.now() - 3600000, date: day(0), label: "Morning run", xp: 25, dim: "health", kind: "habit", ref: `h:h1run:${day(0)}` });
const extra = [
  ["u1asha", 3, "Exercise: KBR Park run", 30, "health", "activity", "workout"],
  ["u2bala", 2, "Upskill: system design module", 45, "career", "activity", "code"],
  ["u3chit", 5, "Hobby: guitar practice", 20, "creativity", "activity", "hobby"],
  ["u4dev", 4, "Explore: Nandi Hills trek", 50, "adventure", "activity", "explore"],
  ["u1asha", 6, "Did a focused deep-work session", 15, "career", "career", "code"],
  ["u4dev", 3, "Saved ₹2,000: skipped Swiggy all week", 20, "money", "money", "save"],
  ["u3chit", 2, "Mood check-in", 5, "emotional", "reflect", undefined],
  ["u3chit", 2, "Gratitude journal", 10, "emotional", "reflect", "journal"],
  ["u2bala", 1, "Daily spark", 20, "emotional", "bonus", undefined],
  ["u1asha", 4, "Daily spark: a lightning strike", 75, "emotional", "bonus", undefined],
  ["u2bala", 5, "Restful sleep (7–9 h)", 15, "health", "health", "sleep"],
  ["u4dev", 2, "Doomscrolling for 2+ hours (bad night)", -6, "calm", "penalty", undefined],
];
for (const [u, k, label, xp, dim, kind, tag] of extra) logs.push({ id: id(), userId: u, ts: ts(k, 19), date: day(k), label, xp, dim, kind, ...(tag ? { tag } : {}), ...(kind === "bonus" ? { ref: `box:${day(k)}` } : {}) });
const todos = [
  { id: "t1dent", userId: "u1asha", title: "Book the dentist", emoji: "✨", dim: "health", xp: 15, done: true, doneOn: day(3), created: day(9) },
  { id: "t1tax", userId: "u1asha", title: "File ITR", emoji: "🪙", dim: "money", xp: 25, done: false, created: day(10) },
  { id: "t2cv", userId: "u2bala", title: "Update resume", emoji: "💻", dim: "career", xp: 25, done: false, created: day(2) },
];
logs.push({ id: id(), userId: "u1asha", ts: ts(3, 18), date: day(3), label: "Book the dentist", xp: 15, dim: "health", kind: "todo", ref: "todo:t1dent" });
const goals = [
  { id: "g1books", userId: "u1asha", title: "Read 12 books this year", dim: "mind", current: 3, target: 12, unit: "books", xpPerStep: 10, created: day(18) },
  { id: "g4fund", userId: "u4dev", title: "Emergency fund", dim: "money", current: 40000, target: 150000, unit: "₹", xpPerStep: 10, created: day(15) },
  { id: "g3vision", userId: "u3chit", title: "Figure out my next five years", dim: "vision", current: 0, xpPerStep: 10, created: day(14) },
];
const challenges = [{ id: "c1call", title: "Call the grandparents", desc: "Everyone calls a grandparent at least once.", emoji: "📞", period: "weekly", scope: "squad", dim: "family", xp: 100, target: 5, unit: "calls", participants: ["u1asha", "u2bala", "u3chit", "u4dev"], progress: { u1asha: 1, u3chit: 2 }, completedBy: [], createdBy: "u3chit", endsOn: day(-2) }];
const meetups = [{ id: "m1lunch", date: day(7), place: "Home, Sunday lunch", kind: "Dinner", attendees: ["u1asha", "u3chit", "u4dev"], note: "Pesarattu marathon", xpEach: 40, by: "u3chit" }];
for (const p of meetups[0].attendees) logs.push({ id: id(), userId: p, ts: ts(7, 14), date: day(7), label: "Meetup: Home, Sunday lunch", xp: 40, dim: "family", kind: "meetup", tag: "family", ref: `mt:m1lunch:${p}` });
const db = {
  schema: 3, rev: 412, meta: { createdAt: created }, users: U, sessions: [], invites: [], resets: [],
  game: {
    v: 3, logs, todos, habits, challenges, meetups,
    memories: [{ id: "mem1", meetupId: "m1lunch", date: day(7), emoji: "🍛", title: "Home, Sunday lunch", caption: "Ammamma's pesarattu, round three", by: "u3chit", cheers: ["u1asha"] }],
    goals, health: { u2bala: { [day(5)]: { water: 4, sleep: 8, meals: [], workouts: [] } } }, mood: { u3chit: { [day(2)]: { mood: 4, energy: 3, note: "okay" } } },
    gratitude: [{ id: "gr1", userId: "u3chit", date: day(2), text: "Rain after a hot week" }], reviews: [],
    savings: [{ id: "sv1", userId: "u4dev", date: day(3), amount: 2000, note: "skipped Swiggy all week" }], lessons: {},
    duels: [{ id: "d1", a: "u2bala", b: "u1asha", metric: "xp", period: "week", stake: "Loser buys filter coffee", start: day(2) }],
    penalties: [{ id: "p3", label: "Doomscrolling for 2+ hours", xp: 6, dim: "calm", on: true }], settings: { penaltiesOn: true, penaltyCap: 20 },
    badges: { u1asha: { spark: created + 86400000, static: created + 3 * 86400000, rod: created + 8 * 86400000 }, u2bala: { spark: created + 86400000, static: created + 4 * 86400000 }, u3chit: { spark: created + 2 * 86400000, reflect: created + 9 * 86400000 }, u4dev: { spark: created + 2 * 86400000, honest: created + 18 * 86400000 } },
    levelSeen: { u1asha: 3, u2bala: 3, u3chit: 2, u4dev: 2 },
    notifs: [{ id: "n1", ts: ts(7, 14), icon: "users", title: "Cousin meetup logged", body: "Home, Sunday lunch: +40 XP each" }], notifsSeen: {},
    selfRatings: { u1asha: { health: 8, mind: 6 } }, restDays: { u2bala: [day(9)] }, boxOpened: { u2bala: day(1) }, savingsTarget: { u4dev: 10000 },
  },
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(db));
console.log(`wrote ${out}: ${logs.length} logs, ${habits.length} habits`);
