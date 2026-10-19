"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Info, Plus } from "lucide-react";
import { WheelArt } from "@/components/brand";
import { AreaIcon, AuraChip, AvatarView, Delta, EmptyState, PageHeader, ScoreBar, Section, axisProps, memberColor, tooltipStyle, useAnimate } from "@/components/game";
import { StormWheel } from "@/components/wheel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FULL_PER_DAY, MIN_COUNT, MIN_DAYS, OPEN_TODO_GRACE_DAYS, balance, lastDays, scoresOf, type BalanceResult } from "@/lib/balance";
import { ACTIVE_DIMS, DIM, DIM_IDEAS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { ActiveDim, DimId, Scores } from "@/lib/types";
import { addDays, cn, fmtShort, today, weekStart } from "@/lib/utils";

type P = "7" | "30" | "all";
const P_LABEL: Record<P, string> = { "7": "7 days", "30": "30 days", all: "All time" };

export default function Life() {
  const { s, me, profile, stats, openSheet } = useGame();
  const anim = useAnimate();
  const [p, setP] = useState<P>("30");
  const [cmp, setCmp] = useState<string | null>(null);
  const [open, setOpen] = useState<ActiveDim | null>(null);
  const t = today();
  const joined = today(profile.joinedAt);

  const { now, prev } = useMemo(() => {
    if (p === "all") return { now: balance(s, me, joined, t, { details: true }), prev: null as BalanceResult | null };
    const n = +p;
    return { now: lastDays(s, me, n, t, { details: true }), prev: lastDays(s, me, n, addDays(t, -n)) };
  }, [s, me, p, t, joined]);
  const scores = scoresOf(now);
  const prevScores = prev ? scoresOf(prev) : undefined;

  // rolling 30-day scores at the end of each of the last 12 weeks
  const trend = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const end = i === 11 ? t : addDays(weekStart(t), -1 - 7 * (10 - i));
    const sc = end < joined ? null : scoresOf(lastDays(s, me, 30, end));
    return { w: i === 11 ? "Now" : fmtShort(end), ...(sc ?? {}) } as Record<string, string | number | null>;
  }), [s, me, t, joined]);
  const [trendDim, setTrendDim] = useState<DimId>("vision");

  const others = s.members.filter((m) => m.id !== me);
  const cmpMember = others.find((m) => m.id === cmp);
  const cmpScores: Scores | undefined = cmpMember ? (p === "7" ? stats(cmpMember.id)?.b7 : p === "30" ? stats(cmpMember.id)?.b30 : stats(cmpMember.id)?.bAll) : undefined;
  const radar = ACTIVE_DIMS.map((d) => ({ dim: DIM[d].short, you: scores[d] ?? 0, before: prevScores?.[d] ?? 0, cousin: cmpScores?.[d] ?? 0 }));
  const nothing = now.planned === 0;
  const tracked = ACTIVE_DIMS.filter((d) => scores[d] !== null);
  const ranked = [...tracked].sort((a, b) => scores[b]! - scores[a]!);

  const pick = (d: ActiveDim) => {
    setOpen(d);
    requestAnimationFrame(() => document.getElementById(`dim-${d}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="space-y-10">
      <PageHeader title="Life Balance" eyebrow="Updates automatically"
        subtitle="Ten dimensions, scored from what you planned and what you completed. Nothing here is entered by hand."
        action={<Tabs value={p} onValueChange={(v) => setP(v as P)}><TabsList>{(Object.keys(P_LABEL) as P[]).map((k) => <TabsTrigger key={k} value={k}>{P_LABEL[k]}</TabsTrigger>)}</TabsList></Tabs>} />

      {nothing ? (
        <Card>
          <EmptyState art={<WheelArt />} title="Not enough data yet" body="Your Life Balance fills in as you complete quests and habits. Give each quest a dimension when you create it, and within a few days you'll see your wheel."
            action={<Button onClick={() => openSheet({ kind: "quest" })}><Plus />Add a quest</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="flex flex-col items-center p-5 lg:col-span-2">
            <div className="self-stretch">
              <div className="font-display text-[16px] font-semibold">Your storm wheel</div>
              <div className="text-[13px] text-muted-foreground">{tracked.length} of 9 areas tracked{prev ? " · ticks show the previous period" : ""}</div>
            </div>
            <StormWheel scores={scores} prev={prevScores} onPick={pick} className="mt-3 text-muted-foreground" />
            <div className="mt-2 grid w-full grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-2xl bg-secondary/60 p-3"><div className="text-muted-foreground">Strongest</div><div className="mt-0.5 truncate font-medium">{ranked[0] ? `${DIM[ranked[0]].short} · ${scores[ranked[0]]}%` : "—"}</div></div>
              <div className="rounded-2xl bg-secondary/60 p-3"><div className="text-muted-foreground">Needs attention</div><div className="mt-0.5 truncate font-medium">{ACTIVE_DIMS.filter((d) => (scores[d] ?? 0) < 35).length ? DIM[[...ACTIVE_DIMS].sort((a, b) => (scores[a] ?? -1) - (scores[b] ?? -1))[0]].short : "Nothing below 35%"}</div></div>
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
              <div>
                <div className="font-display text-[16px] font-semibold">Shape of your life</div>
                <div className="text-[13px] text-muted-foreground">{cmpMember ? `With ${cmpMember.name}'s, for inspiration, not judgement.` : prev ? "Now (filled) against the previous period (dashed)." : "All time."}</div>
              </div>
              {others.length > 0 && (
                <div className="flex gap-1">
                  {others.map((m) => (
                    <button key={m.id} onClick={() => setCmp(cmp === m.id ? null : m.id)} aria-pressed={cmp === m.id} aria-label={`Compare with ${m.name}`}
                      className={cn("rounded-full transition", cmp === m.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-100")}>
                      <AvatarView member={m} size={28} frame={false} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="h-[330px] px-1 pb-3 text-muted-foreground sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="currentColor" strokeOpacity={0.14} />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "currentColor", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {prev && !cmpMember && <Radar isAnimationActive={anim} name="Previous" dataKey="before" stroke="currentColor" strokeOpacity={0.6} fill="none" strokeDasharray="4 4" strokeWidth={1.5} />}
                  {cmpMember && <Radar isAnimationActive={anim} name={cmpMember.name} dataKey="cousin" stroke={memberColor(cmpMember)} fill={memberColor(cmpMember)} fillOpacity={0.1} strokeDasharray="4 3" strokeWidth={1.5} />}
                  <Radar isAnimationActive={anim} name="You" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2.2} dot={{ r: 2.5, fill: "hsl(var(--primary))" }} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <Section title="Every dimension" eyebrow={P_LABEL[p]}>
        <div className="panel divide-y divide-border/60 overflow-hidden">
          {(["vision", ...ACTIVE_DIMS] as DimId[]).map((d) => (
            <DimensionRow key={d} dim={d} now={now} scores={scores} prev={prevScores} open={open === d} onToggle={() => setOpen(open === d ? null : (d as ActiveDim))} />
          ))}
        </div>
      </Section>

      <Section title="Trend" eyebrow="Rolling 30 days, week by week">
        <Card className="p-5">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-3">
            {(["vision", ...ACTIVE_DIMS] as DimId[]).map((d) => (
              <button key={d} onClick={() => setTrendDim(d)} aria-pressed={trendDim === d}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition", trendDim === d ? "border-transparent text-[#05070E]" : "border-border text-muted-foreground hover:text-foreground")}
                style={trendDim === d ? { background: d === "vision" ? "hsl(var(--primary))" : DIM[d].color } : undefined}>{DIM[d].short}</button>
            ))}
          </div>
          <div className="h-56 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="w" {...axisProps} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axisProps} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, DIM[trendDim].name]} />
                <Line isAnimationActive={anim} dataKey={trendDim} stroke={trendDim === "vision" ? "hsl(var(--primary))" : DIM[trendDim].color} strokeWidth={2.6} dot={{ r: 3, strokeWidth: 0, fill: trendDim === "vision" ? "hsl(var(--primary))" : DIM[trendDim].color }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="How it's calculated" id="how" eyebrow="Transparent by design">
        <Card className="space-y-3 p-5 text-[14px] leading-relaxed text-muted-foreground">
          <p className="flex gap-2 text-foreground"><Info className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>Each score is <b className="font-semibold">what you completed ÷ what you planned</b>, weighted by Aura Points, so harder commitments count for more.</span></p>
          <ul className="ml-6 list-disc space-y-1.5">
            <li>A habit is planned on each day it&apos;s due. Rest days don&apos;t count against you, and today only counts once it&apos;s done.</li>
            <li>A one-time quest counts when you complete it, or as missed once it&apos;s been open for {OPEN_TODO_GRACE_DAYS} days.</li>
            <li>Challenges count when they finish, with partial credit if they end short. Logged activities and meetups count as planned and done.</li>
            <li>A quest in two dimensions splits its weight evenly between them.</li>
            <li>To reach 100%, an area needs about {FULL_PER_DAY} Aura Points of activity a day, so a single very easy task can&apos;t max it out.</li>
            <li>With fewer than {MIN_COUNT} planned items or {MIN_DAYS} days of tracking, you&apos;ll see &ldquo;Not enough data&rdquo; instead of a misleading number.</li>
            <li><b className="font-semibold text-foreground">Life Vision</b> is the average of all nine (untracked areas count as zero), so it rewards a balanced life. It needs three tracked areas.</li>
          </ul>
        </Card>
      </Section>
    </div>
  );
}

function DimensionRow({ dim, now, scores, prev, open, onToggle }: { dim: DimId; now: BalanceResult; scores: Scores; prev?: Scores; open: boolean; onToggle: () => void }) {
  const { openSheet } = useGame();
  const v = scores[dim];
  const color = dim === "vision" ? "hsl(var(--primary))" : DIM[dim].color;
  const r = dim === "vision" ? null : now.dims[dim as ActiveDim];
  const items = dim === "vision" ? [] : now.items?.[dim as ActiveDim] ?? [];
  return (
    <div id={`dim-${dim}`} className={cn("scroll-mt-24", dim === "vision" && "bg-primary/[.04]")}>
      <button type="button" onClick={dim === "vision" ? undefined : onToggle} aria-expanded={dim === "vision" ? undefined : open}
        className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5", dim !== "vision" && "transition hover:bg-secondary/40")}>
        <AreaIcon dim={dim} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-medium">{DIM[dim].name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <Delta now={v} prev={prev?.[dim]} />
              <span className={cn("font-display text-[17px] font-semibold tabular-nums", v === null && "text-[13px] font-normal text-muted-foreground")}>{v === null ? "Not enough data" : `${v}%`}</span>
            </span>
          </div>
          <ScoreBar value={v} prev={prev?.[dim]} color={color} className="mt-2" height={7} />
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {dim === "vision" ? `Composite of the nine · ${now.tracked} tracked` : r && r.count ? `${Math.round(r.done)} of ${Math.round(r.planned)} planned Aura Points completed · ${r.count} ${r.count === 1 ? "item" : "items"}` : DIM[dim].blurb}
          </div>
        </div>
        {dim !== "vision" && <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </button>
      {open && dim !== "vision" && (
        <div className="space-y-2 px-4 pb-4 motion-safe:animate-fade-up sm:px-5">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-secondary/60 p-4 text-[14px]">
              <div className="font-medium">Nothing in {DIM[dim].short} yet</div>
              <p className="mt-0.5 text-muted-foreground">{DIM_IDEAS[dim as ActiveDim]}</p>
              <Button size="sm" className="mt-3" onClick={() => openSheet({ kind: "quest", preset: { dim: dim as ActiveDim } })}><Plus />Add a {DIM[dim].short} quest</Button>
            </div>
          ) : (
            <>
              {items.map((c) => (
                <div key={c.key} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px]">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.kind === "habit" ? `Done ${c.doneCount} of ${c.plannedCount} planned days` : c.kind === "todo" ? (c.doneCount ? "One-time · completed" : "One-time · open over a week") : c.kind === "challenge" ? "Challenge" : `Logged ${c.doneCount}×`}
                    </div>
                  </div>
                  <div className="w-20"><ScoreBar value={c.planned ? Math.round((100 * c.done) / c.planned) : 0} color={color} height={5} /></div>
                  <AuraChip value={Math.round(c.done)} />
                </div>
              ))}
              {(r?.score ?? 100) < 50 && <p className="px-1 pt-1 text-[12px] text-muted-foreground">Idea: {DIM_IDEAS[dim as ActiveDim]}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

