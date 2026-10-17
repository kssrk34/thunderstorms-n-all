import type { NextRequest } from "next/server";
import { clearSessionCookie, endSession } from "@/lib/server/auth";
import { fail, handleError, ok, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  try {
    await endSession(req);
    const res = ok({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
