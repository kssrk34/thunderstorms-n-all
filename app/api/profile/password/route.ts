import type { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/server/auth";
import { writeDb } from "@/lib/server/db";
import { allow, fail, ok, readJson, withUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Changes the password and signs out every other device. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user, sessionId }) => {
    if (!allow(`pw:${user.id}`, 6, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
    const body = await readJson<{ current?: string; next?: string }>(req);
    const next = String(body?.next ?? "");
    if (!(await verifyPassword(String(body?.current ?? "").slice(0, 200), user.passHash))) return fail(400, "Your current password isn't right.");
    if (next.length < 8 || next.length > 200) return fail(400, "Use at least 8 characters for your new password.");
    const passHash = await hashPassword(next);
    await writeDb((db) => {
      db.users.find((u) => u.id === user.id)!.passHash = passHash;
      db.sessions = db.sessions.filter((s) => s.userId !== user.id || s.id === sessionId);
    });
    return ok({ ok: true });
  }, { write: true });
}
