import type { NextRequest } from "next/server";
import { writeDb } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";
import { notifySummary } from "@/lib/server/notify-api";
import { prefsOf } from "@/lib/server/notify";
import { pushReady } from "@/lib/server/push";

export const dynamic = "force-dynamic";

const MAX_DEVICES = 5;
const B64URL = /^[A-Za-z0-9_-]{8,200}={0,2}$/;

/** Saves this browser's push subscription for the signed-in cousin. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!pushReady()) return fail(400, "Push notifications aren't set up on the server yet.");
    const body = await readJson<{ subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }>(req);
    const sub = body?.subscription;
    let url: URL | null = null;
    try { url = sub?.endpoint ? new URL(sub.endpoint) : null; } catch { url = null; }
    if (!sub || !url || url.protocol !== "https:" || sub.endpoint!.length > 1000 || !B64URL.test(sub.keys?.p256dh ?? "") || !B64URL.test(sub.keys?.auth ?? "")) {
      return fail(400, "That push subscription isn't valid.");
    }
    return ok(await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      const rest = (u.pushSubs ?? []).filter((s) => s.endpoint !== sub.endpoint);
      u.pushSubs = [...rest, { endpoint: sub.endpoint!, keys: { p256dh: sub.keys!.p256dh!, auth: sub.keys!.auth! }, createdAt: Date.now() }].slice(-MAX_DEVICES);
      u.notify = { ...prefsOf(u), push: true };
      return notifySummary(db, u);
    }));
  }, { write: true });
}

/** Forgets one browser (?endpoint=…). Push turns off when no browsers are left. */
export async function DELETE(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const endpoint = req.nextUrl.searchParams.get("endpoint");
    return ok(await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      u.pushSubs = (u.pushSubs ?? []).filter((s) => s.endpoint !== endpoint);
      if (!u.pushSubs.length) u.notify = { ...prefsOf(u), push: false };
      return notifySummary(db, u);
    }));
  }, { write: true });
}
