import { dailyPlan, periodAura } from "../engine";
import type { GameState, Notif } from "../types";
import { addDays, indiaHour, today, uid, weekday, weekStart } from "../utils";
import { readDb, writeDb, type DB } from "./db";
import { enqueue, processOutbox, reachable, prefsOf, type Message } from "./notify";
import { fullGame } from "./view";

const first = (name: string) => name.split(" ")[0];

/**
 * Message texts. Each matches a WhatsApp template (see README) and carries
 * only what the recipient may know: shared names and titles, their own numbers.
 */
export const MESSAGES = {
  daily: (name: string, n: number, aura: number): Omit<Message, "kind" | "dedupe"> => ({
    body: `Your daily quests are waiting, ${name}. ${n} ${n === 1 ? "quest" : "quests"} and ${aura} Aura Points are up for grabs today.`,
    template: { name: "tna_daily_quests", params: [name, String(n), String(aura)] }, url: "/quests",
  }),
  overtaken: (cousin: string, gap: number): Omit<Message, "kind" | "dedupe"> => ({
    body: `${cousin} just passed your weekly Aura Points score. You're ${gap} behind. Plenty of week left.`,
    template: { name: "tna_overtaken", params: [cousin, String(gap)] }, url: "/arena",
  }),
  challengeDone: (title: string, aura: number): Omit<Message, "kind" | "dedupe"> => ({
    body: `You've completed ${title}! +${aura} Aura Points.`,
    template: { name: "tna_challenge_done", params: [title, String(aura)] }, url: "/arena?tab=missions",
  }),
  ending: (title: string): Omit<Message, "kind" | "dedupe"> => ({
    body: `The group challenge ${title} ends tomorrow.`,
    template: { name: "tna_challenge_ending", params: [title] }, url: "/arena?tab=missions",
  }),
  recap: (name: string): Omit<Message, "kind" | "dedupe"> => ({
    body: `Your weekly Life Balance recap is ready, ${name}.`,
    template: { name: "tna_weekly_recap", params: [name] }, url: "/recap",
  }),
  test: (): Omit<Message, "kind" | "dedupe"> => ({
    body: "This is a test from Thunderstorms 'n' All. Your notifications are set up.",
    template: { name: "tna_test", params: [] }, url: "/profile?tab=alerts",
  }),
};

function personal(g: GameState, to: string, icon: Notif["icon"], title: string, body?: string): GameState {
  return { ...g, notifs: [{ id: uid(), ts: Date.now(), icon, title, ...(body ? { body } : {}), to: [to] }, ...g.notifs].slice(0, 120) };
}

/**
 * Side effects of an action that only the server decides, run inside the
 * same write: who just got overtaken, and which challenges someone completed.
 */
export function afterAction(db: DB, prev: GameState, next: GameState, actor: string): GameState {
  let out = next;
  const ws = weekStart(today());
  const before = periodAura(prev, actor, "weekly");
  const after = periodAura(next, actor, "weekly");
  if (after > before) {
    const name = next.members.find((m) => m.id === actor)?.name ?? "A cousin";
    for (const m of next.members) {
      if (m.id === actor) continue;
      const theirs = periodAura(next, m.id, "weekly");
      if (theirs <= 0 || before > theirs || after <= theirs) continue;
      const title = `${name} just passed your weekly Aura Points`;
      // once per cousin, per rival, per week, however often the lead changes hands
      if (out.notifs.some((n) => n.to?.includes(m.id) && n.title === title && n.ts >= Date.parse(`${ws}T00:00:00+05:30`))) continue;
      out = personal(out, m.id, "duel", title, `You're ${after - theirs} behind this week.`);
      enqueue(db, m.id, { kind: "overtaken", dedupe: `overtaken:${actor}:${ws}`, ...MESSAGES.overtaken(first(name), after - theirs) });
    }
  }
  for (const c of next.challenges) {
    const was = new Set(prev.challenges.find((x) => x.id === c.id)?.completedBy ?? []);
    for (const p of c.completedBy) {
      if (was.has(p)) continue;
      if (p !== actor) out = personal(out, p, "trophy", `Mission complete: ${c.title}`, `+${c.xp} Aura Points for everyone who took part.`);
      enqueue(db, p, { kind: "challengeDone", dedupe: `done:${c.id}`, ...MESSAGES.challengeDone(c.title, c.xp) });
    }
  }
  return out;
}

/** Time-based reminders: the daily nudge, challenges ending tomorrow, and Monday's recap. */
export function runSchedule(db: DB, now = Date.now()) {
  const t = today(now);
  const hour = indiaHour(now);
  const game = fullGame(db);
  for (const u of db.users) {
    if (!reachable(u)) continue;
    const p = prefsOf(u);
    if (hour >= p.reminderHour) {
      const plan = dailyPlan(game, u.id, u.dailyGoal ?? "auto", t);
      const open = plan.due.length - plan.doneCount;
      if (open > 0 && !plan.rested) enqueue(db, u.id, { kind: "daily", dedupe: `daily:${t}`, ...MESSAGES.daily(first(u.name), open, plan.available) }, now);
      if (weekday(t) === 0) enqueue(db, u.id, { kind: "recap", dedupe: `recap:${weekStart(t)}`, ...MESSAGES.recap(first(u.name)) }, now);
    }
    const tomorrow = addDays(t, 1);
    for (const c of game.challenges) {
      if (c.endsOn === tomorrow && c.participants.length > 1 && c.participants.includes(u.id) && !c.completedBy.includes(u.id)) {
        enqueue(db, u.id, { kind: "ending", dedupe: `ending:${c.id}`, ...MESSAGES.ending(c.title) }, now);
      }
    }
  }
  db.meta.lastSchedule = now;
}

const SCHEDULE_EVERY = 10 * 60_000;

/** Runs the schedule now and then, piggybacking on normal traffic, and delivers anything due. */
export async function maybeSchedule(now = Date.now()) {
  const need = await readDb((db) => db.users.some(reachable) && now - (db.meta.lastSchedule ?? 0) > SCHEDULE_EVERY);
  if (need) {
    await writeDb((db) => {
      if (now - (db.meta.lastSchedule ?? 0) > SCHEDULE_EVERY) runSchedule(db, now);
    });
  }
  await processOutbox(now);
}
