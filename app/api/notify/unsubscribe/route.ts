import { NextResponse, type NextRequest } from "next/server";
import { sameSecret } from "@/lib/server/auth";
import { writeDb } from "@/lib/server/db";
import { allow, clientIp } from "@/lib/server/http";
import { prefsOf } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

const page = (title: string, body: string) => new NextResponse(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
  `<body style="margin:0;min-height:100dvh;display:grid;place-items:center;background:#070A12;color:#E8EEFA;font:16px/1.5 -apple-system,Segoe UI,sans-serif">` +
  `<main style="max-width:26rem;padding:2rem;text-align:center"><h1 style="font-size:1.5rem;margin:0 0 .5rem">${title}</h1><p style="color:#9AA6BF;margin:0 0 1.5rem">${body}</p>` +
  `<a href="/profile?tab=alerts" style="color:#6FA8FF">Notification settings</a></main></body>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
);

/** One-tap unsubscribe from WhatsApp and push, from a link. Works without signing in. */
export async function GET(req: NextRequest) {
  if (!allow(`unsub:${clientIp(req)}`, 20, 15 * 60_000)) return page("Slow down", "Too many attempts. Please try again in a few minutes.");
  const id = req.nextUrl.searchParams.get("u") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const done = await writeDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u?.unsubToken || !token || !sameSecret(token, u.unsubToken)) return false;
    u.notify = { ...prefsOf(u), whatsapp: false, push: false };
    u.pushSubs = [];
    return true;
  });
  return done
    ? page("You're unsubscribed", "You won't get WhatsApp or push notifications from Thunderstorms 'n' All. You can turn them back on any time.")
    : page("Link not recognised", "This unsubscribe link isn't valid. You can turn notifications off in your settings.");
}
