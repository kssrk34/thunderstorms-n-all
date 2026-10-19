"use client";

import { useId, type ReactNode } from "react";
import { CHARACTER, RANKS, type Character } from "@/lib/catalog";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Character portraits                                                 */
/* Original storm agents: faces in shadow, lit only by their own        */
/* energy, each with a silhouette you can tell apart at a glance.       */
/* ------------------------------------------------------------------ */
interface Ids { armor: string; light: string; cloak: string; gold: string }

const BUST = (ids: Ids, c: Character) => (
  <>
    <path d="M12 120C14 98 30 88 46 84h28c16 4 32 14 34 36Z" fill={`url(#${ids.armor})`} />
    <path d="M14 114c2-16 14-25 28-28-6 6-10 15-11 28Z" fill="#33405F" opacity=".9" />
    <path d="M106 114c-2-16-14-25-28-28 6 6 10 15 11 28Z" fill="#33405F" opacity=".9" />
    <path d="M14 114c2-16 14-25 28-28M106 114c-2-16-14-25-28-28" stroke={c.color} strokeOpacity=".55" strokeWidth="1" fill="none" />
    <path d="M52 68h16l3 16H49Z" fill="#070B15" />
    <path d="M46 84l14 13 14-13" stroke={c.color} strokeOpacity=".7" strokeWidth="1.2" fill="none" />
  </>
);
const SIGIL = (c: Character, y = 0) => (
  <g transform={`translate(0 ${y})`}>
    <path d="M62.5 98 55 108h5l-3 8 8.5-11H60l2.5-7Z" fill={c.color} />
    <path d="M62.5 98 55 108h5l-3 8 8.5-11H60l2.5-7Z" fill="none" stroke={c.color} strokeOpacity=".35" strokeWidth="3" />
  </g>
);
const FACE = <path d="M60 30c12 0 18 9 18 21s-8 21-18 21-18-9-18-21 6-21 18-21Z" fill="#090E1A" />;
/** Glowing eyes: a bright core with a soft halo. */
const EYES = (c: Character, y = 51, gap = 7, w = 3.4) => (
  <>
    <ellipse cx={60 - gap} cy={y} rx={w * 2} ry={w} fill={c.color} opacity=".22" />
    <ellipse cx={60 + gap} cy={y} rx={w * 2} ry={w} fill={c.color} opacity=".22" />
    <ellipse cx={60 - gap} cy={y} rx={w} ry={w * 0.45} fill={c.color} />
    <ellipse cx={60 + gap} cy={y} rx={w} ry={w * 0.45} fill={c.color} />
    <ellipse cx={60 - gap} cy={y} rx={w * 0.4} ry={w * 0.2} fill="#fff" opacity=".85" />
    <ellipse cx={60 + gap} cy={y} rx={w * 0.4} ry={w * 0.2} fill="#fff" opacity=".85" />
  </>
);

