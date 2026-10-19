import type { NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { maybeSchedule } from "@/lib/server/events";
import { ok, withUser } from "@/lib/server/http";
import { viewFor } from "@/lib/server/view";
import { today } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The signed-in cousin's view. Pass ?rev=N&day=YYYY-MM-DD to get a tiny
 * "unchanged" reply when nothing moved (scores also move when the day turns).
 */
export async function GET(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    // reminders ride along on normal traffic; this returns at once when nothing is due
    await maybeSchedule().catch((e) => console.error("[thunderstorms] schedule", e));
    const since = Number(req.nextUrl.searchParams.get("rev"));
    const day = req.nextUrl.searchParams.get("day");
    return ok(await readDb((db) => (db.rev === since && day === today() ? { rev: db.rev, unchanged: true } : viewFor(db, user.id))));
  });
}
