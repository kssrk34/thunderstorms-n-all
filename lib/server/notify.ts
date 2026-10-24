import { NOTIFY_KINDS, NOTIFY_OFF_BY_DEFAULT } from "../catalog";
import type { NotifyCategory, NotifyPrefs, OutboxItem } from "../types";
import { indiaHour, msUntilIndiaHour, today, uid } from "../utils";
import { readDb, writeDb, type DB, type UserRecord } from "./db";
import { pushConfig, pushReady, sendPush } from "./push";
import { sendTemplate, whatsappReady } from "./whatsapp";

/**
 * Notifications outside the app (WhatsApp and browser push) go through an
 * outbox stored with the squad's data:
 *
 * - Nothing is sent unless the cousin opted in to that channel and that kind.
 * - Each event has a dedupe key, so it can never produce two messages.
 * - Quiet hours delay a message; the daily limit drops it (recorded as skipped).
 * - Delivery happens on the server only. Status moves queued → sending →
 *   sent → delivered/read (from WhatsApp's webhook), or failed with the reason.
 * - When WhatsApp isn't configured, an opted-in cousin's messages are recorded
 *   as "simulated" so they can preview them. They are never marked sent.
 */

export const defaultKinds = () => Object.fromEntries(NOTIFY_KINDS.map((k) => [k.id, !NOTIFY_OFF_BY_DEFAULT.includes(k.id)])) as Record<NotifyCategory, boolean>;
export const defaultPrefs = (): NotifyPrefs => ({
  whatsapp: false,
  push: false,
  kinds: defaultKinds(),
  quietStart: 22,
  quietEnd: 8,
  dailyLimit: 3,
  reminderHour: 9,
});
/** A cousin's settings with defaults filled in. Only the current categories are kept. */
export function prefsOf(u: UserRecord): NotifyPrefs {
  const stored = (u.notify?.kinds ?? {}) as Partial<Record<string, boolean>>;
  const kinds = defaultKinds();
  for (const k of Object.keys(kinds) as NotifyCategory[]) if (typeof stored[k] === "boolean") kinds[k] = stored[k]!;
  return { ...defaultPrefs(), ...u.notify, kinds };
}

/** Whether this cousin has any channel that could receive a message. */
export function reachable(u: UserRecord): boolean {
  const p = prefsOf(u);
  return (p.whatsapp && !!p.phone) || (p.push && !!u.pushSubs?.length);
}

const OUTBOX_MAX = 500;
const KEEP_DAYS = 30;
const DEDUPE_DAYS = 8;
const COUNTED = new Set(["queued", "sending", "sent", "delivered", "read", "simulated"]);

function inQuiet(h: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? h >= start && h < end : h >= start || h < end;
}

export interface Message {
  kind: NotifyCategory | "test";
  dedupe: string;
  /** the notification's headline on a phone; defaults to the app name */
  title?: string;
  body: string;
  url?: string;
  template?: { name: string; params: string[] };
}

/** Queues a message for one cousin on every channel they've enabled. Runs inside a database write. */
export function enqueue(db: DB, userId: string, msg: Message, now = Date.now()): OutboxItem[] {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return [];
  const p = prefsOf(u);
  if (msg.kind !== "test" && !p.kinds[msg.kind]) return [];
  db.outbox ??= [];

  const channels: { channel: OutboxItem["channel"]; status: OutboxItem["status"]; error?: string }[] = [];
  // WhatsApp only carries approved templates; messages without one go to push only
  if (p.whatsapp && p.phone && msg.template) {
    if (!whatsappReady()) channels.push({ channel: "whatsapp", status: "simulated" });
    else if (p.phoneVerified) channels.push({ channel: "whatsapp", status: "queued" });
  }
  if (p.push && u.pushSubs?.length && pushReady()) channels.push({ channel: "push", status: "queued" });
  if (!channels.length) return [];

  const recent = now - DEDUPE_DAYS * 86_400_000;
  const day = today(now);
  const sentToday = new Set(db.outbox.filter((o) => o.userId === userId && today(o.createdAt) === day && COUNTED.has(o.status)).map((o) => o.dedupe));
  const overLimit = !sentToday.has(msg.dedupe) && sentToday.size >= p.dailyLimit && msg.kind !== "test";
  const quiet = inQuiet(indiaHour(now), p.quietStart, p.quietEnd) && msg.kind !== "test";
  const notBefore = quiet ? now + msUntilIndiaHour(p.quietEnd, now) : now;

  const added: OutboxItem[] = [];
  for (const c of channels) {
    if (db.outbox.some((o) => o.userId === userId && o.dedupe === msg.dedupe && o.channel === c.channel && o.createdAt > recent)) continue;
    const item: OutboxItem = {
      id: uid() + uid().slice(0, 4), userId, kind: msg.kind, channel: c.channel, dedupe: msg.dedupe, createdAt: now, notBefore, updatedAt: now,
      status: overLimit ? "skipped" : c.status, attempts: 0, title: msg.title, body: msg.body, url: msg.url, template: msg.template,
      ...(overLimit ? { error: `Daily limit of ${p.dailyLimit} reached` } : quiet && c.status === "queued" ? { error: "Waiting for quiet hours to end" } : {}),
    };
    db.outbox.push(item);
    added.push(item);
  }
  prune(db, now);
  return added;
}

