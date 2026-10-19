import type { NextRequest } from "next/server";
import { CHARACTER, FRAMES } from "@/lib/catalog";
import { ApiError, writeDb } from "@/lib/server/db";
import { fail, ok, readJson, withUser } from "@/lib/server/http";
import { viewFor } from "@/lib/server/view";
import type { DailyGoal } from "@/lib/types";

export const dynamic = "force-dynamic";

const PHOTO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO = 400_000;
const GOALS: DailyGoal[] = ["auto", 50, 100, 150, 200];

interface Patch { name?: string; bio?: string; character?: string | null; photo?: string | null; frame?: string; onboarded?: boolean; dailyGoal?: DailyGoal; shareActivity?: boolean }

/** Updates the signed-in cousin's own profile. Nobody can edit anyone else's. */
export async function PATCH(req: NextRequest) {
  return withUser(req, async ({ user }) => {
    const p = await readJson<Patch>(req, MAX_PHOTO + 10_000);
    if (!p) return fail(400, "Invalid request.");
    const line = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

    if (p.name !== undefined && !line(p.name, 40)) return fail(400, "Your name can't be empty.");
    if (p.character && !CHARACTER[p.character]) return fail(400, "Pick one of the characters.");
    if (p.photo && (p.photo.length > MAX_PHOTO || !PHOTO.test(p.photo))) return fail(400, "That photo couldn't be used. Try a smaller JPEG or PNG.");
    if (p.frame !== undefined && !FRAMES.some((f) => f.id === p.frame)) return fail(400, "Pick one of the frames.");
    if (p.dailyGoal !== undefined && !GOALS.includes(p.dailyGoal)) return fail(400, "Pick one of the daily objectives.");

    const view = await writeDb((db) => {
      const u = db.users.find((x) => x.id === user.id)!;
      if (p.name !== undefined) u.name = line(p.name, 40);
      if (p.bio !== undefined) u.bio = line(p.bio, 160) || undefined;
      if (p.character !== undefined) {
        if (p.character) {
          const holder = db.users.find((x) => x.id !== u.id && x.character === p.character);
          if (holder) throw new ApiError(409, `${CHARACTER[p.character].name} is already ${holder.name}'s character. Pick another.`);
          u.character = p.character;
        } else delete u.character;
      }
      if (p.photo !== undefined) {
        if (p.photo) { u.photo = p.photo; u.photoV = Date.now(); }
        else { delete u.photo; delete u.photoV; }
      }
      if (p.frame !== undefined) {
        const f = FRAMES.find((x) => x.id === p.frame)!;
        if (f.badge && !db.game.badges[u.id]?.[f.badge]) throw new ApiError(403, `Unlock “${f.name}” first: ${f.hint.toLowerCase()}.`);
        u.frame = f.id === "classic" ? undefined : f.id;
      }
      if (p.onboarded !== undefined) u.onboarded = !!p.onboarded;
      if (p.dailyGoal !== undefined) u.dailyGoal = p.dailyGoal === "auto" ? undefined : p.dailyGoal;
      if (p.shareActivity !== undefined) u.shareActivity = p.shareActivity ? undefined : false;
      db.rev++;
      return viewFor(db, u.id);
    });
    return ok(view);
  }, { write: true });
}
