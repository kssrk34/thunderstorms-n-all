import type { NextRequest } from "next/server";
import { AVATAR_EMOJIS, MEMBER_COLORS } from "@/lib/catalog";
import { writeDb } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";
import { viewFor } from "@/lib/server/view";

export const dynamic = "force-dynamic";

const PHOTO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO = 400_000;

interface Patch { name?: string; emoji?: string; color?: string; photo?: string | null; bio?: string; interests?: string[]; onboarded?: boolean }

export async function PATCH(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const p = await readJson<Patch>(req, MAX_PHOTO + 10_000);
    if (!p) return fail(400, "Invalid request.");
    const line = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

    if (p.name !== undefined && !line(p.name, 40)) return fail(400, "Your name can't be empty.");
    if (p.emoji !== undefined && !AVATAR_EMOJIS.includes(p.emoji)) return fail(400, "Pick one of the avatars.");
    if (p.color !== undefined && !MEMBER_COLORS.includes(p.color)) return fail(400, "Pick one of the colours.");
    if (p.photo && (p.photo.length > MAX_PHOTO || !PHOTO.test(p.photo))) return fail(400, "That photo couldn't be used. Try a smaller JPEG or PNG.");

    const view = await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      if (p.name !== undefined) u.name = line(p.name, 40);
      if (p.emoji !== undefined) u.emoji = p.emoji;
      if (p.color !== undefined) u.color = p.color;
      if (p.photo !== undefined) {
        if (p.photo) { u.photo = p.photo; u.photoV = Date.now(); }
        else { delete u.photo; delete u.photoV; }
      }
      if (p.bio !== undefined) u.bio = line(p.bio, 160) || undefined;
      if (p.interests !== undefined) u.interests = (Array.isArray(p.interests) ? p.interests : []).map((x) => line(x, 24)).filter(Boolean).slice(0, 12);
      if (p.onboarded !== undefined) u.onboarded = !!p.onboarded;
      db.rev++;
      return viewFor(db, u.id);
    });
    return ok(view);
  }, { write: true });
}
