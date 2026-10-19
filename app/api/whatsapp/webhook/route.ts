import { NextResponse, type NextRequest } from "next/server";
import { writeDb } from "@/lib/server/db";
import { applyReceipt, prefsOf } from "@/lib/server/notify";
import { validSignature } from "@/lib/server/whatsapp";

export const dynamic = "force-dynamic";

/** Meta calls this once with a challenge when the webhook is set up in the app dashboard. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new NextResponse(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface Receipt { id: string; status: string; errors?: { code?: number; title?: string; message?: string }[] }
interface Inbound { from: string; text?: { body?: string }; button?: { text?: string } }
interface Payload { entry?: { changes?: { value?: { statuses?: Receipt[]; messages?: Inbound[] } }[] }[] }

/**
 * Delivery receipts (sent, delivered, read, failed) and replies. Replying
 * STOP turns WhatsApp off for that cousin. Requests must carry Meta's signature.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("Bad signature", { status: 401 });
  let body: Payload;
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad request", { status: 400 }); }

  const statuses: Receipt[] = [];
  const stops: string[] = [];
  for (const e of body.entry ?? []) for (const c of e.changes ?? []) {
    for (const s of c.value?.statuses ?? []) statuses.push(s);
    for (const m of c.value?.messages ?? []) {
      const text = (m.text?.body ?? m.button?.text ?? "").trim().toLowerCase();
      if (["stop", "unsubscribe", "stop all"].includes(text)) stops.push(`+${m.from.replace(/^\+/, "")}`);
    }
  }
  if (statuses.length || stops.length) {
    await writeDb((db) => {
      for (const s of statuses) applyReceipt(db, s.id, s.status, s.errors?.[0] ? `${s.errors[0].code ?? ""} ${s.errors[0].title ?? s.errors[0].message ?? ""}`.trim() : undefined);
      for (const phone of stops) {
        for (const u of db.users) if (u.notify?.phone === phone) u.notify = { ...prefsOf(u), whatsapp: false };
      }
    });
  }
  return NextResponse.json({ ok: true });
}
