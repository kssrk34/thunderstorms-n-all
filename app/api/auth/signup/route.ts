import type { NextRequest } from "next/server";
import { AVATAR_EMOJIS, MAX_MEMBERS, MEMBER_COLORS } from "@/lib/catalog";
import { hashPassword, setSessionCookie, startSession } from "@/lib/server/auth";
import { ApiError, normaliseCode, writeDb, type UserRecord } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok, readJson, sameOrigin } from "@/lib/server/http";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

const USERNAME = /^[a-z0-9_.]{3,20}$/;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  if (!allow(`signup:${clientIp(req)}`, 10, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
  const body = await readJson<{ code?: string; name?: string; username?: string; password?: string }>(req);
  if (!body) return fail(400, "Invalid request.");

  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const code = normaliseCode(body.code);
  if (!name) return fail(400, "What should we call you?");
  if (!USERNAME.test(username)) return fail(400, "Usernames are 3–20 characters: letters, numbers, dots or underscores.");
  if (password.length < 8) return fail(400, "Use at least 8 characters for your password.");
  if (password.length > 200) return fail(400, "That password is too long.");

  try {
    const passHash = await hashPassword(password);
    const token = await writeDb((db) => {
      if (db.users.length >= MAX_MEMBERS) throw new ApiError(403, "All five spots in the squad are taken.");
      if (db.users.some((u) => u.username === username)) throw new ApiError(409, "That username is taken. Try another.");
      const now = Date.now();
      const n = db.users.length;
      let role: UserRecord["role"] = "member";
      let invitedBy: string | undefined;
      const id = uid();
      if (n === 0) {
        const setup = normaliseCode(process.env.TNA_SETUP_CODE || db.meta.setupCode);
        if (!code || code !== setup) throw new ApiError(403, "That setup code isn't right. You'll find it in the server console.");
        role = "admin";
        delete db.meta.setupCode;
      } else {
        const inv = db.invites.find((i) => i.code === code && !i.usedBy && i.expiresAt > now);
        if (!inv) throw new ApiError(403, "That invitation isn't valid or has expired. Ask a cousin for a fresh one.");
        inv.usedBy = id;
        inv.usedAt = now;
        invitedBy = inv.createdBy;
      }
      db.users.push({
        id, username, name, passHash, role, invitedBy,
        emoji: AVATAR_EMOJIS[n % AVATAR_EMOJIS.length], color: MEMBER_COLORS[n % MEMBER_COLORS.length],
        onboarded: false, createdAt: now,
      });
      db.rev++;
      return startSession(db, id);
    });
    const res = ok({ ok: true });
    setSessionCookie(res, token, req);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
