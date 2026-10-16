"use client";

import type { ReactNode } from "react";
import { AURAS, COUSIN, DIM } from "@/lib/catalog";
import { levelOf, lifetimeXp, userLogs } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({ id, size = 40, ring = true, className }: { id: string; size?: number; ring?: boolean; className?: string }) {
  const { s } = useGame();
  const av = s.avatars[id] ?? { emoji: COUSIN[id].emoji, aura: "bolt" };
  const aura = AURAS.find((a) => a.id === av.aura) ?? AURAS[0];
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center rounded-full", className)}
      style={{ width: size, height: size, background: ring ? `conic-gradient(from 210deg, ${aura.from}, ${aura.to}, ${aura.from})` : undefined, padding: ring ? 2 : 0 }}
      title={COUSIN[id].name}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[#121836]" style={{ fontSize: size * 0.48 }}>
        <span aria-hidden>{av.emoji}</span>
      </div>
    </div>
  );
}

export function useLevel(id: string) {
  const { s } = useGame();
  const xp = lifetimeXp(userLogs(s, id));
  return { xp, ...levelOf(xp) };
}

export function LevelPill({ id, className }: { id: string; className?: string }) {
  const L = useLevel(id);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500/25 to-violet-500/25 px-2 py-0.5 text-[11px] font-bold text-sky-200 ring-1 ring-white/10", className)}>
      ⚡ Lv {L.level}
    </span>
  );
}

export function PageHeader({ title, emoji, subtitle, action }: { title: string; emoji: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="mr-2">{emoji}</span>
          <span className="text-grad">{title}</span>
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function DimChip({ dim, className }: { dim: DimId; className?: string }) {
  const d = DIM[dim];
  return (
    <span className={cn("chip whitespace-nowrap", className)} style={{ color: d.color, borderColor: d.color + "40", background: d.color + "14" }}>
      {d.emoji} {d.name.split(" ")[0]}
    </span>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = "#facc15", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.1)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .8s ease", filter: `drop-shadow(0 0 6px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, icon, accent = "#38bdf8" }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; accent?: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-25 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-base">{icon}</span> {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
      <span className="text-3xl">{emoji}</span>
      {text}
    </div>
  );
}

export const tooltipStyle = {
  contentStyle: { background: "#0f1430", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#cbd5e1" },
  itemStyle: { color: "#e2e8f0" },
};
