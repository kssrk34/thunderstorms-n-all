import assert from "node:assert/strict";
import { test } from "node:test";
import { lastDays } from "../lib/balance";
import { lifetimeAura, streakOf, userLogs } from "../lib/engine";
import { applyAction, Nope, type Action } from "../lib/reducer";
import type { GameState, Habit } from "../lib/types";
import { A, B, C, ago, past, squad } from "./helpers";
import { today } from "../lib/utils";

const run = (s: GameState, me: string, ...actions: Action[]) => actions.reduce((st, a) => applyAction(st, a, me), s);
const auraOf = (s: GameState, id: string) => lifetimeAura(userLogs(s, id));

function withHabit(id = "habit0001", xp = 20, extra: Partial<Habit> = {}): GameState {
  return run(squad(), A, { t: "habitAdd", id, habit: { title: "Morning run", dim: "health", xp, icon: "run", ...extra } });
}

test("a cousin can't touch anyone else's quests, goals or progress", () => {
  let s = withHabit();
  s = run(s, A,
    { t: "todoAdd", id: "todo00001", todo: { title: "Book the dentist", dim: "health", xp: 20 } },
    { t: "goalAdd", id: "goal00001", g: { title: "Run 100 km", dim: "health", target: 100, unit: "km" } },
    { t: "chCreate", id: "chal00001", ch: { title: "Read 50 pages", desc: "", period: "weekly", scope: "squad", track: "manual", dim: "intellectual", target: 50, unit: "pages", participants: [B] } },
  );
  const before = JSON.stringify({ habits: s.habits, todos: s.todos, goals: s.goals, logs: s.logs.filter((l) => l.userId === A), ch: s.challenges[0].progress[A] });
  const attempts: Action[] = [
    { t: "habit", habitId: "habit0001" },
    { t: "habitEdit", id: "habit0001", habit: { title: "Hacked", xp: 50 } },
    { t: "habitRemove", habitId: "habit0001" },
    { t: "todo", id: "todo00001" },
    { t: "todoEdit", id: "todo00001", todo: { title: "Hacked" } },
    { t: "todoDel", id: "todo00001" },
    { t: "goalStep", id: "goal00001", amount: 50 },
    { t: "goalEdit", id: "goal00001", g: { title: "Hacked" } },
    { t: "goalDel", id: "goal00001" },
    { t: "chDel", id: "chal00001" },
    { t: "prioritize", ids: ["habit0001", "todo00001"] },
  ];
  for (const a of attempts) s = run(s, B, a);
  const after = JSON.stringify({ habits: s.habits, todos: s.todos, goals: s.goals, logs: s.logs.filter((l) => l.userId === A), ch: s.challenges[0].progress[A] });
  assert.equal(after, before);
  assert.deepEqual(s.priorities[B]?.ids ?? [], [], "can't prioritise someone else's quests");
  // B logging progress only ever changes B's own number
  s = run(s, B, { t: "chLog", id: "chal00001", amount: 10 });
  assert.equal(s.challenges[0].progress[B], 10);
  assert.equal(s.challenges[0].progress[A], undefined);
});

test("only the server's rules decide Aura Points: removed and unknown actions are rejected", () => {
  const s = squad();
  for (const t of ["box", "selfRate", "penalty", "mood", "gratitude", "lesson", "saving", "quick", "settings", "giveXp"]) {
    assert.throws(() => applyAction(s, { t } as unknown as Action, A), Nope);
  }
});

test("every claim is counted once: repeats and double taps don't duplicate Aura", () => {
  let s = withHabit("habit0001", 30);
  s = run(s, A, { t: "habit", habitId: "habit0001" });
  assert.equal(auraOf(s, A), 30);
  s = run(s, A, { t: "habit", habitId: "habit0001" });
  assert.equal(auraOf(s, A), 0, "a second tap undoes, it never pays twice");
  s = run(s, A, { t: "habit", habitId: "habit0001" });
  assert.equal(s.logs.filter((l) => l.userId === A).length, 1);

  // the same activity submission arriving twice
  const act: Action = { t: "activity", id: "actv00001", activityId: "read", minutes: 30, note: "" };
  s = run(s, A, act, act);
  assert.equal(s.logs.filter((l) => l.kind === "activity").length, 1);
  assert.equal(auraOf(s, A), 50);

  // repeated creates are no-ops
  s = run(s, A, { t: "habitAdd", id: "habit0001", habit: { title: "Morning run", dim: "health", xp: 30 } });
  assert.equal(s.habits.length, 1);
  const meetup: Action = { t: "meetup", id: "meet00001", m: { date: today(), place: "Lalbagh", kind: "Outing", attendees: [A, B], note: "" } };
  s = run(s, A, meetup, meetup);
  assert.equal(s.meetups.length, 1);
  assert.equal(s.logs.filter((l) => l.kind === "meetup").length, 2);
});

