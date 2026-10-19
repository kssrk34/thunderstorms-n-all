import { randomInt } from "crypto";
import type { NextRequest } from "next/server";
import { ApiError, writeDb } from "@/lib/server/db";
import { allow, fail, ok, readJson, withUser } from "@/lib/server/http";
import { codeHash, normalisePhone, notifySummary } from "@/lib/server/notify-api";
import { prefsOf } from "@/lib/server/notify";
import { sendCode, whatsappReady } from "@/lib/server/whatsapp";

export const dynamic = "force-dynamic";

const CODE_MINUTES = 10;
const SENDS_PER_HOUR = 3;

/**
 * Links a mobile number. When WhatsApp is connected, a six-digit code is sent
 * to it on WhatsApp and the number counts as verified only once the code is
 * entered. Without WhatsApp the number is saved unverified, and nothing is
 * sent. `{ phone: null }` removes the number and turns WhatsApp off.
 */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!allow(`phone:${user.id}`, 10, 60 * 60_000)) return fail(429, "Too many attempts. Try again in a little while.");
    const body = await readJson<{ phone?: string | null }>(req);
    if (!body) return fail(400, "Invalid request.");

    if (body.phone === null) {
      return ok(await writeDb((db) => {
        const u = db.users.find((x) => x.id === user.id)!;
        const n = prefsOf(u);
        delete n.phone; delete n.phoneVerified; n.whatsapp = false;
        u.notify = n;
        delete u.phoneCode;
        return { ...notifySummary(db, u), sent: false };
      }));
    }

    const phone = normalisePhone(body.phone);
    if (!phone) return fail(400, "That doesn't look like a mobile number. Use 10 digits, or include the country code.");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const live = whatsappReady();

    const res = await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      const n = prefsOf(u);
      if (n.phone !== phone) { n.phone = phone; n.phoneVerified = false; }
      u.notify = n;
      if (!live || n.phoneVerified) return { send: false };
      const now = Date.now();
      const sentAt = (u.phoneCode?.sentAt ?? []).filter((t) => now - t < 60 * 60_000);
      if (sentAt.length >= SENDS_PER_HOUR) throw new ApiError(429, "We've sent a few codes already. Try again in an hour.");
      u.phoneCode = { hash: codeHash(u.id, code), phone, expiresAt: now + CODE_MINUTES * 60_000, tries: 0, sentAt: [...sentAt, now] };
      return { send: true };
    });

    let sent = false;
    if (res.send) {
      const r = await sendCode(phone, code);
      if (!r.ok) return fail(502, `WhatsApp couldn't deliver the code (${r.error}). Check the number and try again.`);
      sent = true;
    }
    return ok(await writeDb((db) => ({ ...notifySummary(db, db.users.find((x) => x.id === user.id)!), sent })));
  }, { write: true });
}
