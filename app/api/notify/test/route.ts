import type { NextRequest } from "next/server";
import { writeDb } from "@/lib/server/db";
import { MESSAGES } from "@/lib/server/events";
import { allow, fail, ok, withUser } from "@/lib/server/http";
import { notifySummary } from "@/lib/server/notify-api";
import { enqueue, processOutbox } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

/** Sends a test message on every channel the cousin has turned on (or records a simulated one). */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!allow(`test:${user.id}`, 5, 60 * 60_000)) return fail(429, "That's enough tests for now. Try again later.");
    const added = await writeDb((db) => enqueue(db, user.id, { kind: "test", dedupe: `test:${Date.now()}`, ...MESSAGES.test() }).length);
    if (!added) return fail(400, "Turn on WhatsApp or push notifications first.");
    await processOutbox();
    return ok(await writeDb((db) => notifySummary(db, db.users.find((u) => u.id === user.id)!)));
  }, { write: true });
}
