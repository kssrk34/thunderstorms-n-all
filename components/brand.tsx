"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motionAllowed } from "@/lib/device";
import { cn } from "@/lib/utils";

/** Cloud and bolt on a midnight tile. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[27%] bg-[linear-gradient(180deg,#22325E,#070B16)] shadow-[0_0_0_1px_rgba(255,255,255,.08),0_8px_24px_-8px_rgba(66,144,255,.55)]", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <defs>
          <linearGradient id="tna-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9FD8FF" /><stop offset="1" stopColor="#4290FF" /></linearGradient>
        </defs>
        <path d="M20.5 37.5h22a8.5 8.5 0 0 0 .9-16.95A11 11 0 0 0 22.3 23 7.3 7.3 0 0 0 20.5 37.5Z" fill="#E6EDFA" />
        <path d="M34.5 33 28 43.5h5.5L30.5 52 39 40.5h-5.6L36.8 33Z" fill="url(#tna-bolt)" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[15px] font-semibold tracking-tight", className)}>
      Thunderstorms <span className="font-normal text-muted-foreground">&rsquo;n&rsquo; All</span>
    </span>
  );
}

/** The Aura glyph: a bolt inside a spark. */
export function AuraIcon({ className, glow }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5 shrink-0", glow && "drop-shadow-[0_0_4px_hsl(var(--primary))]", className)} aria-hidden>
      <path d="M9.4 1 3.6 9h3.6L6 15l6.4-8.4H8.7L9.4 1Z" fill="currentColor" />
    </svg>
  );
}

/** Loading: the logo with a soft charging ring. */
export function StormLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="relative grid place-items-center">
        <span className="fx absolute h-16 w-16 rounded-full border border-primary/40 motion-safe:animate-ring" style={{ animationIterationCount: "infinite", animationDuration: "1.6s" }} />
        <LogoMark size={44} className="motion-safe:animate-breathe" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

/**
 * The storm behind everything: slow clouds and, now and then, a faint flicker
 * of lightning. Paused when the tab is hidden, and absent when reduced motion
 * or "decorative effects" is off.
 */
export function StormBackdrop() {
  const [flick, setFlick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const schedule = () => {
      timer.current = setTimeout(() => {
        if (!document.hidden && motionAllowed()) setFlick((n) => n + 1);
        schedule();
      }, 22_000 + Math.random() * 38_000);
    };
    schedule();
    return () => clearTimeout(timer.current);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(90%_55%_at_70%_-10%,hsl(var(--sky-1)/.28),transparent_65%),radial-gradient(70%_50%_at_0%_10%,hsl(var(--sky-2)/.22),transparent_70%)]" />
      <div className="fx absolute -left-[20%] top-[-8%] h-[46vh] w-[80vw] rounded-full bg-[hsl(var(--sky-1)/.10)] blur-3xl motion-safe:animate-drift fx-anim" />
      <div className="fx absolute -right-[25%] top-[18%] h-[40vh] w-[70vw] rounded-full bg-[hsl(var(--sky-2)/.10)] blur-3xl motion-safe:animate-drift fx-anim [animation-delay:-25s] [animation-direction:alternate-reverse]" />
      {flick > 0 && <div key={flick} className="fx absolute inset-0 animate-flicker bg-[radial-gradient(60%_45%_at_75%_0%,hsl(210_100%_85%/.10),transparent_70%)]" />}
    </div>
  );
}

/** One soft flash of light for real milestones. */
export function LightningFlash() {
  return <div aria-hidden className="fx pointer-events-none fixed inset-0 z-[71] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(200,220,255,.85),rgba(200,220,255,0)_70%)] opacity-0 motion-safe:animate-flash" />;
}

/** Forked bolts that draw themselves across the sky, for level-ups. */
export function LightningStreaks() {
  const bolts = [
    "M140 0 118 70l26 4-34 92 22 2-40 112",
    "M300 -10l-14 64 20 6-26 70 18 4-22 66",
    "M40 20l12 50-18 4 16 58-14 6 20 56",
  ];
  return (
    <svg aria-hidden className="fx pointer-events-none absolute inset-x-0 top-0 mx-auto h-[60vh] w-full max-w-lg" viewBox="0 0 340 300" preserveAspectRatio="xMidYMin meet">
      {bolts.map((d, i) => (
        // stroke-dashoffset inherits in SVG, so animating the group draws both strokes
        <g key={i} style={{ animationDelay: `${i * 0.18}s` }} className="opacity-0 motion-safe:animate-bolt-draw">
          <path d={d} pathLength={1} strokeDasharray="1" fill="none" stroke="hsl(var(--ion))" strokeOpacity=".35" strokeWidth="7" strokeLinejoin="round" />
          <path d={d} pathLength={1} strokeDasharray="1" fill="none" stroke="#EAF4FF" strokeWidth="1.8" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Empty-state illustrations: quiet, monochrome, a hint of weather     */
/* ------------------------------------------------------------------ */
type Art = { className?: string };
const Cloud = ({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="28" cy="30" r="14" />
    <circle cx="46" cy="22" r="18" />
    <circle cx="62" cy="32" r="11" />
    <rect x="14" y="30" width="58" height="14" rx="7" />
  </g>
);

export function ClearSkyArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 84" className={cn("h-20 w-auto", className)} aria-hidden>
      <circle cx="82" cy="28" r="12" className="fill-primary/70" />
      <circle cx="82" cy="28" r="20" className="fill-primary/10" />
      <g className="fill-foreground opacity-[.08] dark:fill-white dark:opacity-[.12]"><Cloud x={14} y={22} /></g>
    </svg>
  );
}

export function StormArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 92" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.08] dark:fill-white dark:opacity-[.12]"><Cloud x={18} y={8} /></g>
      <path d="M62 54 54 68h7l-4 14 13-18h-7l5-10Z" className="fill-primary" />
      <path d="M62 54 54 68h7l-4 14 13-18h-7l5-10Z" className="fill-none stroke-primary/30" strokeWidth="5" />
    </svg>
  );
}

export function SummitArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 88" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.07] dark:fill-white dark:opacity-[.1]"><Cloud x={56} y={0} s={0.7} /></g>
      <path d="M10 80 46 34l14 16 12-14 38 44Z" className="fill-foreground/[.1] dark:fill-white/[.12]" />
      <path d="M46 34V14" className="stroke-foreground/40 dark:stroke-white/50" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 14h15l-4 5 4 5H47Z" className="fill-primary" />
    </svg>
  );
}

