import { MAX_MEMBERS } from "@/lib/catalog";
import { readDb } from "@/lib/server/db";
import { handleError, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: is this a brand-new squad that still needs its first account? */
export async function GET() {
  try {
    const members = await readDb((db) => db.users.length);
    return ok({ needsSetup: members === 0, members, max: MAX_MEMBERS });
  } catch (e) {
    return handleError(e);
  }
}