test("goal progress pays only for new ground (no + − + farming)", () => {
  let s = run(squad(), A, { t: "goalAdd", id: "goal00001", g: { title: "Read 12 books", dim: "intellectual", target: 12, unit: "books" } });
  s = run(s, A, { t: "goalStep", id: "goal00001", amount: 1 });
  const once = auraOf(s, A);
  assert.equal(once, 10);
  for (let i = 0; i < 5; i++) s = run(s, A, { t: "goalStep", id: "goal00001", amount: -1 }, { t: "goalStep", id: "goal00001", amount: 1 });
  assert.equal(auraOf(s, A), once);
  s = run(s, A, { t: "goalStep", id: "goal00001", amount: 2 });
  assert.equal(auraOf(s, A), once + 20);
});

test("Life Balance follows planned versus completed, and nobody can set it by hand", () => {
  let s = withHabit("habit0001", 20);
  s = { ...s, habits: s.habits.map((h) => ({ ...h, created: ago(10) })) };
  // done on 8 of the last 10 days; today isn't over, so it doesn't count yet
  for (const d of [1, 2, 3, 4, 5, 6, 8, 9]) s.logs.push(past(A, ago(d), { xp: 20, dim: "health", kind: "habit", ref: `h:habit0001:${ago(d)}` }));
  const b = lastDays(s, A, 30);
  assert.equal(b.dims.health.planned, 200);
  assert.equal(b.dims.health.done, 160);
  assert.equal(b.dims.health.score, 80);
  assert.equal(b.dims.intellectual.score, null, "no data is no data, not zero");
  assert.throws(() => applyAction(s, { t: "selfRate", dim: "health", value: 10 } as unknown as Action, A), Nope);
});

test("very easy tasks can't max out an area", () => {
  let s = withHabit("habit0001", 5);
  s = { ...s, habits: s.habits.map((h) => ({ ...h, created: ago(10) })) };
  for (let d = 1; d <= 10; d++) s.logs.push(past(A, ago(d), { xp: 5, dim: "health", kind: "habit", ref: `h:habit0001:${ago(d)}` }));
  const score = lastDays(s, A, 30).dims.health.score!;
  assert.ok(score < 50, `a 5-point habit done perfectly scores ${score}%`);
});

test("retiring a quest keeps its history, rest days don't count against you, and splits are even", () => {
  let s = withHabit("habit0001", 20, { dim2: "spiritual" });
  s = { ...s, habits: s.habits.map((h) => ({ ...h, created: ago(6) })) };
  for (const d of [1, 2, 4, 5]) s.logs.push(past(A, ago(d), { xp: 20, dim: "health", dim2: "spiritual", kind: "habit", ref: `h:habit0001:${ago(d)}` }));
  s.restDays[A] = [ago(3)];
  const before = lastDays(s, A, 30);
  assert.equal(before.dims.health.planned, 50, "6 days minus the rest day, half of 20 each");
  assert.equal(before.dims.health.done, 40);
  assert.equal(before.dims.spiritual.done, 40);
  s = run(s, A, { t: "habitRemove", habitId: "habit0001" });
  assert.ok(s.habits[0].archivedOn, "retired, not deleted");
  assert.deepEqual(lastDays(s, A, 30).dims.health, before.dims.health);
});

test("an open one-time quest only counts as missed after a week", () => {
  let s = run(squad(), A, { t: "todoAdd", id: "todo00001", todo: { title: "Fix the bike", dim: "quality", xp: 20 } }, { t: "todoAdd", id: "todo00002", todo: { title: "Sort the wardrobe", dim: "quality", xp: 20 } });
  s = { ...s, todos: s.todos.map((x) => ({ ...x, created: x.id === "todo00001" ? ago(3) : ago(10) })) };
  const b = lastDays(s, A, 30);
  assert.equal(b.dims.quality.planned, 20);
  assert.equal(b.dims.quality.done, 0);
});

test("Life Vision needs three tracked areas and counts untracked ones as zero", () => {
  let s = squad();
  for (const [i, dim] of (["health", "intellectual", "career"] as const).entries()) {
    s = run(s, A, { t: "habitAdd", id: `habit000${i}`, habit: { title: dim, dim, xp: 20 } });
  }
  s = { ...s, habits: s.habits.map((h) => ({ ...h, created: ago(5) })) };
  let b = lastDays(s, A, 30);
  assert.equal(b.vision, Math.round((0 * 3) / 9));
  for (const h of s.habits) for (let d = 1; d <= 5; d++) s.logs.push(past(A, ago(d), { xp: 20, dim: h.dim, kind: "habit", ref: `h:${h.id}:${ago(d)}` }));
  b = lastDays(s, A, 30);
  assert.equal(b.tracked, 3);
  assert.equal(b.vision, Math.round(300 / 9));
});

