"use client";

import { useId } from "react";
import { CHARACTER, CHARACTERS, RANKS, characterImage, type CharacterImage } from "@/lib/catalog";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Character portraits                                                 */
/* The five official characters, from the squad's own artwork. Three    */
/* crops of each live in public/avatars: a square face for round        */
/* avatars, a 4:5 portrait for cards and the full tall panel.           */
/* ------------------------------------------------------------------ */
export function CharacterArt({ id, kind = "avatar", size, className, decorative }: { id: string; kind?: CharacterImage; size?: number; className?: string; decorative?: boolean }) {
  const c = CHARACTER[id] ?? CHARACTERS[0];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={characterImage(c.id, kind)}
      alt={decorative ? "" : `${c.name}, ${c.title}`}
      width={size}
      height={size && (kind === "avatar" ? size : kind === "portrait" ? Math.round(size * 1.25) : Math.round(size * 3.4))}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("block select-none object-cover", className)}
      style={{ background: c.deep }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Avatars and frames                                                  */
/* ------------------------------------------------------------------ */
export const memberColor = (m: Pick<Member, "character" | "color">) => (m.character && CHARACTER[m.character]?.color) || m.color;

const FRAME_STYLE: Record<string, string> = {
  charged: "ring-[2px] ring-primary shadow-[0_0_14px_hsl(var(--primary)/.55)]",
  arc: "ring-[2px] ring-arc shadow-[0_0_14px_hsl(var(--arc)/.5)]",
  gilded: "ring-[2px] ring-accent shadow-[0_0_14px_hsl(var(--accent)/.5)]",
};

/**
 * A cousin's face in the game: their photo, else their character, else their
 * initials. A thin ring in their character's colour ties it to them
 * everywhere; frames unlocked by achievements replace it.
 */
export function AvatarView({ member, size = 40, className, square, frame = true }: { member: Pick<Member, "name" | "color" | "photo" | "character" | "frame">; size?: number; className?: string; square?: boolean; frame?: boolean }) {
  const f = frame ? member.frame : undefined;
  const shape = square ? "rounded-[24%]" : "rounded-full";
  const color = memberColor(member);
  const initials = member.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hasChar = !!(member.character && CHARACTER[member.character]);
  const inner = member.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.photo} alt="" className="h-full w-full object-cover" draggable={false} />
  ) : hasChar ? (
    <CharacterArt id={member.character!} size={size} className="h-full w-full" decorative />
  ) : (
    <span aria-hidden className="font-display font-semibold text-white" style={{ fontSize: size * 0.38 }}>{initials}</span>
  );
  const body = (
    <span
      className={cn("relative inline-grid h-full w-full shrink-0 place-items-center overflow-hidden", shape, f && FRAME_STYLE[f])}
      style={{
        ...(!member.photo && !hasChar ? { background: `linear-gradient(160deg, ${member.color}, ${member.color}aa 60%, #1B2440)` } : {}),
        ...(!f ? { boxShadow: `0 0 0 ${size >= 64 ? 2 : 1.5}px ${color}${size >= 64 ? "" : "cc"}` } : {}),
      }}
    >
      {inner}
    </span>
  );
  return (
    <span className={cn("relative inline-block shrink-0", shape, className)} style={{ width: size, height: size }} title={member.name}>
      {f === "radiant" ? <span className={cn("electric block h-full w-full p-[2px]", shape)}>{body}</span> : body}
    </span>
  );
}

/**
 * A large portrait for cards: the cousin's photo, else their character's
 * portrait, else their initials on their colour.
 */
export function MemberPortrait({ member, className, kind = "portrait" }: { member: Pick<Member, "name" | "color" | "photo" | "character">; className?: string; kind?: "portrait" | "full" }) {
  const c = member.character ? CHARACTER[member.character] : undefined;
  const initials = member.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  if (member.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.photo} alt="" className={cn("block h-full w-full select-none object-cover", className)} draggable={false} />;
  }
  if (c) return <CharacterArt id={c.id} kind={kind} className={cn("h-full w-full object-top", className)} decorative />;
  return (
    <span aria-hidden className={cn("grid h-full w-full place-items-center font-display text-[44px] font-bold text-white/90", className)} style={{ background: `linear-gradient(160deg, ${member.color}, #1B2440)` }}>{initials}</span>
  );
}

/* ------------------------------------------------------------------ */
/* Rank emblems                                                        */
/* ------------------------------------------------------------------ */
/**
 * Seven tiers, each a little more elaborate: a shield that gains wings,
 * chevrons and finally a crown of light. Division pips sit underneath.
 */
export function RankEmblem({ tier, division = 0, size = 32, className }: { tier: number; division?: number; size?: number; className?: string }) {
  const r = RANKS[Math.max(0, Math.min(RANKS.length - 1, tier))];
  const u = useId().replace(/:/g, "");
  const col = r.color;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} role="img" aria-label={`${r.name}${division ? ` ${["", "I", "II", "III"][division]}` : ""}`}>
      <defs>
        <linearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} /><stop offset="1" stopColor={col} stopOpacity=".35" /></linearGradient>
      </defs>
      {tier >= 3 && <path d="M8 16 2 12l3 12 6 3Zm32 0 6-4-3 12-6 3Z" fill={col} opacity=".55" />}
      {tier >= 5 && <path d="M12 10 7 4l1 10Zm24 0 5-6-1 10Z" fill={col} opacity=".7" />}
      <path d="M24 4 39 10v12c0 10-6.5 17-15 21C15.5 39 9 32 9 22V10Z" fill="#0B1120" stroke={`url(#${u}f)`} strokeWidth="2" />
      <path d="M24 9 35 13.5V22c0 7.5-4.6 12.8-11 16-6.4-3.2-11-8.5-11-16v-8.5Z" fill={col} opacity=".14" />
      {tier >= 1 && <path d="M16 27l8 4 8-4" stroke={col} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      {tier >= 2 && <path d="M16 31.5l8 4 8-4" stroke={col} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".7" />}
      <path d="M26.5 12 20 22h4.5l-2 8 7-10.5H25Z" fill={col} />
      {tier >= 6 && <circle cx="24" cy="21" r="13" fill="none" stroke={col} strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 3" />}
      {division > 0 && (
        <g fill={col}>
          {Array.from({ length: division }, (_, i) => <circle key={i} cx={24 + (i - (division - 1) / 2) * 5} cy="46" r="1.6" />)}
        </g>
      )}
    </svg>
  );
}
