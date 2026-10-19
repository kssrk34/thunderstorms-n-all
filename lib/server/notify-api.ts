import { createHash, randomBytes } from "crypto";
import type { OutboxItem } from "../types";
import type { DB, UserRecord } from "./db";
import { channelStatus, prefsOf } from "./notify";

/** What the Alerts screen needs: settings, which channels the server supports, and recent messages. */
export function notifySummary(db: DB, u: UserRecord) {
  const history: Omit<OutboxItem, "template" | "providerId" | "dedupe">[] = (db.outbox ?? [])
    .filter((o) => o.userId === u.id)
    .slice(-25)
    .reverse()
    .map(({ template: _t, providerId: _p, dedupe: _d, ...o }) => o);
  return {
    prefs: prefsOf(u),
    channels: channelStatus(),
    pushDevices: u.pushSubs?.length ?? 0,
    codePending: !!u.phoneCode && u.phoneCode.expiresAt > Date.now(),
    unsubscribe: u.unsubToken ? `/api/notify/unsubscribe?u=${u.id}&t=${u.unsubToken}` : null,
    history,
  };
}
export type NotifySummary = ReturnType<typeof notifySummary>;

export const ensureUnsubToken = (u: UserRecord) => (u.unsubToken ??= randomBytes(18).toString("base64url"));

/** Accepts +91 98765 43210, 098765 43210 or 9876543210; returns E.164, or null if it isn't a valid number. */
export function normalisePhone(input: unknown): string | null {
  const raw = String(input ?? "").replace(/[\s\-().]/g, "");
  if (!raw) return null;
  const e164 = raw.startsWith("+") ? raw : raw.startsWith("00") ? `+${raw.slice(2)}` : `+91${raw.replace(/^0+/, "")}`;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  if (e164.startsWith("+91") && !/^\+91[6-9]\d{9}$/.test(e164)) return null;
  return e164;
}

/** Phone codes are stored only as a hash tied to the account. */
export const codeHash = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("base64url");