test("one missed day spends a shield instead of breaking a long streak", () => {
  const s = squad();
  const days = [...Array.from({ length: 7 }, (_, i) => 10 - i), 2, 1]; // days 10..4 active, 3 missed, 2..1 active
  for (const d of days) s.logs.push(past(A, ago(d), { xp: 10, dim: "health", kind: "activity" }));
  const st = streakOf(s, A);
  assert.equal(st.current, 9);
  assert.deepEqual(st.saved, [ago(3)]);
  // without seven days banked first, a miss resets
  const t = squad();
  for (const d of [6, 5, 4, 2, 1]) t.logs.push(past(B, ago(d), { xp: 10, dim: "health", kind: "activity" }));
  assert.equal(streakOf(t, B).current, 2);
});

test("a team mission pays everyone only when everyone hits their own target", () => {
  let s = run(squad(), A, { t: "chCreate", id: "miss00001", ch: { title: "Two workouts each", desc: "", period: "weekly", scope: "team", track: "quests", dim: "health", target: 2, unit: "workouts", participants: [B] } });
  const log = (id: string): Action => ({ t: "activity", id, activityId: "exercise", minutes: 30, note: "" });
  s = run(s, A, log("actv00001"), log("actv00002"));
  assert.deepEqual(s.challenges[0].completedBy, []);
  s = run(s, B, log("actv00003"));
  assert.deepEqual(s.challenges[0].completedBy, []);
  s = run(s, B, log("actv00004"));
  assert.deepEqual([...s.challenges[0].completedBy].sort(), [A, B].sort());
  const paid = s.logs.filter((l) => l.ref === "ch:miss00001");
  assert.equal(paid.length, 2);
  assert.ok(paid.every((l) => l.tag === "mission" && l.xp === 100));
  // C wasn't part of it and can't join a finished mission
  assert.throws(() => applyAction(s, { t: "chJoin", id: "miss00001" }, C), Nope);
  // undoing a contribution while it runs takes the reward back from everyone
  const last = s.logs.find((l) => l.ref === "act:actv00004")!;
  s = run(s, B, { t: "logUndo", id: last.id });
  assert.equal(s.logs.filter((l) => l.ref === "ch:miss00001").length, 0);
});

test("private quests never reach the feed; shared ones post and unposting follows undo", () => {
  let s = run(squad(), A,
    { t: "habitAdd", id: "habit0001", habit: { title: "Therapy homework", dim: "emotional", xp: 20 } },
    { t: "habitAdd", id: "habit0002", habit: { title: "Evening walk", dim: "health", xp: 20 } },
  );
  assert.equal(s.habits.find((h) => h.id === "habit0001")!.private, true, "emotional quests start private");
  s = run(s, A, { t: "habit", habitId: "habit0001" }, { t: "habit", habitId: "habit0002" });
  assert.ok(!s.feed.some((e) => e.text.includes("Therapy")));
  assert.ok(s.feed.some((e) => e.text === "completed Evening walk"));
  s = run(s, A, { t: "habit", habitId: "habit0002" });
  assert.ok(!s.feed.some((e) => e.text === "completed Evening walk"));
  // making a quest private later hides what was already shared
  s = run(s, A, { t: "habit", habitId: "habit0002" }, { t: "habitEdit", id: "habit0002", habit: { private: true } });
  assert.ok(!s.feed.some((e) => e.text.includes("Evening walk")));
  assert.ok(s.logs.filter((l) => l.ref?.startsWith("h:habit0002:")).every((l) => l.private));
});

test("reactions: only your own, never on your own posts", () => {
  let s = run(squad(), A, { t: "habitAdd", id: "habit0002", habit: { title: "Evening walk", dim: "health", xp: 20 } }, { t: "habit", habitId: "habit0002" });
  const ev = s.feed.find((e) => e.kind === "quest")!;
  s = run(s, A, { t: "react", id: ev.id, kind: "zap" });
  assert.deepEqual(s.feed.find((e) => e.id === ev.id)!.reactions, {});
  s = run(s, B, { t: "react", id: ev.id, kind: "fire" }, { t: "react", id: ev.id, kind: "clap" });
  s = run(s, C, { t: "react", id: ev.id, kind: "zap" });
  assert.deepEqual(s.feed.find((e) => e.id === ev.id)!.reactions, { [B]: "clap", [C]: "zap" });
  s = run(s, C, { t: "react", id: ev.id, kind: null });
  assert.deepEqual(s.feed.find((e) => e.id === ev.id)!.reactions, { [B]: "clap" });
});
