import type { NextRequest } from "next/server";
import { normaliseCode, readDb } from "@/lib/server/db";
import { allow, clientIp, fail, handleError, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: lets the sign-up screen greet an invited cousin by who invited them. */
export async function GET(req: NextRequest) {
  if (!allow(`check:${clientIp(req)}`, 30, 15 * 60_000)) return fail(429, "Too many attempts. Please wait a few minutes.");
  try {
    const code = normaliseCode(req.nextUrl.searchParams.get("code"));
    const out = await readDb((db) => {
      const inv = db.invites.find((i) => i.code === code && !i.usedBy && i.expiresAt > Date.now());
      return inv ? { valid: true, by: db.users.find((u) => u.id === inv.createdBy)?.name ?? "A cousin" } : { valid: false };
    });
    return ok(out);
  } catch (e) {
    return handleError(e);
  }
}
