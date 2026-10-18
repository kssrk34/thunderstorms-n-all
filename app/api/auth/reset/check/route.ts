import type { NextRequest } from "next/server";
import { findReset } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: tells the reset screen whose password a link is for. A POST, so the token stays out of URLs and logs. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  if (!allow(`reset:${clientIp(req)}`, 30, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
  const body = await readJson<{ token?: string }>(req);
  try {
    const found = await readDb((db) => findReset(db, String(body?.token ?? "")));
    return ok(found ? { valid: true, name: found.user.name, username: found.user.username } : { valid: false });
  } catch (e) {
    return handleError(e);
  }
}
