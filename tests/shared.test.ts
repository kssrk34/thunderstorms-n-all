import assert from "node:assert/strict";
import { test } from "node:test";
import { lifetimeAura, userLogs } from "../lib/engine";
import { applyAction, Nope, type Action } from "../lib/reducer";
import { toStored } from "../lib/seed";
import { afterAction } from "../lib/server/events";
import { migrate } from "../lib/server/migrations";
import { defaultKinds } from "../lib/server/notify";
import type { DB, UserRecord } from "../lib/server/db";
import { fullGame, viewFor } from "../lib/server/view";
import { shareProgress } from "../lib/shared";
import type { GameState } from "../lib/types";
import { today } from "../lib/utils";
import { A, B, C, squad } from "./helpers";

const run = (g: GameState, me: string, ...actions: Action[]) => actions.reduce((s, a) => applyAction(s, a, me), g);
const aura = (g: GameState, id: string) => lifetimeAura(userLogs(g, id));

/** Asha shares a daily reading habit with Bala (and optionally Chitra). */
function shared(invite = [B], extra: Partial<Extract<Action, { t: "shareCreate" }>> = {}) {
  let g = run(squad(), A, { t: "habitAdd", id: "habit0001", habit: { title: "Read 20 minutes", dim: "intellectual", xp: 20 } });
  g = run(g, A, { t: "shareCreate", id: "share0001", source: { type: "habit", id: "habit0001" }, mode: "together", invite, ...extra } as Action);
  return g;
}

