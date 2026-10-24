"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Minus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { DIM } from "@/lib/catalog";
import { motionAllowed } from "@/lib/device";
import { levelOf, lifetimeAura, rankOf, userLogs } from "@/lib/engine";
import { useGame, useMember } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarView, RankEmblem } from "./avatars";
import { AuraIcon } from "./brand";
import { AREA_ICON, QUEST_ICON } from "./icons";

export { AvatarView, CharacterArt, MemberPortrait, RankEmblem, memberColor } from "./avatars";

/* ---------- people ---------- */
export function Avatar({ id, size = 40, className, frame }: { id: string; size?: number; className?: string; frame?: boolean }) {
  return <AvatarView member={useMember(id)} size={size} className={className} frame={frame} />;
}

export function useLevel(id: string) {
  const { s } = useGame();
  const aura = lifetimeAura(userLogs(s, id));
  return { aura, ...levelOf(aura) };
}

export function useRank(id: string) {
  const { stats } = useGame();
  return rankOf(stats(id)?.rankScore ?? 0);
}

export function RankBadge({ id, size = 22, label = true, className }: { id: string; size?: number; label?: boolean; className?: string }) {
  const r = useRank(id);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`Rank: ${r.label}`}>
      <RankEmblem tier={r.tier} division={r.division} size={size} />
      {label && <span className="text-[12px] font-medium" style={{ color: r.color }}>{r.label}</span>}
    </span>
  );
}

/* ---------- layout ---------- */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 motion-safe:animate-fade-up">
      <div className="min-w-[min(100%,15rem)] flex-1">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-[30px] font-bold leading-[1.08] tracking-tight sm:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className={cn("flex shrink-0 items-center gap-2", eyebrow ? "pt-6" : "pt-1 sm:pt-1.5")}>{action}</div>}
    </header>
  );
}

