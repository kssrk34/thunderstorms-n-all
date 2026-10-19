import type { NextRequest } from "next/server";
import { sameSecret } from "@/lib/server/auth";
import { ApiError, writeDb } from "@/lib/server/db";
import { allow, fail, ok, readJson, withUser } from "@/lib/server/http";
import { codeHash, notifySummary } from "@/lib/server/notify-api";
import { prefsOf } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

const MAX_TRIES = 5;

/** Confirms the code sent to the cousin's WhatsApp, which proves the number is theirs. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!allow(`verify:${user.id}`, 15, 60 * 60_000)) return fail(429, "Too many attempts. Try again in a little while.");
    const body = await readJson<{ code?: string }>(req);
    const code = String(body?.code ?? "").replace(/\D/g, "");
    if (code.length !== 6) return fail(400, "Enter the six-digit code from WhatsApp.");
    const out = await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      const pc = u.phoneCode;
      const n = prefsOf(u);
      if (!pc || pc.expiresAt < Date.now() || pc.phone !== n.phone) throw new ApiError(400, "That code has expired. Send a new one.");
      if (pc.tries >= MAX_TRIES) throw new ApiError(429, "Too many wrong codes. Send a new one.");
      if (!sameSecret(codeHash(u.id, code), pc.hash)) {
        pc.tries++;
        return null;
      }
      n.phoneVerified = true;
      u.notify = n;
      delete u.phoneCode;
      return notifySummary(db, u);
    });
    return out ? ok(out) : fail(400, "That code isn't right.");
  }, { write: true });
}
