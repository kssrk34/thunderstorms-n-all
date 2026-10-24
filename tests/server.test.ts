import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAction, type Action } from "../lib/reducer";
import { toStored } from "../lib/seed";
import type { DB, UserRecord } from "../lib/server/db";
import { migrate } from "../lib/server/migrations";
import { defaultKinds, enqueue } from "../lib/server/notify";
import type { NotifyPrefs } from "../lib/types";
import { fullGame, viewFor } from "../lib/server/view";
import { today } from "../lib/utils";
import { A, B, ago, squad } from "./helpers";

function user(id: string, name: string, extra: Partial<UserRecord> = {}): UserRecord {
  return { id, username: name.toLowerCase(), name, passHash: "x", role: id === A ? "admin" : "member", emoji: "⚡", color: "#4C8DFF", onboarded: true, createdAt: Date.now() - 30 * 86_400_000, ...extra };
}
function db(): DB {
  return { schema: 7, rev: 1, meta: { createdAt: 0 }, users: [user(A, "Asha"), user(B, "Bala")], sessions: [], invites: [], resets: [], outbox: [], game: toStored({ ...squad(), members: [] }) };
}
function act(d: DB, me: string, ...actions: Action[]) {
  let g = fullGame(d);
  for (const a of actions) g = applyAction(g, a, me);
  d.game = toStored(g);
  d.rev++;
}

test("migration 4 maps twelve areas onto ten dimensions and keeps every real item", () => {
  const raw = {
    schema: 3, rev: 9, meta: { createdAt: 1 }, users: [user(A, "Asha"), user(B, "Bala")], sessions: [], invites: [], resets: [],
    game: {
      v: 3, logs: [
        { id: "l1", userId: A, ts: Date.now(), date: ago(1), label: "Read 10 pages", xp: 15, dim: "mind", kind: "habit", ref: `h:h1:${ago(1)}` },
        { id: "l2", userId: A, ts: Date.now(), date: ago(1), label: "Book dentist", xp: 15, dim: "health", kind: "todo", ref: "todo:t1" },
        { id: "l3", userId: B, ts: Date.now(), date: ago(2), label: "Saved ₹500: skipped Swiggy", xp: 5, dim: "money", kind: "money" },
        { id: "l4", userId: B, ts: Date.now(), date: ago(2), label: "Meditate", xp: 15, dim: "calm", kind: "activity", tag: "calm" },
        { id: "l5", userId: B, ts: Date.now(), date: ago(40), label: "Old run", xp: 15, dim: "health", kind: "habit" },
      ],
      habits: [{ id: "h1", userId: A, title: "Read 10 pages", emoji: "📖", dim: "mind", xp: 15, created: ago(20) }],
      todos: [{ id: "t1", userId: A, title: "Book dentist", dim: "health", xp: 15, done: true, doneOn: ago(1), created: ago(5) }],
      goals: [{ id: "g1", userId: A, title: "Purpose", dim: "vision", current: 3, xpPerStep: 10, target: 10, unit: "steps", created: ago(9) }],
      challenges: [{ id: "c1", title: "Family calls", desc: "", emoji: "📞", period: "weekly", scope: "squad", dim: "family", xp: 100, target: 5, unit: "calls", participants: [A, B], progress: {}, completedBy: [], createdBy: A, endsOn: today() }],
      duels: [{ id: "d1", a: A, b: B, metric: "xp", period: "week", stake: "Filter coffee", start: ago(2) }],
      meetups: [], memories: [], health: {}, mood: {}, gratitude: [], reviews: [], savings: [], lessons: {}, penalties: [], settings: { penaltiesOn: true, penaltyCap: 20 },
      badges: {}, levelSeen: {}, notifs: [{ id: "n1", ts: 1, icon: "users", title: "Meetup logged", body: "+30 XP each" }], notifsSeen: {}, selfRatings: {}, restDays: {}, boxOpened: {}, savingsTarget: {},
    },
  };
  const out = migrate(structuredClone(raw), 4) as DB & { game: { duels?: unknown } };
  assert.equal(out.schema, 4);
  assert.equal(out.game.habits[0].dim, "intellectual");
  assert.equal(out.game.habits[0].icon, "book");
  assert.equal(out.game.goals[0].dim, "character", "Life Vision is calculated now, so its items move to Character");
  assert.equal(out.game.goals[0].peak, 3);
  assert.equal(out.game.challenges[0].dim, "social");
  assert.equal(out.game.challenges[0].track, "manual");
  assert.equal(out.game.challenges[0].startsOn, ago(6));
  assert.deepEqual(out.game.logs.map((l) => l.dim), ["intellectual", "health", "financial", "spiritual", "health"]);
  assert.deepEqual(out.game.logs.map((l) => !!l.private), [false, true, true, false, false]);
  assert.equal(out.game.todos[0].private, true);
  assert.equal(out.game.rivalries[0].metric, "aura");
  assert.equal(out.game.rivalries[0].end, ago(-4));
  assert.equal(out.game.duels, undefined);
  assert.equal(out.game.notifs[0].body, "+30 Aura Points each");
  // the feed starts from recent, shareable things only (no private to-dos, no money, nothing older than two weeks)
  assert.deepEqual(out.game.feed.map((e) => e.text).sort(), ["completed Read 10 pages", "logged meditate"]);
  assert.equal(out.game.logs.length, raw.game.logs.length);
  assert.deepEqual(out.users, raw.users);
});

