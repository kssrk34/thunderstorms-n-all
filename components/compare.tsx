"use client";

import Link from "next/link";
import { Crown, TrendingUp } from "lucide-react";
import { DIMS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { DimId, Member, MemberStats, Scores } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AreaIcon, AvatarView, Delta, ScoreBar, pct } from "./game";

export type ComparePeriod = "week" | "month" | "all";
export const PERIOD_LABEL: Record<ComparePeriod, string> = { week: "This week", month: "30 days", all: "All time" };

export function scoresFor(st: MemberStats | undefined, p: ComparePeriod): { now: Scores | undefined; prev: Scores | undefined } {
  if (!st) return { now: undefined, prev: undefined };
  if (p === "week") return { now: st.b7, prev: st.bPrev7 };
  if (p === "month") return { now: st.b30, prev: st.bPrev30 };
  return { now: st.bAll, prev: undefined };
}

interface Cell { m: Member; v: number | null; prev: number | null; delta: number | null }

/** Who leads a dimension and who improved most in it. */
function standouts(cells: Cell[]) {
  const scored = cells.filter((c) => c.v !== null);
  const top = scored.length > 1 ? Math.max(...scored.map((c) => c.v!)) : null;
  const gains = cells.filter((c) => c.delta !== null && c.delta > 0);
  const best = gains.length ? Math.max(...gains.map((c) => c.delta!)) : null;
  return { leaders: top !== null && top > 0 ? new Set(scored.filter((c) => c.v === top).map((c) => c.m.id)) : new Set<string>(), improved: best !== null ? new Set(gains.filter((c) => c.delta === best).map((c) => c.m.id)) : new Set<string>() };
}

/**
 * All ten dimensions, every cousin side by side. On wide screens it's a grid
 * with one column per cousin and rows aligned by dimension; on phones each
 * dimension is a card of five vertical bars.
 */
