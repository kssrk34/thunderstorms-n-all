import { ACTIVE_DIMS, DIM } from "../catalog";
import { lastDays } from "../balance";
import { auraBetween, consistency, dailyPlan, habitsFor, periodAura, userLogs } from "../engine";
import { habitDone, isDue } from "../ledger";
import { shareLink } from "../reducer";
import { canSeeEvent, isLive } from "../shared";
import type { FeedEvent, GameState, Notif, NotifyCategory } from "../types";
import { addDays, indiaHour, today, uid, weekday, weekStart } from "../utils";
import { readDb, writeDb, type DB } from "./db";
import { enqueue, processOutbox, reachable, prefsOf, type Message } from "./notify";
import { fullGame } from "./view";

const first = (name: string) => name.split(" ")[0];
type Msg = Omit<Message, "kind" | "dedupe">;

/**
 * Message texts. The ones with a template match a WhatsApp template (see
 * README); the rest go to push only. Each carries only what the recipient may
 * know: shared names and titles, and their own numbers.
 */
export const MESSAGES = {
  habits: (name: string, n: number, aura: number, todos: number): Msg => ({
    title: "Your quests are waiting",
    body: `Your daily quests are waiting, ${name}. ${n} ${n === 1 ? "habit" : "habits"}${todos ? ` and ${todos} one-time ${todos === 1 ? "quest" : "quests"}` : ""}, with ${aura} Aura Points up for grabs today.`,
    template: { name: "tna_daily_quests", params: [name, String(n), String(aura)] }, url: "/quests",
  }),
  habit: (title: string, aura: number): Msg => ({
    title: "Still waiting for you",
    body: `Your ${title} habit is still waiting. Complete it to earn ${aura} Aura.`,
    template: { name: "tna_habit_reminder", params: [title, String(aura)] }, url: "/quests",
  }),
  quests: (name: string, n: number): Msg => ({
    title: "One-time quests",
    body: `${n} one-time ${n === 1 ? "quest is" : "quests are"} still open, ${name}. Knock one off today.`,
    template: { name: "tna_quest_reminder", params: [name, String(n)] }, url: "/quests?tab=once",
  }),
  overtaken: (cousin: string, gap: number): Msg => ({
    title: "Leaderboard",
    body: `${cousin} just overtook you in this week's Aura leaderboard. You're ${gap} behind. Plenty of week left.`,
    template: { name: "tna_overtaken", params: [cousin, String(gap)] }, url: "/arena",
  }),
  topThree: (name: string): Msg => ({
    title: "Top three",
    body: `You've reached the top three this week, ${name}.`,
    template: { name: "tna_top_three", params: [name] }, url: "/arena",
  }),
  challengeDone: (title: string, aura: number): Msg => ({
    title: "Mission complete",
    body: `You've completed ${title}! +${aura} Aura Points.`,
    template: { name: "tna_challenge_done", params: [title, String(aura)] }, url: "/arena?tab=missions",
  }),
  ending: (title: string, url = "/arena?tab=missions"): Msg => ({
    title: "Ends tomorrow",
    body: `The group challenge ${title} ends tomorrow.`,
    template: { name: "tna_challenge_ending", params: [title] }, url,
  }),
  recap: (name: string, summary: string): Msg => ({
    title: "Your weekly summary",
    body: summary,
    template: { name: "tna_weekly_recap", params: [name] }, url: "/recap",
  }),
  invite: (cousin: string, title: string, url: string): Msg => ({
    title: "You're invited!",
    body: `${cousin} invited you to “${title}”. Want to join?`,
    template: { name: "tna_invite", params: [cousin, title] }, url,
  }),
  test: (): Msg => ({
    title: "Thunderstorms 'n' All",
    body: "This is a test from Thunderstorms 'n' All. Your notifications are set up.",
    template: { name: "tna_test", params: [] }, url: "/profile?tab=alerts",
  }),
};

function personal(g: GameState, to: string, icon: Notif["icon"], title: string, body?: string, extra: Partial<Notif> = {}): GameState {
  return { ...g, notifs: [{ id: uid(), ts: Date.now(), icon, title, ...(body ? { body } : {}), to: [to], ...extra }, ...g.notifs].slice(0, 120) };
}

/** Weekly Aura places, with ties sharing a place; 0 for anyone who hasn't earned any. */
function places(g: GameState): Map<string, number> {
  const aura = g.members.map((m) => ({ id: m.id, a: periodAura(g, m.id, "weekly") }));
  return new Map(aura.map((x) => [x.id, x.a > 0 ? 1 + aura.filter((y) => y.a > x.a).length : 0]));
}

/** Feed moments worth a phone notification to cousins who asked for them. Plain completions aren't. */
const COUSIN_MOMENTS = new Set<FeedEvent["kind"]>(["streak", "level", "badge", "goal", "mission", "challenge", "rivalry", "together"]);

