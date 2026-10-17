"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Trash2, Zap } from "lucide-react";
import { DIM } from "@/lib/catalog";
import { levelOf, lifetimeXp, userLogs } from "@/lib/engine";
import { useGame, useMember } from "@/lib/store";
import type { DimId, Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AREA_ICON } from "./icons";

/* ---------- people ---------- */
export function AvatarView({ member, size = 40, className }: { member: Pick<Member, "name" | "emoji" | "color" | "photo">; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10", className)}
      style={{ width: size, height: size, background: member.photo ? undefined : `${member.color}22` }}
      title={member.name}
    >
      {member.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden style={{ fontSize: size * 0.5, lineHeight: 1 }}>{member.emoji}</span>
      )}
    </span>
  );
}

export function Avatar({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  return <AvatarView member={useMember(id)} size={size} className={className} />;
}

export function useLevel(id: string) {
  const { s } = useGame();
  const xp = lifetimeXp(userLogs(s, id));
  return { xp, ...levelOf(xp) };
}

/* ---------- layout ---------- */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-7 flex items-start justify-between gap-4 motion-safe:animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className={cn("flex shrink-0 items-center gap-2", eyebrow ? "pt-6" : "pt-1 sm:pt-1.5")}>{action}</div>}
    </header>
  );
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------- life areas ---------- */
export function AreaIcon({ dim, size = 36, className }: { dim: DimId; size?: number; className?: string }) {
  const Icon = AREA_ICON[dim];
  const color = DIM[dim].color;
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-[30%]", className)} style={{ width: size, height: size, background: `${color}1f`, color }}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </span>
  );
}

export function AreaTag({ dim, className }: { dim: DimId; className?: string }) {
  const Icon = AREA_ICON[dim];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground", className)}>
      <Icon className="h-3.5 w-3.5" style={{ color: DIM[dim].color }} strokeWidth={2} />
      {DIM[dim].short}
    </span>
  );
}

/* ---------- numbers ---------- */
export function Xp({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-medium tabular-nums text-muted-foreground", className)}>
      <Zap className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

export function Ring({ value, size = 64, stroke = 8, color = "hsl(var(--primary))", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <Rings size={size} stroke={stroke} rings={[{ value, color }]} />
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Concentric progress rings, outermost first. */
export function Rings({ rings, size = 120, stroke = 12, gap = 3 }: { rings: { value: number; color: string }[]; size?: number; stroke?: number; gap?: number }) {
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      {rings.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap);
        if (radius <= 0) return null;
        const c = 2 * Math.PI * radius;
        const v = Math.min(1, Math.max(0, r.value));
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke={r.color} strokeOpacity={0.16} strokeWidth={stroke} fill="none" />
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
    <div className={cn("rounded-[22px] border border-border/70 bg-card p-4 shadow-card", className)}>
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------- controls ---------- */
/** A round, Reminders-style completion control. */
export function CheckCircle({ done, onClick, label, color = "hsl(var(--primary))" }: { done: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      className="group grid h-7 w-7 shrink-0 place-items-center rounded-full transition active:scale-90"
    >
      <span
        className={cn("grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] transition-all duration-200", !done && "border-muted-foreground/40 group-hover:border-primary")}
        style={done ? { background: color, borderColor: color } : undefined}
      >
        <Check className={cn("h-3.5 w-3.5 text-white transition-all duration-200", done ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
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
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition hover:bg-secondary hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/* ---------- empty states ---------- */
export function EmptyState({ art, title, body, action, className }: { art?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {art && <div className="mb-4">{art}</div>}
      <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
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
/** False when the person prefers reduced motion, for chart animations. */
export function useAnimate() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOk(!mq.matches);
    const on = () => setOk(!mq.matches);
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
