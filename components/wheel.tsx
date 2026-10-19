"use client";

import { useState } from "react";
import { ACTIVE_DIMS, DIM } from "@/lib/catalog";
import type { ActiveDim, Scores } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AREA_ICON } from "./icons";

const SIZE = 340;
const C = SIZE / 2;
const R0 = 58;
const LEN = 92;
const STEP = 360 / ACTIVE_DIMS.length;
const GAP = 7;

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
function sector(r0: number, r1: number, a0: number, a1: number) {
  const [x1, y1] = pt(r1, a0), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r0, a1), [x4, y4] = pt(r0, a0);
  return `M${x1} ${y1}A${r1} ${r1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 0 0 ${x4} ${y4}Z`;
}

/**
 * Nine petals around a core: each petal's length is that dimension's score,
 * and the core is Life Vision, the composite of all nine. Hover, focus or tap
 * a petal to read it.
 */
export function StormWheel({ scores, prev, onPick, className }: { scores: Scores; prev?: Scores; onPick?: (d: ActiveDim) => void; className?: string }) {
  const [focus, setFocus] = useState<ActiveDim | null>(null);
  const shown = focus ? { label: DIM[focus].name, v: scores[focus], color: DIM[focus].color } : { label: "Life Vision", v: scores.vision, color: "hsl(var(--primary))" };
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("h-auto w-full max-w-[340px]", className)} role="group" aria-label="Life Balance wheel">
      <defs>
        <radialGradient id="wheel-core" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".28" /><stop offset="1" stopColor="hsl(var(--primary))" stopOpacity=".04" /></radialGradient>
      </defs>
      {[25, 50, 75, 100].map((p) => <circle key={p} cx={C} cy={C} r={R0 + (LEN * p) / 100} fill="none" stroke="currentColor" strokeOpacity={p === 100 ? 0.14 : 0.07} strokeDasharray={p === 100 ? undefined : "2 4"} />)}
      {ACTIVE_DIMS.map((d, i) => {
        const a0 = i * STEP + GAP / 2, a1 = (i + 1) * STEP - GAP / 2;
        const v = scores[d];
        const p = prev?.[d];
        const color = DIM[d].color;
        const on = focus === d;
        const Icon = AREA_ICON[d];
        const [lx, ly] = pt(R0 + LEN + 18, (a0 + a1) / 2);
        return (
          <g key={d} tabIndex={0} role="button" aria-label={`${DIM[d].name}: ${v === null ? "not enough data" : `${v}%`}`}
            onMouseEnter={() => setFocus(d)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(d)} onBlur={() => setFocus(null)}
            onClick={() => onPick?.(d)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick?.(d); } }}
            className="cursor-pointer outline-none">
            <path d={sector(R0, R0 + LEN, a0, a1)} fill={color} fillOpacity={on ? 0.16 : 0.08} />
            {v !== null && v > 0 && (
              <path d={sector(R0, R0 + (LEN * v) / 100, a0, a1)} fill={color} fillOpacity={focus && !on ? 0.45 : 0.92}
                style={{ filter: on ? `drop-shadow(0 0 8px ${color})` : undefined, transition: "fill-opacity .2s" }} />
            )}
            {p !== null && p !== undefined && <path d={sector(R0 + (LEN * p) / 100 - 0.75, R0 + (LEN * p) / 100 + 0.75, a0, a1)} fill="currentColor" fillOpacity={0.55} />}
            <foreignObject x={lx - 11} y={ly - 11} width="22" height="22" style={{ overflow: "visible" }}>
              <Icon style={{ width: 20, height: 20, color, opacity: focus && !on ? 0.5 : 1 }} strokeWidth={2} />
            </foreignObject>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={R0 - 6} fill="url(#wheel-core)" stroke="hsl(var(--primary))" strokeOpacity=".35" />
      <text x={C} y={C + 2} textAnchor="middle" className="fill-foreground font-display" style={{ fontSize: 30, fontWeight: 700 }}>{shown.v === null ? "—" : `${shown.v}%`}</text>
      <text x={C} y={C + 22} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10.5, letterSpacing: ".04em" }}>{shown.label.length > 18 ? shown.label.split(" ")[0] : shown.label}</text>
    </svg>
  );
}