export function SquadArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 84" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.08] dark:fill-white dark:opacity-[.12]">
        <circle cx="34" cy="38" r="10" /><path d="M16 74a18 18 0 0 1 36 0Z" />
        <circle cx="86" cy="38" r="10" /><path d="M68 74a18 18 0 0 1 36 0Z" />
      </g>
      <g className="fill-primary/80"><circle cx="60" cy="32" r="12" /><path d="M38 76a22 22 0 0 1 44 0Z" /></g>
    </svg>
  );
}

export function WheelArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 88" className={cn("h-20 w-auto", className)} aria-hidden>
      <circle cx="60" cy="44" r="34" className="fill-none stroke-foreground/10 dark:stroke-white/15" strokeWidth="2" />
      <circle cx="60" cy="44" r="20" className="fill-none stroke-foreground/10 dark:stroke-white/15" strokeWidth="2" />
      <path d="M60 10v68M26 44h68M36 20l48 48M84 20 36 68" className="stroke-foreground/10 dark:stroke-white/10" strokeWidth="1.5" />
      <path d="M60 24 75 36 70 58 52 62 44 42Z" className="fill-primary/25 stroke-primary" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Scenery: a restrained storm sky over distant spires                 */
/* ------------------------------------------------------------------ */
/** Towers of the far-off citadel: [centre x, height above the ridge, width]. */
const TOWERS: [number, number, number][] = [
  [742, 64, 14], [770, 108, 18], [792, 150, 22], [812, 96, 14], [836, 128, 18], [858, 74, 12], [880, 112, 16], [904, 58, 12],
  [128, 44, 10], [150, 76, 14], [170, 52, 10], [1080, 40, 10], [1102, 66, 12], [1122, 46, 10],
];
function citadel(ridge: (x: number) => number) {
  let d = "";
  for (const [x, h, w] of TOWERS) {
    const base = ridge(x) + 4;
    const top = base - h;
    const roof = Math.max(10, w * 1.4);
    d += `M${x - w / 2} ${base}V${top + roof}L${x} ${top}L${x + w / 2} ${top + roof}V${base}Z`;
  }
  return d;
}
const ridgeFar = (x: number) => 238 - 26 * Math.sin(x / 140) - 14 * Math.sin(x / 47 + 1);
const ridgeNear = (x: number) => 268 - 18 * Math.sin(x / 110 + 2) - 8 * Math.sin(x / 33);
const hill = (f: (x: number) => number) => {
  let d = "M0 300";
  for (let x = 0; x <= 1200; x += 24) d += `L${x} ${f(x).toFixed(1)}`;
  return `${d}L1200 300Z`;
};
const CLOUDS: [number, number, number, number][] = [[180, 70, 170, 34], [420, 40, 220, 30], [700, 86, 200, 28], [980, 54, 240, 36], [1120, 120, 160, 24], [300, 130, 180, 22]];

/**
 * A storm sky with distant spires, drawn in the theme's scene colours, for
 * header bands. Purely decorative; a faint bolt flickers only when motion
 * is allowed.
 */
export function SkyScene({ className }: { className?: string }) {
  const u = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky-fill${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--scene-top))" />
          <stop offset=".7" stopColor="hsl(var(--scene-mid))" />
          <stop offset="1" stopColor="hsl(var(--scene-mid))" />
        </linearGradient>
        <radialGradient id={`sky-glow${u}`} cx="68%" cy="78%" r="40%">
          <stop offset="0" stopColor="hsl(var(--scene-glow))" stopOpacity=".95" />
          <stop offset="1" stopColor="hsl(var(--scene-glow))" stopOpacity="0" />
        </radialGradient>
        <filter id={`sky-soft${u}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <rect width="1200" height="300" fill={`url(#sky-fill${u})`} />
      <rect width="1200" height="300" fill={`url(#sky-glow${u})`} />
      <g fill="hsl(var(--scene-cloud))" opacity=".75" filter={`url(#sky-soft${u})`}>
        {CLOUDS.map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} />)}
      </g>
      <path d="M836 18 822 52h9l-12 30" fill="none" stroke="hsl(var(--primary))" strokeOpacity=".35" strokeWidth="2" strokeLinejoin="round" className="fx motion-safe:animate-breathe fx-anim" />
      <path d={hill(ridgeFar)} fill="hsl(var(--scene-far))" />
      <path d={citadel(ridgeFar)} fill="hsl(var(--scene-far))" />
      <path d={hill(ridgeNear)} fill="hsl(var(--scene-ridge))" opacity=".85" />
    </svg>
  );
}