export function Section({ title, action, children, className, id, eyebrow }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string; eyebrow?: ReactNode }) {
  return (
    <section id={id} className={cn("flex scroll-mt-20 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-[min(100%,13rem)] flex-1">
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h2 className="font-display text-[20px] font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------- life dimensions ---------- */
export function AreaIcon({ dim, size = 36, className }: { dim: DimId; size?: number; className?: string }) {
  const Icon = AREA_ICON[dim];
  const color = DIM[dim].color;
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-[30%]", className)} style={{ width: size, height: size, background: `${color}1c`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </span>
  );
}

export function AreaTag({ dim, dim2, className }: { dim: DimId; dim2?: DimId; className?: string }) {
  const Icon = AREA_ICON[dim];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground", className)}>
      <Icon className="h-3.5 w-3.5" style={{ color: DIM[dim].color }} strokeWidth={2} />
      {DIM[dim].short}
      {dim2 && <span className="text-muted-foreground/70">+ {DIM[dim2].short}</span>}
    </span>
  );
}

/** A quest's own icon on a tile tinted by its dimension. */
export function QuestGlyph({ icon, dim, size = 34 }: { icon?: string; dim: DimId; size?: number }) {
  const Icon = (icon && QUEST_ICON[icon]) || AREA_ICON[dim];
  const color = DIM[dim].color;
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-[11px]" style={{ width: size, height: size, background: `${color}18`, color }}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </span>
  );
}

/* ---------- Aura Points ---------- */
/** "+30" with the Aura glyph. Screen readers hear "30 Aura Points". */
export function AuraChip({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold tabular-nums text-primary", className)} aria-label={`${value} Aura Points`}>
      <AuraIcon className="h-3 w-3" />
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

/**
 * A number that counts up with an electric glow when it grows, plus a small
 * "+N" that rises and fades. Snaps instantly when motion is reduced.
 */
export function AuraCounter({ value, className, icon = true }: { value: number; className?: string; icon?: boolean }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const [burst, setBurst] = useState<{ key: number; gain: number } | null>(null);
  useEffect(() => {
    const start = current.current;
    if (start === value) return;
    if (value > start) setBurst({ key: Date.now(), gain: value - start });
    if (!motionAllowed()) { current.current = value; setShown(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 750);
      const v = Math.round(start + (value - start) * (1 - (1 - p) ** 3));
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); current.current = value; setShown(value); };
  }, [value]);
  return (
    <span className={cn("relative inline-flex items-center gap-1 tabular-nums", className)} aria-live="polite" aria-label={`${value.toLocaleString("en-IN")} Aura Points`}>
      {icon && <AuraIcon glow className={cn("h-[0.85em] w-[0.85em] text-primary", burst && "motion-safe:animate-charge")} key={`i${burst?.key ?? 0}`} />}
      <span key={burst?.key ?? 0} className={cn("inline-block", burst && "motion-safe:animate-charge fx-anim")}>{shown.toLocaleString("en-IN")}</span>
      {burst && <span key={`r${burst.key}`} aria-hidden className="fx pointer-events-none absolute -top-3.5 right-0 text-[11px] font-semibold text-primary opacity-0 motion-safe:animate-rise">+{burst.gain}</span>}
    </span>
  );
}

/* ---------- scores ---------- */
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

/** Change against the previous period. Improvements lead; dips stay quiet. */
export function Delta({ now, prev, className, compact }: { now: number | null | undefined; prev: number | null | undefined; className?: string; compact?: boolean }) {
  if (now === null || now === undefined || prev === null || prev === undefined) return null;
  const d = now - prev;
  if (d === 0) return <span className={cn("inline-flex items-center text-[11px] text-muted-foreground", className)} aria-label="No change"><Minus className="h-3 w-3" /></span>;
  const up = d > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", up ? "text-success" : "text-muted-foreground", className)} aria-label={`${up ? "Up" : "Down"} ${Math.abs(d)} points`}>
      <Icon className="h-3 w-3" />{!compact && (up ? "+" : "−")}{Math.abs(d)}
    </span>
  );
}

/** A horizontal score bar with an optional tick for the previous period. */
export function ScoreBar({ value, prev, color, className, height = 8 }: { value: number | null | undefined; prev?: number | null; color: string; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-secondary", className)} style={{ height }} role="img" aria-label={value === null || value === undefined ? "Not enough data" : `${value}%`}>
      {value !== null && value !== undefined && (
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: v > 0 ? `0 0 10px ${color}55` : undefined }} />
      )}
      {prev !== null && prev !== undefined && <span className="absolute top-0 h-full w-[2px] rounded bg-foreground/50" style={{ left: `calc(${Math.min(100, prev)}% - 1px)` }} />}
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 8, color = "hsl(var(--primary))", children, glow }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; glow?: boolean }) {
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <Rings size={size} stroke={stroke} rings={[{ value, color }]} glow={glow} />
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Concentric progress rings, outermost first. */
export function Rings({ rings, size = 120, stroke = 12, gap = 3, glow }: { rings: { value: number; color: string }[]; size?: number; stroke?: number; gap?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden style={glow ? { filter: `drop-shadow(0 0 6px ${rings[0]?.color ?? "transparent"})` } : undefined}>
      {rings.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap);
        if (radius <= 0) return null;
        const c = 2 * Math.PI * radius;
        const v = Math.min(1, Math.max(0, r.value));
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke={r.color} strokeOpacity={0.14} strokeWidth={stroke} fill="none" />
            <circle cx={size / 2} cy={size / 2} r={radius} stroke={r.color} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }} opacity={v === 0 ? 0 : 1} />
          </g>
        );
      })}
    </svg>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("panel p-4", className)}>
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-display text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------- controls ---------- */
/** A round completion control that sparks when you check it off. */
export function CheckCircle({ done, onClick, label, color = "hsl(var(--primary))", disabled }: { done: boolean; onClick: () => void; label: string; color?: string; disabled?: boolean }) {
  const [spark, setSpark] = useState(0);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { if (!done) setSpark((n) => n + 1); onClick(); }}
      aria-pressed={done}
      aria-label={label}
      className="group relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 disabled:opacity-40"
    >
      {spark > 0 && <span key={spark} aria-hidden className="fx pointer-events-none absolute inset-1 rounded-full border-2 opacity-0 motion-safe:animate-ring" style={{ borderColor: color }} />}
      <span
        className={cn("grid h-[24px] w-[24px] place-items-center rounded-full border-[1.5px] transition-all duration-200", !done && "border-muted-foreground/45 group-hover:border-primary")}
        style={done ? { background: color, borderColor: color, boxShadow: `0 0 12px ${color}88` } : undefined}
      >
        <Check className={cn("h-3.5 w-3.5 text-[#05070E] transition-all duration-200", done ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
      </span>
    </button>
  );
}

/** Two-step delete: tap once to arm, tap again to confirm. */
export function DeleteButton({ onConfirm, label = "Delete" }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  if (armed) {
    return (
      <button type="button" onClick={() => { setArmed(false); onConfirm(); }}
        className="h-7 shrink-0 rounded-full bg-destructive px-3 text-[12px] font-medium text-destructive-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
        {label}
      </button>
    );
  }
  return (
    <button type="button" aria-label={label}
      onClick={() => { setArmed(true); clearTimeout(timer.current); timer.current = setTimeout(() => setArmed(false), 3000); }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition hover:bg-secondary hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/* ---------- empty states ---------- */
export function EmptyState({ art, title, body, action, className }: { art?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {art && <div className="mb-4">{art}</div>}
      <h3 className="font-display text-[17px] font-semibold tracking-tight">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[15px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Chips for optional suggestions; picking one only pre-fills a form. */
export function SuggestionChip({ children, onClick, active }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] transition active:scale-[.98]",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50")}>
      {children}
    </button>
  );
}

/* ---------- charts ---------- */
/** False when the person prefers reduced motion or turned effects off, for chart animations. */
export function useAnimate() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setOk(motionAllowed());
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return ok;
}
export const axisProps = { tick: { fill: "currentColor", fontSize: 11 }, axisLine: false, tickLine: false } as const;
export const tooltipStyle = {
  contentStyle: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, boxShadow: "var(--shadow-float)", color: "hsl(var(--foreground))" },
  labelStyle: { color: "hsl(var(--muted-foreground))", marginBottom: 2 },
  itemStyle: { color: "hsl(var(--foreground))", padding: 0 },
  cursor: { fill: "hsl(var(--secondary))", opacity: 0.6 },
};
