import type { NextRequest } from "next/server";
import { RESET_HOURS, newResetToken } from "@/lib/server/auth";
import { ApiError, readDb, writeDb, type DB } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const ORGANISER_ONLY = "Only the organiser can reset passwords.";

const pending = (db: DB) => db.resets.filter((r) => r.expiresAt > Date.now()).map((r) => ({ userId: r.userId, expiresAt: r.expiresAt }));

export async function GET(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (user.role !== "admin") return fail(403, ORGANISER_ONLY);
    return ok({ pending: await readDb(pending) });
  });
}

/** The organiser makes a single-use link for a cousin who forgot their password. A new link replaces any earlier one. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (user.role !== "admin") return fail(403, ORGANISER_ONLY);
    const body = await readJson<{ userId?: string }>(req);
    const userId = String(body?.userId ?? "");
    const { token, id } = newResetToken();
    const out = await writeDb((db) => {
      if (userId === user.id) throw new ApiError(400, "To reset your own password, use your setup code on the Forgot password screen.");
      if (!db.users.some((u) => u.id === userId)) throw new ApiError(404, "That cousin isn't in the squad.");
      const now = Date.now();
      db.resets = db.resets.filter((r) => r.expiresAt > now && r.userId !== userId);
      db.resets.push({ id, userId, createdBy: user.id, createdAt: now, expiresAt: now + RESET_HOURS * 3_600_000 });
      return { token, pending: pending(db) };
    });
    return ok(out);
  }, { write: true });
}

export async function DELETE(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (user.role !== "admin") return fail(403, ORGANISER_ONLY);
    const userId = req.nextUrl.searchParams.get("userId");
    const out = await writeDb((db) => {
      db.resets = db.resets.filter((r) => r.userId !== userId);
      return { pending: pending(db) };
    });
    return ok(out);
  }, { write: true });
}
