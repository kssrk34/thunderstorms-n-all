import { cn } from "@/lib/utils";

/** Cloud and bolt on a midnight tile. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[27%] bg-[linear-gradient(180deg,#27375F,#0B1222)] shadow-sm ring-1 ring-black/5 dark:ring-white/10", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M20.5 37.5h22a8.5 8.5 0 0 0 .9-16.95A11 11 0 0 0 22.3 23 7.3 7.3 0 0 0 20.5 37.5Z" fill="#E9EEF8" />
        <path d="M34.5 33 28 43.5h5.5L30.5 52 39 40.5h-5.6L36.8 33Z" fill="#F5C451" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[15px] font-semibold tracking-tight", className)}>
      Thunderstorms <span className="font-normal text-muted-foreground">&rsquo;n&rsquo; All</span>
    </span>
  );
}

/** Slow, soft storm clouds for brand moments. Still when reduced motion is on. */
export function Atmosphere({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -left-[12%] top-[6%] h-[42vh] w-[72vw] rounded-full bg-white/60 blur-3xl motion-safe:animate-drift dark:bg-[hsl(222_45%_32%/.32)]" />
      <div className="absolute -right-[16%] top-[30%] h-[36vh] w-[62vw] rounded-full bg-white/50 blur-3xl motion-safe:animate-drift motion-safe:[animation-delay:-14s] motion-safe:[animation-direction:alternate-reverse] dark:bg-[hsl(228_38%_26%/.32)]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[30vh] w-[60vw] rounded-full bg-[hsl(221_60%_80%/.35)] blur-3xl dark:bg-[hsl(221_60%_40%/.12)]" />
    </div>
  );
}

/** One soft flash of light. Used only for real milestones, and never under reduced motion. */
export function LightningFlash() {
  return <div aria-hidden className="pointer-events-none fixed inset-0 z-[71] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(220,230,255,.9),rgba(220,230,255,0)_70%)] opacity-0 motion-safe:animate-flash" />;
}

/* ------------------------------------------------------------------ */
/* Empty-state illustrations: soft, monochrome, a hint of weather      */
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
      <circle cx="80" cy="30" r="13" className="fill-accent/80" />
      <g className="fill-foreground opacity-[.09] dark:fill-white dark:opacity-[.13]"><Cloud x={14} y={22} /></g>
    </svg>
  );
}

export function StormArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 92" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.09] dark:fill-white dark:opacity-[.13]"><Cloud x={18} y={8} /></g>
      <path d="M62 54 54 68h7l-4 14 13-18h-7l5-10Z" className="fill-accent" />
    </svg>
  );
}

export function SummitArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 88" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.07] dark:fill-white dark:opacity-[.1]"><Cloud x={56} y={0} s={0.7} /></g>
      <path d="M10 80 46 34l14 16 12-14 38 44Z" className="fill-foreground/[.1] dark:fill-white/[.14]" />
      <path d="M46 34V14" className="stroke-foreground/40 dark:stroke-white/50" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 14h15l-4 5 4 5H47Z" className="fill-primary" />
    </svg>
  );
}

export function SquadArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 84" className={cn("h-20 w-auto", className)} aria-hidden>
      <g className="fill-foreground opacity-[.09] dark:fill-white dark:opacity-[.13]">
        <circle cx="34" cy="38" r="10" /><path d="M16 74a18 18 0 0 1 36 0Z" />
        <circle cx="86" cy="38" r="10" /><path d="M68 74a18 18 0 0 1 36 0Z" />
      </g>
      <g className="fill-primary/80"><circle cx="60" cy="32" r="12" /><path d="M38 76a22 22 0 0 1 44 0Z" /></g>
    </svg>
  );
}

export function MoonArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 84" className={cn("h-20 w-auto", className)} aria-hidden>
      <path d="M72 16a22 22 0 1 0 16 36 18 18 0 0 1-16-36Z" className="fill-primary/70" />
      <g className="fill-foreground opacity-[.09] dark:fill-white dark:opacity-[.13]"><Cloud x={4} y={30} s={0.8} /></g>
    </svg>
  );
}