test("other cousins see aggregates, never private details", () => {
  const d = db();
  d.users[0].notify = { phone: "+919876543210", phoneVerified: true, whatsapp: true, push: false, kinds: defaultKinds(), quietStart: 22, quietEnd: 8, dailyLimit: 3, reminderHour: 9 };
  act(d, A,
    { t: "habitAdd", id: "habit0001", habit: { title: "Evening walk", dim: "health", xp: 20 } },
    { t: "habitAdd", id: "habit0002", habit: { title: "Therapy homework", dim: "emotional", xp: 20 } },
    { t: "todoAdd", id: "todo00001", todo: { title: "Call the lawyer", dim: "character", xp: 20, private: true } },
    { t: "goalAdd", id: "goal00001", g: { title: "Emergency fund", dim: "financial", target: 100000, unit: "₹", private: false } },
    { t: "goalAdd", id: "goal00002", g: { title: "Secret goal", dim: "career", private: true } },
    { t: "habit", habitId: "habit0001" }, { t: "habit", habitId: "habit0002" }, { t: "todo", id: "todo00001" },
    { t: "goalStep", id: "goal00001", amount: 25000 },
    { t: "activity", id: "actv00001", activityId: "save", minutes: 30, note: "skipped Swiggy, saved ₹600" },
  );
  const v = viewFor(d, B);
  const json = JSON.stringify(v);
  for (const secret of ["Therapy", "lawyer", "Secret goal", "Swiggy", "₹600", '"current":25000', '"target":100000', "9876543210"]) {
    assert.ok(!json.includes(secret), `${secret} leaked to a cousin`);
  }
  assert.equal(v.game.habits.length, 0);
  assert.equal(v.game.todos.length, 0);
  const fund = v.game.goals.find((g) => g.id === "goal00001")!;
  assert.deepEqual([fund.current, fund.target, fund.unit], [25, 100, "%"]);
  assert.ok(json.includes("Evening walk"), "shared quests stay visible");
  assert.ok(v.stats[A].b7.health !== undefined, "aggregated progress is shared");
  // totals still add up: cousins get the amounts and dimensions, just not the labels
  const aura = (logs: typeof v.game.logs) => logs.filter((l) => l.userId === A).reduce((x, l) => x + l.xp, 0);
  assert.equal(aura(v.game.logs), aura(viewFor(d, A).game.logs));
  // and the owner sees everything
  const mine = JSON.stringify(viewFor(d, A));
  for (const s of ["Therapy", "lawyer", "Secret goal", "Swiggy"]) assert.ok(mine.includes(s));
});

