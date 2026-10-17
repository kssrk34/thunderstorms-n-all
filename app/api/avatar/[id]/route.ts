import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { fail, withUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Profile pictures, visible to signed-in cousins only. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withUser(req, async () => {
    const photo = await readDb((db) => db.users.find((u) => u.id === params.id)?.photo);
    const m = photo?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!m) return fail(404, "No photo.");
    return new NextResponse(Buffer.from(m[2], "base64"), {
      headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  });
}
