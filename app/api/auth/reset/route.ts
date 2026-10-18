import type { NextRequest } from "next/server";
import { findReset, hashPassword, replacePassword, setSessionCookie } from "@/lib/server/auth";
import { ApiError, writeDb } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: sets a new password with a reset link from the organiser, then signs in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  if (!allow(`reset:${clientIp(req)}`, 30, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
  const body = await readJson<{ token?: string; password?: string }>(req);
  if (!body) return fail(400, "Invalid request.");
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (password.length < 8) return fail(400, "Use at least 8 characters for your new password.");
  if (password.length > 200) return fail(400, "That password is too long.");

  try {
    const passHash = await hashPassword(password);
    const out = await writeDb((db) => {
      const found = findReset(db, token);
      if (!found) throw new ApiError(403, "This reset link has expired or was already used. Ask the organiser for a fresh one.");
      return { token: replacePassword(db, req, found.user.id, passHash), onboarded: found.user.onboarded };
    });
    const res = ok({ ok: true, onboarded: out.onboarded });
    setSessionCookie(res, out.token, req);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