const ART: Record<string, (ids: Ids, c: Character) => ReactNode> = {
  /* Volt, the Striker: angular helm with a V visor */
  volt: (ids, c) => (
    <>
      {BUST(ids, c)}
      <path d="M38 46 29 39l6 16Zm44 0 9-7-6 16Z" fill="#3A4766" />
      <path d="M60 21c16 0 24 12 23 28l-2 15-11 10H50L39 64l-2-15c-1-16 7-28 23-28Z" fill={`url(#${ids.armor})`} />
      <path d="M60 21c16 0 24 12 23 28l-2 15-11 10" fill="none" stroke={c.color} strokeOpacity=".6" strokeWidth="1.2" />
      <path d="M60 21v17" stroke={c.color} strokeWidth="1.6" />
      <path d="M41 46l19 10 19-10-2 7-17 10-17-10Z" fill={c.color} opacity=".35" stroke={c.color} strokeWidth="5" strokeOpacity=".25" />
      <path d="M41 46l19 10 19-10-2 7-17 10-17-10Z" fill={c.color} />
      <path d="M45 49l15 8 15-8" stroke="#fff" strokeOpacity=".7" strokeWidth=".8" fill="none" />
      <path d="M50 67l10 4 10-4" stroke={c.color} strokeOpacity=".5" strokeWidth="1" fill="none" />
      {SIGIL(c)}
    </>
  ),
  /* Nimbus, the Warden: deep hood, eyes in the dark */
  nimbus: (ids, c) => (
    <>
      <path d="M8 120c4-24 20-36 36-40h32c16 4 32 16 36 40Z" fill={`url(#${ids.cloak})`} />
      <path d="M60 16c20 0 30 16 28 36-1 14-8 26-18 32H50c-10-6-17-18-18-32-2-20 8-36 28-36Z" fill={`url(#${ids.cloak})`} />
      <path d="M60 16c20 0 30 16 28 36-1 14-8 26-18 32" fill="none" stroke={c.color} strokeOpacity=".45" strokeWidth="1.2" />
      <path d="M24 120c4-16 12-26 22-32M96 120c-4-16-12-26-22-32M60 16c-3 6-3 11 0 16" stroke={c.color} strokeOpacity=".28" strokeWidth="1" fill="none" />
      <path d="M60 32c11 0 16 9 15 20s-7 19-15 19-14-8-15-19 4-20 15-20Z" fill="#03050B" />
      <path d="M60 32c11 0 16 9 15 20" fill="none" stroke={c.color} strokeOpacity=".35" strokeWidth="1" />
      <path d="M71 36l-3 6h3l-4 7" stroke={c.color} strokeOpacity=".45" strokeWidth=".9" fill="none" />
      {EYES(c, 52, 7, 3.2)}
      <path d="M44 86 60 98l16-12" stroke={c.color} strokeOpacity=".5" strokeWidth="1.2" fill="none" />
      <circle cx="60" cy="100" r="6" fill="#141C33" stroke={c.color} strokeWidth="1.4" />
      <path d="M61.5 96 57 102h3l-1.5 4 4.5-6h-3l1.5-4Z" fill={c.color} />
    </>
  ),
  /* Aurelia, the Skyblade: winged gold helm */
  aurelia: (ids, c) => (
    <>
      <path d="M40 44c-6 16-6 34-14 52l18-8c-2-14 0-28 2-38Zm40 0c6 16 6 34 14 52l-18-8c2-14 0-28-2-38Z" fill="#24180E" stroke={c.color} strokeOpacity=".35" strokeWidth=".8" />
      {BUST(ids, c)}
      {FACE}
      <path d="M42 42c-10-6-18-16-22-28 8 6 14 8 20 12-7-6-10-14-10-20 7 8 13 18 16 28Zm36 0c10-6 18-16 22-28-8 6-14 8-20 12 7-6 10-14 10-20-7 8-13 18-16 28Z" fill={`url(#${ids.gold})`} />
      <path d="M40 26c-4-4-7-9-8-14M80 26c4-4 7-9 8-14" stroke="#FFE7B0" strokeOpacity=".6" strokeWidth=".8" fill="none" />
      <path d="M42 48c0-14 8-22 18-22s18 8 18 22l-6-2c-1-8-6-12-12-12s-11 4-12 12Z" fill={`url(#${ids.gold})`} />
      <path d="M58 34h4l-1 18h-2Z" fill={`url(#${ids.gold})`} />
      <rect x="49" y="50" width="7" height="2.2" rx="1.1" fill={c.color} />
      <rect x="64" y="50" width="7" height="2.2" rx="1.1" fill={c.color} />
      <rect x="47" y="48.5" width="11" height="5" rx="2.5" fill={c.color} opacity=".2" />
      <rect x="62" y="48.5" width="11" height="5" rx="2.5" fill={c.color} opacity=".2" />
      {SIGIL(c)}
    </>
  ),
  /* Rune, the Seer: pointed hood, a rune on the brow, floating sigils */
  rune: (ids, c) => (
    <>
      <path d="M8 120c4-24 20-36 36-40h32c16 4 32 16 36 40Z" fill={`url(#${ids.cloak})`} />
      <path d="M60 11c18 8 30 22 28 42-2 14-9 25-18 31H50c-9-6-16-17-18-31-2-20 10-34 28-42Z" fill={`url(#${ids.cloak})`} />
      <path d="M60 11c18 8 30 22 28 42" fill="none" stroke={c.color} strokeOpacity=".5" strokeWidth="1.2" />
      <path d="M60 33c11 0 16 9 15 20s-7 18-15 18-14-8-15-18 4-20 15-20Z" fill="#04050C" />
      <path d="M46 43q14-5 28 0" stroke={c.color} strokeWidth="1.6" fill="none" />
      <path d="M60 36l4 5-4 5-4-5Z" fill={c.color} />
      <circle cx="60" cy="41" r="7" fill={c.color} opacity=".18" />
      {EYES(c, 54, 6.5, 3)}
      <g fill={c.color}>
        <path d="M22 42l2 3-2 3-2-3Z" opacity=".7" /><path d="M99 33l2.5 3.5-2.5 3.5-2.5-3.5Z" opacity=".55" />
        <path d="M17 72l1.5 2.5-1.5 2.5-1.5-2.5Z" opacity=".5" /><path d="M103 68l2 3-2 3-2-3Z" opacity=".7" />
      </g>
      <path d="M48 92h24M52 100h16" stroke={c.color} strokeOpacity=".5" strokeWidth="1" />
      <path d="M60 86v20" stroke={c.color} strokeOpacity=".7" strokeWidth="1.2" />
    </>
  ),
  /* Tempest, the Rogue: storm-swept hair, half mask, a lightning scar */
  tempest: (ids, c) => (
    <>
      {BUST(ids, c)}
      {FACE}
      <path d="M40 50c-2-16 6-28 20-30 10-1 20 4 26 12h-8l6 9-10-4 2 10-8-8c-8 2-18 4-24 14Z" fill="#111935" />
      <path d="M46 30c6-6 16-8 26-5M52 26c8-3 18-1 24 5" stroke={c.color} strokeOpacity=".55" strokeWidth="1" fill="none" />
      <path d="M44 56h32l-2 8c-4 6-9 9-14 9s-10-3-14-9Z" fill={`url(#${ids.armor})`} />
      <path d="M44 56h32" stroke={c.color} strokeWidth="1.4" />
      <path d="M52 62h16" stroke={c.color} strokeOpacity=".45" strokeWidth="1" />
      <path d="M47 50l9-1.5-1 3Zm26 0-9-1.5 1 3Z" fill={c.color} />
      <path d="M45 48l12-2-1 6Zm30 0-12-2 1 6Z" fill={c.color} opacity=".22" />
      <path d="M50 40l3 5-2 1 3 7" stroke={c.color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M44 84l8-8 8 8 8-8 8 8" stroke={c.color} strokeOpacity=".6" strokeWidth="1.2" fill="none" />
      {SIGIL(c, 2)}
    </>
  ),
  /* Aegis, the Guardian: crested heavy helm with a T visor */
  aegis: (ids, c) => (
    <>
      {BUST(ids, c)}
      <ellipse cx="22" cy="102" rx="18" ry="12" fill="#2C3A58" stroke={c.color} strokeOpacity=".55" />
      <ellipse cx="98" cy="102" rx="18" ry="12" fill="#2C3A58" stroke={c.color} strokeOpacity=".55" />
      <path d="M60 6c8 4 10 12 7 22l-7-4-7 4c-3-10-1-18 7-22Z" fill={c.color} />
      <path d="M60 18c18 0 26 12 26 30l-2 18-14 12H50L36 66l-2-18c0-18 8-30 26-30Z" fill={`url(#${ids.armor})`} />
      <path d="M60 18c18 0 26 12 26 30l-2 18" fill="none" stroke={c.color} strokeOpacity=".55" strokeWidth="1.2" />
      <path d="M40 46h40v5H63v15h-6V51H40Z" fill={c.color} opacity=".3" stroke={c.color} strokeOpacity=".25" strokeWidth="4" />
      <path d="M40 46h40v5H63v15h-6V51H40Z" fill={c.color} />
      <circle cx="41" cy="61" r="1.6" fill={c.color} opacity=".7" /><circle cx="79" cy="61" r="1.6" fill={c.color} opacity=".7" />
      {SIGIL(c)}
    </>
  ),
  /* Sable, the Shade: long hair, a mask across the eyes, high collar */
  sable: (ids, c) => (
    <>
      <path d="M38 52c-4-20 6-32 22-32s26 12 22 32c2 14 4 28 10 44l-18-6H46l-18 6c6-16 8-30 10-44Z" fill="#180F2B" />
      <path d="M40 60c-1 12-4 24-8 32M80 60c1 12 4 24 8 32" stroke={c.color} strokeOpacity=".35" strokeWidth="1" fill="none" />
      {BUST(ids, c)}
      {FACE}
      <path d="M44 40c4-10 12-13 20-12-6 4-10 10-12 18-2-4-6-6-8-6Z" fill="#180F2B" />
      <path d="M76 40c-2-6-6-9-10-10 2 4 3 8 3 12 2-1 5-2 7-2Z" fill="#180F2B" />
      <path d="M42 47h36l-2 8H44Z" fill="#05060C" stroke={c.color} strokeOpacity=".6" strokeWidth="1" />
      {EYES(c, 51, 8, 3)}
      <path d="M42 78l4 14h28l4-14-8 8H50Z" fill={`url(#${ids.armor})`} stroke={c.color} strokeOpacity=".7" strokeWidth="1" />
      {SIGIL(c, 3)}
    </>
  ),
  /* Gale, the Ranger: field hood, goggles, a scarf in the wind */
  gale: (ids, c) => (
    <>
      {BUST(ids, c)}
      {FACE}
      <path d="M40 52c-2-18 8-28 20-28s22 10 20 28l-6-4c-2-10-8-15-14-15s-12 5-14 15Z" fill="#153024" />
      <path d="M44 34c5-6 10-8 16-8" stroke={c.color} strokeOpacity=".5" strokeWidth="1" fill="none" />
      <path d="M38 47h44v9H38Z" fill="#0E1C15" />
      <path d="M43 45.5h14l2 4.5-2 5.5H45l-3-5Zm34 0H63l-2 4.5 2 5.5h12l3-5Z" fill="#04100A" stroke={c.color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M45 48h11l1.2 2.5-1.2 3H46.5l-2-3Zm30 0H64l-1.2 2.5 1.2 3h9.5l2-3Z" fill={c.color} opacity=".38" />
      <path d="M46.5 48.2l5-.1M66 48.2l5-.1" stroke="#fff" strokeOpacity=".75" strokeWidth=".9" strokeLinecap="round" />
      <path d="M42 74c8 6 28 6 36 0l2 12c-10 6-30 6-40 0Z" fill={c.color} opacity=".85" />
      <path d="M70 86l10 18-8-2-2-8Z" fill={c.color} opacity=".7" />
      <path d="M44 78c8 4 24 4 32 0" stroke="#fff" strokeOpacity=".35" strokeWidth=".8" fill="none" />
    </>
  ),
};

export function CharacterArt({ id, size = 120, className }: { id: string; size?: number; className?: string }) {
  const c = CHARACTER[id] ?? CHARACTER.volt;
  const u = useId().replace(/:/g, "");
  const ids: Ids = { armor: `${u}a`, light: `${u}l`, cloak: `${u}c`, gold: `${u}g` };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={`${c.name}, ${c.title}`}>
      <defs>
        <radialGradient id={`${u}bg`} cx="50%" cy="26%" r="82%">
          <stop offset="0" stopColor={c.color} stopOpacity=".6" />
          <stop offset=".42" stopColor="#111A33" />
          <stop offset="1" stopColor="#05080F" />
        </radialGradient>
        <linearGradient id={ids.armor} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2E3A5A" /><stop offset="1" stopColor="#0B1120" /></linearGradient>
        <linearGradient id={ids.cloak} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E2846" /><stop offset="1" stopColor="#080C18" /></linearGradient>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD98A" /><stop offset=".55" stopColor={c.color} /><stop offset="1" stopColor="#8A5A14" /></linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${u}bg)`} />
      <path d="M96 0 82 22h7L76 44M18 8l-6 12h5l-7 14" stroke={c.color} strokeOpacity=".22" strokeWidth="1.2" fill="none" />
      {(ART[c.id] ?? ART.volt)(ids, c)}
    </svg>
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
 * initials. Frames are unlocked by achievements.
 */
export function AvatarView({ member, size = 40, className, square, frame = true }: { member: Pick<Member, "name" | "color" | "photo" | "character" | "frame">; size?: number; className?: string; square?: boolean; frame?: boolean }) {
  const f = frame ? member.frame : undefined;
  const shape = square ? "rounded-[24%]" : "rounded-full";
  const initials = member.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const inner = member.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.photo} alt="" className="h-full w-full object-cover" />
  ) : member.character && CHARACTER[member.character] ? (
    <CharacterArt id={member.character} size={size} className="h-full w-full" />
  ) : (
    <span aria-hidden className="font-display font-semibold text-white" style={{ fontSize: size * 0.38 }}>{initials}</span>
  );
  const body = (
    <span
      className={cn("relative inline-grid h-full w-full shrink-0 place-items-center overflow-hidden ring-1 ring-white/10", shape, f && FRAME_STYLE[f])}
      style={!member.photo && !member.character ? { background: `linear-gradient(160deg, ${member.color}, ${member.color}66 60%, #0B1120)` } : undefined}
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