export function DimensionComparison({ period }: { period: ComparePeriod }) {
  const { s, me, stats } = useGame();
  const members = s.members;
  const rows = DIMS.map((d) => {
    const cells: Cell[] = members.map((m) => {
      const { now, prev } = scoresFor(stats(m.id), period);
      const v = now?.[d.id] ?? null;
      const p = prev?.[d.id] ?? null;
      return { m, v, prev: p, delta: v !== null && p !== null ? v - p : null };
    });
    const scored = cells.filter((c) => c.v !== null);
    const avg = scored.length ? Math.round(scored.reduce((a, c) => a + c.v!, 0) / scored.length) : null;
    return { d, cells, avg, ...standouts(cells) };
  });
  const cols = `minmax(190px,1.25fr) repeat(${members.length}, minmax(0,1fr))`;

  return (
    <>
      {/* wide: aligned columns */}
      {/* no overflow-hidden here: it would make the panel the sticky header's scroll container */}
      <div className="panel hidden md:block">
        <div className="sticky top-14 z-10 grid items-end gap-4 rounded-t-[22px] border-b border-border/70 bg-card/95 px-5 py-3 backdrop-blur" style={{ gridTemplateColumns: cols }}>
          <span className="eyebrow">Dimension</span>
          {members.map((m) => (
            <Link key={m.id} href={`/u/${m.username}`} className="flex min-w-0 items-center gap-2">
              <AvatarView member={m} size={26} frame={false} />
              <span className={cn("truncate text-[13px] font-medium", m.id === me && "text-primary")}>{m.id === me ? "You" : m.name}</span>
            </Link>
          ))}
        </div>
        {rows.map(({ d, cells, avg, leaders, improved }) => (
          <div key={d.id} className={cn("grid items-center gap-4 border-b border-border/50 px-5 py-3.5 last:rounded-b-[22px] last:border-0", d.id === "vision" && "bg-primary/[.04]")} style={{ gridTemplateColumns: cols }}>
            <div className="flex min-w-0 items-center gap-3">
              <AreaIcon dim={d.id} size={32} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{d.name}</div>
                <div className="text-[11px] text-muted-foreground">{avg === null ? "Not enough data yet" : `Squad average ${avg}%`}{avg !== null && avg < 35 && d.id !== "vision" ? " · needs attention" : ""}</div>
              </div>
            </div>
            {cells.map((c) => <WideCell key={c.m.id} c={c} dim={d.id} lead={leaders.has(c.m.id)} up={improved.has(c.m.id)} />)}
          </div>
        ))}
      </div>

      {/* phones: one card per dimension, five bars side by side */}
      <div className="space-y-3 md:hidden">
        {rows.map(({ d, cells, avg, leaders, improved }) => avg === null ? (
          // nobody has data here yet: one line instead of five empty bars
          <div key={d.id} className="panel flex items-center gap-3 px-4 py-3">
            <AreaIcon dim={d.id} size={28} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{d.name}</span>
            <span className="text-[12px] text-muted-foreground">Not enough data yet</span>
          </div>
        ) : (
          <div key={d.id} className={cn("panel p-4", d.id === "vision" && "border-primary/30")}>
            <div className="flex items-center gap-3">
              <AreaIcon dim={d.id} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{d.name}</div>
                <div className="text-[12px] text-muted-foreground">{avg === null ? "Not enough data yet" : `Squad average ${avg}%`}</div>
              </div>
            </div>
            <div className="no-scrollbar mt-4 overflow-x-auto">
              <div className="grid min-w-[300px] gap-2" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(52px,1fr))` }}>
                {cells.map((c) => <TallCell key={c.m.id} c={c} dim={d.id} me={me} lead={leaders.has(c.m.id)} up={improved.has(c.m.id)} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function WideCell({ c, dim, lead, up }: { c: Cell; dim: DimId; lead: boolean; up: boolean }) {
  const color = DIMS.find((x) => x.id === dim)!.color;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={cn("font-display text-[16px] font-semibold tabular-nums", c.v === null && "text-[13px] font-normal text-muted-foreground")}>{c.v === null ? "No data" : `${c.v}%`}</span>
        {lead && <Crown className="h-3.5 w-3.5 text-accent" aria-label="Leads this dimension" />}
        {up && <TrendingUp className="h-3.5 w-3.5 text-success" aria-label="Most improved" />}
        <Delta now={c.v} prev={c.prev} className="ml-auto" />
      </div>
      <ScoreBar value={c.v} prev={c.prev} color={color} height={7} />
    </div>
  );
}

function TallCell({ c, dim, me, lead, up }: { c: Cell; dim: DimId; me: string; lead: boolean; up: boolean }) {
  const color = DIMS.find((x) => x.id === dim)!.color;
  const v = c.v ?? 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={cn("font-display text-[14px] font-semibold tabular-nums", c.v === null && "text-[12px] font-normal text-muted-foreground")}>{pct(c.v)}</span>
      <div className="relative h-24 w-7 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${c.m.name}: ${c.v === null ? "not enough data" : `${c.v}%`}`}>
        {c.v !== null && <div className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-700" style={{ height: `${v}%`, background: `linear-gradient(0deg, ${color}88, ${color})`, boxShadow: v ? `0 0 12px ${color}66` : undefined }} />}
        {c.prev !== null && <span className="absolute inset-x-0 h-[2px] bg-foreground/60" style={{ bottom: `calc(${c.prev}% - 1px)` }} />}
      </div>
      <AvatarView member={c.m} size={26} frame={false} className={cn(c.m.id === me && "ring-2 ring-primary ring-offset-2 ring-offset-card")} />
      <span className="h-4">{lead ? <Crown className="h-3.5 w-3.5 text-accent" aria-label="Leads" /> : up ? <TrendingUp className="h-3.5 w-3.5 text-success" aria-label="Most improved" /> : <Delta now={c.v} prev={c.prev} compact />}</span>
    </div>
  );
}

