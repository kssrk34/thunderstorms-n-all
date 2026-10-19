import type { NextRequest } from "next/server";
import { ApiError, readDb, writeDb } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";
import { ensureUnsubToken, notifySummary } from "@/lib/server/notify-api";
import { prefsOf } from "@/lib/server/notify";
import type { NotifyPrefs } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const needsToken = await readDb((db) => !db.users.find((u) => u.id === user.id)?.unsubToken);
    if (needsToken) await writeDb((db) => { ensureUnsubToken(db.users.find((u) => u.id === user.id)!); });
    return ok(await readDb((db) => notifySummary(db, db.users.find((u) => u.id === user.id)!)));
  });
}

type Patch = Partial<Pick<NotifyPrefs, "whatsapp" | "push" | "quietStart" | "quietEnd" | "dailyLimit" | "reminderHour">> & { kinds?: Partial<NotifyPrefs["kinds"]> };
const hour = (v: unknown) => Math.min(23, Math.max(0, Math.round(Number(v) || 0)));

/** Changes the signed-in cousin's own notification choices. */
export async function PATCH(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const p = await readJson<Patch>(req);
    if (!p) return fail(400, "Invalid request.");
    const out = await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      const n = prefsOf(u);
      if (p.whatsapp !== undefined) {
        if (p.whatsapp && !n.phone) throw new ApiError(400, "Add your mobile number first.");
        n.whatsapp = !!p.whatsapp;
        if (n.whatsapp) n.whatsappAt = Date.now();
      }
      if (p.push === false) { n.push = false; u.pushSubs = []; }
      if (p.kinds) for (const k of Object.keys(n.kinds) as (keyof NotifyPrefs["kinds"])[]) if (typeof p.kinds[k] === "boolean") n.kinds[k] = p.kinds[k]!;
      if (p.quietStart !== undefined) n.quietStart = hour(p.quietStart);
      if (p.quietEnd !== undefined) n.quietEnd = hour(p.quietEnd);
      if (p.dailyLimit !== undefined) n.dailyLimit = Math.min(5, Math.max(1, Math.round(Number(p.dailyLimit) || 3)));
      if (p.reminderHour !== undefined) n.reminderHour = Math.min(21, Math.max(5, hour(p.reminderHour)));
      u.notify = n;
      ensureUnsubToken(u);
      return notifySummary(db, u);
    });
    return ok(out);
  }, { write: true });
}
