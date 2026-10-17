import type { NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { ok, withUser } from "@/lib/server/http";
import { viewFor } from "@/lib/server/view";

export const dynamic = "force-dynamic";

/** The signed-in cousin's view. Pass ?rev=N to get a tiny "unchanged" reply when nothing moved. */
export async function GET(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const since = Number(req.nextUrl.searchParams.get("rev"));
    return ok(await readDb((db) => (db.rev === since ? { rev: db.rev, unchanged: true } : viewFor(db, user.id))));
  });
}
