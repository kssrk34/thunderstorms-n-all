import type { NextRequest } from "next/server";
import { MAX_MEMBERS } from "@/lib/catalog";
import { ApiError, makeCode, normaliseCode, readDb, writeDb, type DB } from "@/lib/server/db";
import { fail, ok, withUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const INVITE_DAYS = 7;

function summary(db: DB, me: string, admin: boolean) {
  const now = Date.now();
  const active = db.invites.filter((i) => !i.usedBy && i.expiresAt > now);
  return {
    members: db.users.length,
    max: MAX_MEMBERS,
    open: Math.max(0, MAX_MEMBERS - db.users.length - active.length),
    invites: active
      .filter((i) => admin || i.createdBy === me)
      .map((i) => ({ code: i.code, expiresAt: i.expiresAt, by: db.users.find((u) => u.id === i.createdBy)?.name ?? "", mine: i.createdBy === me })),
  };
}

export async function GET(req: NextRequest) {
  return withUser(req, async ({ user }) => ok(await readDb((db) => summary(db, user.id, user.role === "admin"))));
}

/** Any cousin can invite the next one, until all five spots are spoken for. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const out = await writeDb((db) => {
      const now = Date.now();
      db.invites = db.invites.filter((i) => i.usedBy || i.expiresAt > now);
      const active = db.invites.filter((i) => !i.usedBy).length;
      if (db.users.length + active >= MAX_MEMBERS) throw new ApiError(403, "Every spot is already taken or has an invitation waiting.");
      let code = makeCode();
      while (db.invites.some((i) => i.code === code)) code = makeCode();
      db.invites.push({ code, createdBy: user.id, createdAt: now, expiresAt: now + INVITE_DAYS * 86_400_000 });
      return { code, ...summary(db, user.id, user.role === "admin") };
    });
    return ok(out);
  }, { write: true });
}

export async function DELETE(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const code = normaliseCode(req.nextUrl.searchParams.get("code"));
    const out = await writeDb((db) => {
      const inv = db.invites.find((i) => i.code === code && !i.usedBy);
      if (!inv) throw new ApiError(404, "That invitation no longer exists.");
      if (inv.createdBy !== user.id && user.role !== "admin") throw new ApiError(403, "Only the cousin who sent it can cancel this invitation.");
      db.invites = db.invites.filter((i) => i !== inv);
      return summary(db, user.id, user.role === "admin");
    });
    return out ? ok(out) : fail(404, "Not found.");
  }, { write: true });
}
