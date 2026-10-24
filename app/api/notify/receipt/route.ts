import type { NextRequest } from "next/server";
import { writeDb } from "@/lib/server/db";
import { allow, fail, ok, readJson, withUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Called by the service worker right after it shows a push notification on
 * this device. That's the only real proof of delivery, so only this moves a
 * push message from "sent" (accepted by the push service) to "delivered".
 */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!allow(`receipt:${user.id}`, 60, 60_000)) return fail(429, "Too many requests.");
    const body = await readJson<{ id?: unknown }>(req);
    const id = typeof body?.id === "string" && /^[a-z0-9]{6,24}$/.test(body.id) ? body.id : null;
    if (!id) return fail(400, "Invalid request.");
    const updated = await writeDb((db) => {
      const o = (db.outbox ?? []).find((x) => x.id === id && x.userId === user.id && x.channel === "push");
      if (!o || !["queued", "sending", "sent"].includes(o.status)) return false;
      o.status = "delivered";
      o.updatedAt = Date.now();
      delete o.error;
      return true;
    });
    return ok({ updated });
  }, { write: true });
}