function prune(db: DB, now: number) {
  const cutoff = now - KEEP_DAYS * 86_400_000;
  db.outbox = db.outbox.filter((o) => o.createdAt > cutoff || o.status === "queued").slice(-OUTBOX_MAX);
}

/* ------------------------------------------------------------------ */
/* delivery                                                            */
/* ------------------------------------------------------------------ */
const LEASE_MS = 2 * 60_000;
const MAX_ATTEMPTS = 3;
const BATCH = 10;

const due = (o: OutboxItem, now: number) => (o.status === "queued" && o.notBefore <= now) || (o.status === "sending" && now - o.updatedAt > LEASE_MS);

/**
 * Delivers whatever is due. Items are claimed with a write first, so two
 * server instances never send the same message. Safe to call often: it
 * returns at once when there's nothing to do.
 */
export async function processOutbox(now = Date.now()): Promise<number> {
  if (!whatsappReady() && !pushReady()) return 0;
  const any = await readDb((db) => (db.outbox ?? []).some((o) => due(o, now)));
  if (!any) return 0;

  const claimed = await writeDb((db) => {
    const out: { item: OutboxItem; phone?: string; subs?: UserRecord["pushSubs"] }[] = [];
    for (const o of db.outbox ?? []) {
      if (out.length >= BATCH || !due(o, now)) continue;
      const u = db.users.find((x) => x.id === o.userId);
      const p = u && prefsOf(u);
      // consent can change while a message waits
      const allowed = p && (o.channel === "whatsapp" ? p.whatsapp && p.phoneVerified && !!p.phone : p.push && !!u?.pushSubs?.length);
      if (!allowed) { o.status = "skipped"; o.error = "Turned off before it was sent"; o.updatedAt = now; continue; }
      o.status = "sending";
      o.updatedAt = now;
      o.attempts++;
      out.push({ item: { ...o }, phone: p.phone, subs: u?.pushSubs });
    }
    return out;
  });
  if (!claimed.length) return 0;

  const results = await Promise.all(claimed.map(async ({ item, phone, subs }) => {
    if (item.channel === "whatsapp") {
      const r = item.template && phone ? await sendTemplate(phone, item.template.name, item.template.params) : { ok: false, error: "No template for this message" };
      return { id: item.id, ...r, gone: [] as string[] };
    }
    const gone: string[] = [];
    let ok = false, error: string | undefined, retry = false;
    for (const sub of subs ?? []) {
      // the id lets the service worker confirm the notification was actually shown (see /api/notify/receipt)
      const r = await sendPush(sub, { id: item.id, title: item.title ?? "Thunderstorms 'n' All", body: item.body, url: item.url ?? "/", tag: item.dedupe.slice(0, 60) });
      if (r.ok) ok = true;
      else { if (r.gone) gone.push(sub.endpoint); error = r.error; retry ||= !!r.retry; }
    }
    return { id: item.id, ok, error: ok ? undefined : error, retry: !ok && retry, gone, providerId: undefined as string | undefined };
  }));

  await writeDb((db) => {
    for (const r of results) {
      const o = db.outbox.find((x) => x.id === r.id);
      if (!o) continue;
      o.updatedAt = Date.now();
      if (r.ok) { o.status = "sent"; delete o.error; if ("id" in r && r.id && o.channel === "whatsapp") o.providerId = r.id as string; }
      else if (r.retry && o.attempts < MAX_ATTEMPTS) { o.status = "queued"; o.notBefore = Date.now() + 2 ** o.attempts * 60_000; o.error = r.error; }
      else { o.status = "failed"; o.error = r.error; }
      if (r.gone.length) {
        const u = db.users.find((x) => x.id === o.userId);
        if (u?.pushSubs) {
          u.pushSubs = u.pushSubs.filter((s) => !r.gone.includes(s.endpoint));
          if (!u.pushSubs.length && u.notify) u.notify.push = false;
        }
      }
    }
  });
  return results.length;
}

/** Applies a WhatsApp delivery receipt from the webhook. Statuses only move forward. */
export function applyReceipt(db: DB, providerId: string, status: string, error?: string): boolean {
  const o = (db.outbox ?? []).find((x) => x.providerId === providerId);
  if (!o) return false;
  const order = ["sent", "delivered", "read"];
  if (status === "failed") { o.status = "failed"; o.error = (error ?? "Delivery failed").slice(0, 180); }
  else if (order.includes(status) && order.indexOf(status) > order.indexOf(o.status)) o.status = status as OutboxItem["status"];
  o.updatedAt = Date.now();
  return true;
}

export const channelStatus = () => {
  const push = pushConfig();
  return { whatsapp: whatsappReady(), push: !!push, publicKey: push?.publicKey };
};