/**
 * Side effects of an action that only the server decides, run inside the
 * same write: phone notifications for new in-app ones, who just got
 * overtaken or reached the top three, finished missions and team quests,
 * and cousin milestones.
 */
export function afterAction(db: DB, prev: GameState, next: GameState, actor: string): GameState {
  let out = next;
  const ws = weekStart(today());
  const weekTs = Date.parse(`${ws}T00:00:00+05:30`);
  const nameOf = (id: string) => next.members.find((m) => m.id === id)?.name ?? "A cousin";
  const send = (to: string, kind: NotifyCategory, dedupe: string, msg: Msg) => enqueue(db, to, { kind, dedupe, ...msg });

  // in-app notifications the rules created that also go to phones
  const had = new Set(prev.notifs.map((n) => n.id));
  for (const n of next.notifs) {
    if (had.has(n.id) || !n.kind || !n.to) continue;
    const sq = n.ref?.startsWith("share:") ? next.shares.find((x) => x.id === n.ref!.slice(6)) : undefined;
    for (const to of n.to) {
      if (to === actor) continue;
      if (n.kind === "invites" && sq) enqueue(db, to, { kind: "invites", dedupe: `n:${n.id}`, ...MESSAGES.invite(first(nameOf(actor)), sq.title, n.link ?? shareLink(sq.id)) });
      else enqueue(db, to, { kind: n.kind, dedupe: `n:${n.id}`, title: n.title, body: n.body ?? "", url: n.link });
    }
  }

  // leaderboard: overtaken, once per rival per week; and reaching the top three, once a week
  const before = periodAura(prev, actor, "weekly");
  const after = periodAura(next, actor, "weekly");
  if (after > before) {
    const name = nameOf(actor);
    for (const m of next.members) {
      if (m.id === actor) continue;
      const theirs = periodAura(next, m.id, "weekly");
      if (theirs <= 0 || before > theirs || after <= theirs) continue;
      const title = `${name} just passed your weekly Aura Points`;
      if (out.notifs.some((n) => n.to?.includes(m.id) && n.title === title && n.ts >= weekTs)) continue;
      out = personal(out, m.id, "duel", title, `You're ${after - theirs} behind this week.`, { from: actor, link: "/arena", kind: "leaderboard" });
      send(m.id, "leaderboard", `overtaken:${actor}:${ws}`, MESSAGES.overtaken(first(name), after - theirs));
    }
    if (next.members.length >= 4) {
      const was = places(prev).get(actor) ?? 0;
      const now = places(next).get(actor) ?? 0;
      const title = "You've reached the top three this week";
      if (now > 0 && now <= 3 && (was === 0 || was > 3) && !out.notifs.some((n) => n.to?.includes(actor) && n.title === title && n.ts >= weekTs)) {
        out = personal(out, actor, "trophy", title, "Keep the charge going.", { link: "/arena", kind: "leaderboard" });
        send(actor, "leaderboard", `top3:${actor}:${ws}`, MESSAGES.topThree(first(nameOf(actor))));
      }
    }
  }

  // missions and challenges someone just completed
  for (const c of next.challenges) {
    const was = new Set(prev.challenges.find((x) => x.id === c.id)?.completedBy ?? []);
    for (const p of c.completedBy) {
      if (was.has(p)) continue;
      if (p !== actor) out = personal(out, p, "trophy", `Mission complete: ${c.title}`, `+${c.xp} Aura Points for everyone who took part.`, { link: "/arena?tab=missions" });
      send(p, "missions", `done:${c.id}`, MESSAGES.challengeDone(c.title, c.xp));
    }
  }

  // new feed moments: team quests met, and cousin milestones
  const seen = new Set(prev.feed.map((e) => e.id));
  for (const e of next.feed) {
    if (seen.has(e.id)) continue;
    if (e.ref?.startsWith("sqdone:")) {
      const sq = next.shares.find((x) => x.id === e.ref!.slice(7));
      if (!sq) continue;
      for (const p of Object.keys(sq.members).filter((id) => sq.members[id].status === "accepted")) {
        const bonus = sq.bonus ? ` +${sq.bonus} Aura Points each.` : "";
        out = personal(out, p, "trophy", `Team quest complete: ${sq.title}`, `Everyone's completions added up.${bonus}`, { link: shareLink(sq.id), kind: "missions" });
        enqueue(db, p, { kind: "missions", dedupe: `sqdone:${sq.id}`, title: "Team quest complete", body: `“${sq.title}” is complete!${bonus}`, url: shareLink(sq.id) });
      }
      continue;
    }
    if (!COUSIN_MOMENTS.has(e.kind)) continue;
    const who = e.kind === "together" ? "" : `${first(nameOf(e.userId))} `;
    for (const m of next.members) {
      if (m.id === e.userId || !canSeeEvent(next, e, m.id)) continue;
      enqueue(db, m.id, { kind: "cousins", dedupe: `feed:${e.id}`, title: "Cousin activity", body: `${who}${e.text}`.trim(), url: e.ref?.startsWith("sq") ? shareLink(e.ref.split(":")[1]) : "/" });
    }
  }
  return out;
}

