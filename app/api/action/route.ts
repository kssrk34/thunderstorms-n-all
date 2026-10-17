import type { NextRequest } from "next/server";
import { applyAction, type Action } from "@/lib/reducer";
import { toStored } from "@/lib/seed";
import { writeDb } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";
import { fullGame, viewFor } from "@/lib/server/view";

export const dynamic = "force-dynamic";

/** Applies one game action as the signed-in cousin. The server is the source of truth. */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const body = await readJson<{ action?: Action }>(req);
    if (!body?.action) return fail(400, "Invalid request.");
    const view = await writeDb((db) => {
      const next = applyAction(fullGame(db), body.action!, user.id, { admin: user.role === "admin" });
      db.game = toStored(next);
      db.rev++;
      return viewFor(db, user.id);
    });
    return ok(view);
  }, { write: true });
}