test("personal notifications only reach their recipient", () => {
  const d = db();
  act(d, A, { t: "rivalCreate", id: "rival0001", r: { title: "Most Aura this week", metric: "aura", participants: [B], stake: "Filter coffee" } });
  assert.equal(viewFor(d, B).game.notifs.length, 1);
  assert.equal(viewFor(d, A).game.notifs.length, 0);
  assert.equal(viewFor(d, B).game.notifs[0].to, undefined, "recipient lists aren't sent to clients");
});

test("notifications respect opt-in, dedupe, the daily limit and quiet hours, and never fake delivery", () => {
  const d = db();
  const msg = (k: string) => ({ kind: "habits" as const, dedupe: k, body: "Your daily quests are waiting.", template: { name: "tna_daily_quests", params: ["Asha", "2", "40"] } });
  assert.equal(enqueue(d, A, msg("a")).length, 0, "nothing goes out without opting in");

  d.users[0].notify = { phone: "+919876543210", phoneVerified: false, whatsapp: true, push: false, kinds: defaultKinds(), quietStart: 22, quietEnd: 8, dailyLimit: 2, reminderHour: 9 };
  const noonIST = Date.parse(`${today()}T12:00:00+05:30`);
  const [first] = enqueue(d, A, msg("a"), noonIST);
  assert.equal(first.status, "simulated", "without WhatsApp credentials it's a labelled preview");
  assert.equal(enqueue(d, A, msg("a"), noonIST).length, 0, "the same event never queues twice");
  enqueue(d, A, msg("b"), noonIST);
  const [third] = enqueue(d, A, msg("c"), noonIST);
  assert.equal(third.status, "skipped");
  assert.match(third.error!, /Daily limit/);

  d.users[0].notify!.kinds.habits = false;
  assert.equal(enqueue(d, A, msg("d"), noonIST).length, 0, "kinds can be switched off");
  d.users[0].notify!.kinds.habits = true;

  const lateIST = Date.parse(`${today()}T23:30:00+05:30`);
  d.outbox = [];
  const [quiet] = enqueue(d, A, msg("e"), lateIST);
  assert.ok(quiet.notBefore > lateIST, "quiet hours hold messages until morning");
  assert.ok(!d.outbox.some((o) => ["sent", "delivered", "read"].includes(o.status)));
});

test("migration 5 clears everyone's activity and keeps every account intact", () => {
  const d = db();
  d.schema = 4;
  Object.assign(d.users[0], { character: "volt", frame: "charged", bio: "Hi", photo: "data:image/jpeg;base64,AAAA", dailyGoal: 100 as const, notify: { phone: "+919876543210", whatsapp: true, push: false, kinds: { daily: true, overtaken: true, challengeDone: true, ending: true, recap: true } as unknown as NotifyPrefs["kinds"], quietStart: 22, quietEnd: 8, dailyLimit: 3, reminderHour: 9 } });
  act(d, A,
    { t: "habitAdd", id: "habit0001", habit: { title: "Run", dim: "health", xp: 20 } },
    { t: "goalAdd", id: "goal00001", g: { title: "Fit", dim: "health" } },
    { t: "habit", habitId: "habit0001" },
  );
  d.sessions.push({ id: "s", userId: A, createdAt: 1, expiresAt: Date.now() + 1e6, lastSeen: 1 });
  d.outbox.push({ id: "o", userId: A, kind: "daily", channel: "push", dedupe: "x", createdAt: 1, notBefore: 1, updatedAt: 1, status: "sent", attempts: 1, body: "b" });
  const users = structuredClone(d.users.map(({ frame: _f, ...u }) => u));
  const rev = d.rev;
  const out = migrate(d, 5);
  assert.equal(out.schema, 5);
  assert.equal(out.rev, rev + 1);
  for (const k of ["logs", "habits", "todos", "goals", "challenges", "rivalries", "meetups", "memories", "feed", "notifs"] as const) assert.deepEqual(out.game[k], [], k);
  assert.deepEqual(out.game.badges, {});
  assert.deepEqual(out.outbox, []);
  assert.deepEqual((out.users as UserRecord[]).map(({ frame: _f, ...u }) => u), users, "accounts, passwords, photos, characters and settings are untouched");
  assert.equal(out.users[0].frame, undefined);
  assert.equal(out.sessions.length, 1, "nobody is signed out");
});
