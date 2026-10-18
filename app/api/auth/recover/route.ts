import type { NextRequest } from "next/server";
import { hashPassword, replacePassword, sameSecret, setSessionCookie } from "@/lib/server/auth";
import { ApiError, normaliseCode, writeDb } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const HOUR = 3_600_000;
/** Wrong codes allowed per hour across every server instance, so serverless can't dodge the limit. */
const MAX_FAILS = 10;

/** The organiser's recovery key is the setup code in the hosting settings, when it's long enough to be safe. */
function recoveryCode(): string | null {
  const code = normaliseCode(process.env.TNA_SETUP_CODE);
  return code.replace(/-/g, "").length >= 8 ? code : null;
}

/** Public: lets the organiser choose a new password with the setup code, then signs in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  if (!allow(`recover:${clientIp(req)}`, 5, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
  const body = await readJson<{ code?: string; password?: string }>(req);
  if (!body) return fail(400, "Invalid request.");
  const password = String(body.password ?? "");
  if (password.length < 8) return fail(400, "Use at least 8 characters for your new password.");
  if (password.length > 200) return fail(400, "That password is too long.");
  const setup = recoveryCode();
  if (!setup) return fail(403, "Organiser recovery isn't turned on. Set TNA_SETUP_CODE (at least 8 letters or numbers) in your hosting settings, redeploy, then try again.");

  try {
    const passHash = await hashPassword(password);
    const out = await writeDb((db) => {
      const now = Date.now();
      const tries = db.meta.recovery && now - db.meta.recovery.since < HOUR ? db.meta.recovery : { fails: 0, since: now };
      if (tries.fails >= MAX_FAILS) throw new ApiError(429, "Too many wrong codes. Organiser recovery is paused for up to an hour.");
      const admin = db.users.find((u) => u.role === "admin");
      if (!admin) throw new ApiError(404, "There's no organiser account yet. Tap Get Started to create it.");
      if (!sameSecret(normaliseCode(body.code), setup)) {
        // returned rather than thrown, so the failed attempt is saved
        db.meta.recovery = { fails: tries.fails + 1, since: tries.since };
        return null;
      }
      delete db.meta.recovery;
      return { token: replacePassword(db, req, admin.id, passHash), onboarded: admin.onboarded };
    });
    if (!out) return fail(403, "That setup code isn't right.");
    const res = ok({ ok: true, onboarded: out.onboarded });
    setSessionCookie(res, out.token, req);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