test("an invitation needs acceptance before anything joins the cousin's quests", () => {
  const g = shared();
  const sq = g.shares[0];
  assert.equal(sq.members[A].status, "accepted");
  assert.equal(sq.members[B].status, "pending");
  assert.equal(g.habits.filter((h) => h.userId === B).length, 0, "nothing is added until they accept");
  const n = g.notifs.find((x) => x.ref === "share:share0001")!;
  assert.deepEqual(n.to, [B]);
  assert.equal(n.kind, "invites");
  assert.equal(aura(g, A) + aura(g, B), 0, "inviting awards no Aura");

  const accepted = run(g, B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  const copy = accepted.habits.find((h) => h.userId === B)!;
  assert.equal(copy.id, "copyb0001");
  assert.equal(copy.title, "Read 20 minutes");
  assert.equal(copy.shareId, "share0001");
  assert.equal(accepted.shares[0].members[B].status, "accepted");
  assert.equal(aura(accepted, B), 0, "accepting awards no Aura");
  // answering twice changes nothing
  assert.deepEqual(run(accepted, B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0002" }).habits, accepted.habits);

  const declined = run(g, B, { t: "shareRespond", id: "share0001", accept: false });
  assert.equal(declined.shares[0].members[B].status, "declined");
  assert.equal(declined.habits.filter((h) => h.userId === B).length, 0);
});

test("no self-invitations, unknown cousins, duplicates, or sharing someone else's quest", () => {
  const g = run(squad(), A, { t: "habitAdd", id: "habit0001", habit: { title: "Run", dim: "health", xp: 20 } });
  assert.throws(() => run(g, A, { t: "shareCreate", source: { type: "habit", id: "habit0001" }, mode: "together", invite: [A, "nobody00"] }), Nope);
  assert.throws(() => run(g, B, { t: "shareCreate", source: { type: "habit", id: "habit0001" }, mode: "together", invite: [C] }), Nope, "only your own quests");
  const s = run(g, A, { t: "shareCreate", id: "share0001", source: { type: "habit", id: "habit0001" }, mode: "together", invite: [B, B, A, "nobody00"] });
  assert.deepEqual(Object.keys(s.shares[0].members).sort(), [A, B].sort());
  // inviting someone already invited does nothing; a stranger can't invite anyone
  assert.equal(run(s, A, { t: "shareInvite", id: "share0001", invite: [B] }).notifs.length, s.notifs.length);
  assert.equal(run(s, C, { t: "shareInvite", id: "share0001", invite: [C] }), s);
  assert.throws(() => run(s, A, { t: "shareCreate", source: { type: "habit", id: "habit0001" }, mode: "together", invite: [C] }), Nope, "already shared");
});

test("each cousin completes only their own copy and earns their own Aura and streak", () => {
  let g = run(shared(), B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  // Asha can't tick Bala's copy
  assert.equal(run(g, A, { t: "habit", habitId: "copyb0001" }).logs.length, g.logs.length);
  g = run(g, B, { t: "habit", habitId: "copyb0001" });
  assert.equal(aura(g, B), 20);
  assert.equal(aura(g, A), 0, "one cousin's completion doesn't complete anyone else's");
  const p = shareProgress(g, g.shares[0]);
  assert.deepEqual(p.members.map((m) => [m.id, m.doneToday]).sort(), [[A, false], [B, true]].sort());
  assert.ok(!g.feed.some((e) => e.kind === "together"), "not everyone is done yet");

  g = run(g, A, { t: "habit", habitId: "habit0001" });
  assert.ok(g.feed.some((e) => e.kind === "together" && e.ref === `sqall:share0001:${today()}`), "everyone done: a group moment");
  assert.equal(aura(g, A), 20, "the group moment adds no Aura");
  g = run(g, A, { t: "habit", habitId: "habit0001" });
  assert.ok(!g.feed.some((e) => e.kind === "together"), "undoing takes the moment back");
});

test("only the organiser changes the shared definition; everyone keeps their own settings", () => {
  let g = run(shared(), B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  g = run(g, B, { t: "habitEdit", id: "copyb0001", habit: { title: "Hacked", xp: 50, remindAt: 20 } });
  const mine = g.habits.find((h) => h.id === "copyb0001")!;
  assert.equal(mine.title, "Read 20 minutes");
  assert.equal(mine.xp, 20);
  assert.equal(mine.remindAt, 20, "a personal reminder time is allowed");
  g = run(g, A, { t: "habitEdit", id: "habit0001", habit: { title: "Read 30 minutes", xp: 30 } });
  assert.equal(g.habits.find((h) => h.id === "copyb0001")!.title, "Read 30 minutes", "the organiser's change reaches everyone");
  assert.equal(g.habits.find((h) => h.id === "copyb0001")!.remindAt, 20, "without touching their reminder");
  assert.equal(g.shares[0].title, "Read 30 minutes");
});

test("leaving keeps earned Aura and history; the organiser ending it keeps everyone's copy", () => {
  let g = run(shared([B, C]), B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  g = run(g, C, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyc0001" });
  g = run(g, B, { t: "habit", habitId: "copyb0001" });
  g = run(g, B, { t: "habitRemove", habitId: "copyb0001" }); // retiring a shared copy means leaving
  assert.equal(g.shares[0].members[B].status, "left");
  assert.equal(aura(g, B), 20, "leaving never erases Aura");
  assert.ok(g.habits.find((h) => h.id === "copyb0001")!.archivedOn, "the copy is retired, not deleted");
  assert.equal(shareProgress(g, g.shares[0]).members.find((m) => m.id === B)!.done, 1, "their contribution still counts");
  assert.ok(g.habits.some((h) => h.id === "copyc0001" && !h.archivedOn), "nobody else is affected");

  g = run(g, A, { t: "shareEnd", id: "share0001" });
  assert.equal(g.shares[0].endedOn, today());
  assert.ok(g.habits.some((h) => h.id === "copyc0001" && !h.archivedOn), "ending keeps each copy as a personal quest");
  assert.ok(g.notifs.some((n) => n.to?.includes(C) && /ended/.test(n.title)));
  assert.equal(run(g, C, { t: "shareLeave", id: "share0001" }), g, "nothing left to leave");
  // a participant can't end it
  const h = run(shared(), B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  assert.equal(run(h, B, { t: "shareEnd", id: "share0001" }), h);
});

test("team quests: completions add up, the bonus is paid once per contributor and undone with them", () => {
  let g = run(squad(), A, { t: "habitAdd", id: "habit0001", habit: { title: "Workout", dim: "health", xp: 30 } });
  g = run(g, A, { t: "shareCreate", id: "share0001", source: { type: "habit", id: "habit0001" }, mode: "team", target: 2, bonus: true, invite: [B, C] });
  g = run(g, B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  g = run(g, C, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyc0001" });
  const bonus = g.shares[0].bonus!;
  assert.equal(bonus, 50, "a week-long team quest");
  g = run(g, A, { t: "habit", habitId: "habit0001" });
  assert.equal(shareProgress(g, g.shares[0]).total, 1);
  assert.equal(aura(g, A), 30, "no bonus before the target");
  g = run(g, B, { t: "habit", habitId: "copyb0001" });
  assert.equal(shareProgress(g, g.shares[0]).total, 2);
  assert.equal(aura(g, A), 30 + bonus);
  assert.equal(aura(g, B), 30 + bonus);
  assert.equal(aura(g, C), 0, "no contribution, no bonus");
  assert.ok(g.feed.some((e) => e.ref === "sqdone:share0001"));
  // claiming twice is impossible: repeating the sync changes nothing
  assert.equal(run(g, C, { t: "notifsRead" }).logs.length, g.logs.length);
  g = run(g, B, { t: "habit", habitId: "copyb0001" });
  assert.equal(aura(g, A), 30, "undoing below the target takes the bonus back while it's running");
  assert.ok(!g.feed.some((e) => e.ref === "sqdone:share0001"));
});

test("cousins who weren't invited never see a shared quest or its moments", () => {
  const users = (["Asha", "Bala", "Chitra"] as const).map((name, i): UserRecord => ({
    id: [A, B, C][i], username: name.toLowerCase(), name, passHash: "x", role: i ? "member" : "admin", emoji: "⚡", color: "#4C8DFF", onboarded: true, createdAt: Date.now() - 30 * 86_400_000,
  }));
  const d: DB = { schema: 7, rev: 1, meta: { createdAt: 0 }, users, sessions: [], invites: [], resets: [], outbox: [], game: toStored({ ...squad(), members: [] }) };
  const step = (me: string, a: Action) => {
    const prev = fullGame(d);
    const next = afterAction(d, prev, applyAction(prev, a, me), me);
    d.game = toStored(next);
  };
  d.users[1].notify = { whatsapp: false, push: true, kinds: defaultKinds(), quietStart: 22, quietEnd: 8, dailyLimit: 3, reminderHour: 9 };
  d.users[1].pushSubs = [{ endpoint: "https://push.example/1", keys: { p256dh: "abcdefghij", auth: "abcdefghij" }, createdAt: 1 }];
  step(A, { t: "habitAdd", id: "habit0001", habit: { title: "Secret reading club", dim: "intellectual", xp: 20, private: true } });
  step(A, { t: "shareCreate", id: "share0001", source: { type: "habit", id: "habit0001" }, mode: "together", invite: [B] });
  step(B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  step(A, { t: "habit", habitId: "habit0001" });
  step(B, { t: "habit", habitId: "copyb0001" });
  assert.ok(fullGame(d).feed.some((e) => e.kind === "together"));

  const outsider = JSON.stringify(viewFor(d, C));
  assert.ok(!outsider.includes("Secret reading club"), "the title doesn't leak to cousins who weren't invited");
  assert.equal(viewFor(d, C).game.shares.length, 0);
  assert.equal(viewFor(d, B).game.shares.length, 1);
  assert.equal(viewFor(d, B).game.habits.every((h) => h.userId === B), true, "participants never get each other's habits");
  // push is only queued for the cousin who opted in, never without push being configured on the server
  assert.ok(d.outbox.every((o) => o.userId === B));
});

test("migration 6 swaps drawn characters for portraits, one per cousin, and carries notification choices over", () => {
  const user = (id: string, extra: Partial<UserRecord>): UserRecord => ({ id, username: id, name: id, passHash: "x", role: "member", emoji: "⚡", color: "#4C8DFF", onboarded: true, createdAt: Date.now(), ...extra });
  const raw = {
    schema: 5, rev: 3, meta: { createdAt: 0 }, sessions: [], invites: [], resets: [], outbox: [],
    users: [
      user("u1", { character: "tempest", createdAt: 1 }),
      user("u2", { character: "nimbus", createdAt: 2 }), // also closest to blue: gets the next free portrait
      user("u3", { photo: "data:image/jpeg;base64,AAAA", createdAt: 3 }),
      user("u4", { createdAt: 4, notify: { whatsapp: false, push: true, kinds: { daily: false, overtaken: true, challengeDone: false, ending: false, recap: true } as never, quietStart: 22, quietEnd: 8, dailyLimit: 3, reminderHour: 9 } }),
    ],
    game: { ...toStored(squad()), shares: undefined },
  };
  const before = structuredClone(raw.game);
  const out = migrate(structuredClone(raw), 6) as DB;
  assert.equal(out.schema, 6);
  const chars = out.users.map((u) => u.character);
  assert.equal(chars[0], "storm-blue");
  assert.ok(chars[1] && chars[1] !== "storm-blue", "still one per cousin");
  assert.equal(chars[2], undefined, "a photo is left alone");
  assert.ok(chars[3], "cousins with neither get a portrait");
  assert.equal(new Set(chars.filter(Boolean)).size, chars.filter(Boolean).length);
  assert.equal(out.users[2].photo, raw.users[2].photo);
  assert.deepEqual(out.users[3].notify!.kinds, { habits: false, quests: false, leaderboard: true, missions: false, recap: true });
  assert.deepEqual(out.game.shares, []);
  const { shares: _s, ...rest } = out.game;
  const { shares: _b, ...was } = before;
  assert.deepEqual(rest, was, "no game data changes");
});

test("migration 7 clears everyone's activity again and keeps every profile", () => {
  let g = shared();
  g = run(g, B, { t: "shareRespond", id: "share0001", accept: true, copyId: "copyb0001" });
  g = run(g, A, { t: "habit", habitId: "habit0001" }, { t: "goalAdd", id: "goal00001", g: { title: "Fit", dim: "health" } });
  const users: UserRecord[] = [A, B].map((id, i) => ({
    id, username: id, name: id, passHash: "hash", role: i ? "member" : "admin", emoji: "⚡", color: "#4C8DFF", onboarded: true, createdAt: 1,
    character: i ? "storm-gold" : "storm-blue", photo: i ? "data:image/jpeg;base64,AAAA" : undefined, bio: "Hi", frame: "charged",
    notify: { whatsapp: false, push: true, kinds: defaultKinds(), quietStart: 22, quietEnd: 8, dailyLimit: 3, reminderHour: 9 },
    pushSubs: [{ endpoint: "https://push.example/1", keys: { p256dh: "abcdefghij", auth: "abcdefghij" }, createdAt: 1 }],
  }));
  const d: DB = { schema: 6, rev: 5, meta: { createdAt: 0 }, users, sessions: [{ id: "s", userId: A, createdAt: 1, expiresAt: Date.now() + 1e6, lastSeen: 1 }], invites: [], resets: [],
    outbox: [{ id: "o", userId: A, kind: "habits", channel: "push", dedupe: "x", createdAt: 1, notBefore: 1, updatedAt: 1, status: "sent", attempts: 1, body: "b" }], game: toStored(g) };
  const keep = structuredClone(d.users.map(({ frame: _f, ...u }) => u));
  const out = migrate(d) as DB;
  assert.equal(out.schema, 7);
  for (const k of ["logs", "habits", "todos", "goals", "challenges", "shares", "rivalries", "meetups", "memories", "feed", "notifs"] as const) assert.deepEqual(out.game[k], [], k);
  assert.deepEqual(out.game.badges, {});
  assert.deepEqual(out.outbox, []);
  assert.deepEqual(out.users.map(({ frame: _f, ...u }) => u), keep, "profiles, photos, characters, logins and settings are untouched");
  assert.equal(out.sessions.length, 1, "nobody is signed out");
});
