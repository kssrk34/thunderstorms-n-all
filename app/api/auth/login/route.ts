import type { NextRequest } from "next/server";
import { dummyPasswordHash, setSessionCookie, startSession, verifyPassword } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  const body = await readJson<{ username?: string; password?: string }>(req);
  if (!body) return fail(400, "Invalid request.");
  const username = String(body.username ?? "").trim().toLowerCase().slice(0, 40);
  const password = String(body.password ?? "").slice(0, 200);
  const ip = clientIp(req);
  if (!allow(`login:${ip}`, 30, 15 * 60_000) || !allow(`login:${ip}:${username}`, 8, 15 * 60_000)) {
    return fail(429, "Too many attempts. Please wait a few minutes and try again.");
  }
  try {
    const user = await readDb((db) => db.users.find((u) => u.username === username));
    const valid = user ? await verifyPassword(password, user.passHash) : (await verifyPassword(password, await dummyPasswordHash()), false);
    if (!user || !valid) return fail(401, "That username and password don't match.");
    const token = await writeDb((db) => startSession(db, user.id));
    const res = ok({ ok: true, onboarded: user.onboarded });
    setSessionCookie(res, token, req);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
