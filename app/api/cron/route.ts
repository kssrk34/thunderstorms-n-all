import { NextResponse, type NextRequest } from "next/server";
import { sameSecret } from "@/lib/server/auth";
import { writeDb } from "@/lib/server/db";
import { runSchedule } from "@/lib/server/events";
import { handleError } from "@/lib/server/http";
import { processOutbox } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

/**
 * Daily reminders, called by Vercel Cron (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET it stays off, and
 * reminders go out only while cousins are using the app.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Set CRON_SECRET to enable scheduled reminders." }, { status: 503 });
  if (!sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    await writeDb((db) => runSchedule(db));
    const sent = await processOutbox();
    return NextResponse.json({ ok: true, processed: sent });
  } catch (e) {
    return handleError(e);
  }
}
