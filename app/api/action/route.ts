import type { NextRequest } from "next/server";
import { applyAction, type Action } from "@/lib/reducer";
import { toStored } from "@/lib/seed";
import { writeDb } from "@/lib/server/db";
import { afterAction } from "@/lib/server/events";
import { allow, fail, ok, readJson, withUser } from "@/lib/server/http";
import { processOutbox } from "@/lib/server/notify";
import { fullGame, viewFor } from "@/lib/server/view";

export const dynamic = "force-dynamic";

/**
 * Applies one game action as the signed-in cousin. The server is the source
 * of truth: the reducer checks ownership and computes every Aura Point.
 */
export async function POST(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    if (!allow(`action:${user.id}`, 120, 60_000)) return fail(429, "That's a lot of taps. Give it a few seconds.");
    const body = await readJson<{ action?: Action }>(req);
    if (!body?.action) return fail(400, "Invalid request.");
    const { view, queued } = await writeDb((db) => {
      const prev = fullGame(db);
      const before = db.outbox?.length ?? 0;
      let next = applyAction(prev, body.action!, user.id, { admin: user.role === "admin" });
      next = afterAction(db, prev, next, user.id);
      db.game = toStored(next);
      db.rev++;
      return { view: viewFor(db, user.id), queued: (db.outbox?.length ?? 0) > before };
    });
    if (queued) await processOutbox().catch((e) => console.error("[thunderstorms] outbox", e));
    return ok(view);
  }, { write: true });
}