/** Last week in one line: Aura, quests, consistency, biggest Life Balance gain and leaderboard place. */
export function weeklySummary(g: GameState, id: string, t = today()): string {
  const end = addDays(weekStart(t), -1);
  const start = addDays(end, -6);
  const logs = userLogs(g, id);
  const aura = Math.max(0, auraBetween(logs, start, end));
  const quests = logs.filter((l) => l.xp > 0 && l.date >= start && l.date <= end && (l.kind === "habit" || l.kind === "todo")).length;
  const cons = consistency(g, id, 7, end);
  const now = lastDays(g, id, 7, end);
  const was = lastDays(g, id, 7, addDays(end, -7));
  let best: { d: string; gain: number } | null = null;
  for (const d of ACTIVE_DIMS) {
    const a = now.dims[d].score;
    const b = was.dims[d].score;
    if (a !== null && b !== null && a - b > 0 && (!best || a - b > best.gain)) best = { d: DIM[d].short, gain: a - b };
  }
  const week = g.members.map((m) => ({ id: m.id, a: auraBetween(userLogs(g, m.id), start, end) }));
  const mine = week.find((x) => x.id === id)?.a ?? 0;
  const place = mine > 0 && week.length > 1 ? 1 + week.filter((x) => x.a > mine).length : 0;
  return `Last week: +${aura} Aura, ${quests} ${quests === 1 ? "quest" : "quests"}, ${cons}% consistency.`
    + (best ? ` Biggest gain: ${best.d} +${best.gain}.` : "")
    + (place ? ` You finished #${place} of ${week.length}.` : "");
}

/**
 * Time-based reminders: the daily nudge at each cousin's chosen time,
 * personal habit reminders, challenges and team quests ending tomorrow, and
 * Monday's weekly summary.
 */
export function runSchedule(db: DB, now = Date.now()) {
  const t = today(now);
  const hour = indiaHour(now);
  const game = fullGame(db);
  const tomorrow = addDays(t, 1);
  for (const u of db.users) {
    if (!reachable(u)) continue;
    const p = prefsOf(u);
    const plan = dailyPlan(game, u.id, u.dailyGoal ?? "auto", t);
    if (hour >= p.reminderHour) {
      const openHabits = plan.due.length - plan.doneCount;
      const openTodos = plan.todos.filter((x) => !x.done).length;
      if (p.kinds.habits && openHabits > 0 && !plan.rested) {
        enqueue(db, u.id, { kind: "habits", dedupe: `daily:${t}`, ...MESSAGES.habits(first(u.name), openHabits, plan.available, p.kinds.quests ? openTodos : 0) }, now);
      } else if (p.kinds.quests && openTodos > 0) {
        enqueue(db, u.id, { kind: "quests", dedupe: `quests:${t}`, ...MESSAGES.quests(first(u.name), openTodos) }, now);
      }
      if (weekday(t) === 0) enqueue(db, u.id, { kind: "recap", dedupe: `recap:${weekStart(t)}`, ...MESSAGES.recap(first(u.name), weeklySummary(game, u.id, t)) }, now);
    }
    // habits with their own reminder time
    if (!plan.rested) {
      for (const h of habitsFor(game, u.id, t)) {
        if (h.remindAt === undefined || hour < h.remindAt || !isDue(h, t) || habitDone(game, u.id, h.id, t)) continue;
        enqueue(db, u.id, { kind: "habits", dedupe: `habit:${h.id}:${t}`, ...MESSAGES.habit(h.title, h.xp) }, now);
      }
    }
    for (const c of game.challenges) {
      if (c.endsOn === tomorrow && c.participants.length > 1 && c.participants.includes(u.id) && !c.completedBy.includes(u.id)) {
        enqueue(db, u.id, { kind: "missions", dedupe: `ending:${c.id}`, ...MESSAGES.ending(c.title) }, now);
      }
    }
    for (const sq of game.shares) {
      if (sq.mode === "team" && sq.endsOn === tomorrow && isLive(sq, t) && sq.members[u.id]?.status === "accepted" && (sq.target ?? 0) > 0) {
        enqueue(db, u.id, { kind: "missions", dedupe: `ending:${sq.id}`, ...MESSAGES.ending(sq.title, shareLink(sq.id)) }, now);
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
