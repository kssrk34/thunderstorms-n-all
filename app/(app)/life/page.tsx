"use client";

import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { AreaIcon, AvatarView, PageHeader, Ring, Section, tooltipStyle, useAnimate } from "@/components/game";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIMS } from "@/lib/catalog";
import { dimScores } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { cn } from "@/lib/utils";

const IDEAS: Record<DimId, string> = {
  health: "Take a 20-minute evening walk three times this week.",
  mind: "Read 10 pages before bed. That's a book a month.",
  emotional: "Do a two-minute check-in each night and name one feeling.",
  career: "Block one 45-minute deep-work slot a day with notifications off.",
  money: "Automate a small SIP for the day after your salary or stipend lands.",
  family: "Call a grandparent this weekend and ask about their twenties.",
  friends: "Message one old friend you haven't spoken to in a year.",
  creativity: "Spend 30 minutes this weekend on something just for fun.",
  giving: "Volunteer for one weekend morning.",
  calm: "Try five minutes of pranayama or quiet sitting after waking.",
  adventure: "Plan a one-day trip somewhere you've never been.",
  vision: "Write down three things you want your future self to be proud of.",
};

export default function Life() {
  const { s, me, act } = useGame();
  const [cmp, setCmp] = useState<string | null>(null);
  const anim = useAnimate();
  const mine = dimScores(s, me);
  const other = cmp ? dimScores(s, cmp) : null;
  const data = mine.map((d, i) => ({ dim: d.short, me: d.score, other: other?.[i].score ?? 0 }));
  const overall = Math.round(mine.reduce((a, d) => a + d.score, 0) / mine.length);
  const sorted = [...mine].sort((a, b) => a.score - b.score);
  const weakest = sorted.slice(0, 2);
  const strongest = sorted[sorted.length - 1];
  const others = s.members.filter((m) => m.id !== me);
  const cmpMember = others.find((m) => m.id === cmp);

  return (
    <div className="space-y-10">
      <PageHeader title="Life balance" subtitle="A balanced life, not a lopsided one. Scores blend how you rate each area with the last 30 days of action." />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div><CardTitle>Your life wheel</CardTitle><CardDescription>{cmpMember ? `Compared with ${cmpMember.name}, for inspiration, not judgement.` : "Compare with a cousin for inspiration."}</CardDescription></div>
            {others.length > 0 && (
              <div className="flex gap-1">
                {others.map((m) => (
                  <button key={m.id} onClick={() => setCmp(cmp === m.id ? null : m.id)} aria-pressed={cmp === m.id} aria-label={`Compare with ${m.name}`}
                    className={cn("rounded-full transition", cmp === m.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-100")}>
                    <AvatarView member={m} size={28} />
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <div className="h-[340px] px-2 pb-4 text-muted-foreground sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "currentColor", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar isAnimationActive={anim} name="You" dataKey="me" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                {cmpMember && <Radar isAnimationActive={anim} name={cmpMember.name} dataKey="other" stroke={cmpMember.color} fill={cmpMember.color} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" />}
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="flex items-center gap-5 p-5">
            <Ring value={overall / 100} size={92} stroke={10}>
              <span className="text-[24px] font-semibold tabular-nums">{overall}</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-[17px] font-semibold tracking-tight">Balance score</div>
              <p className="text-[14px] text-muted-foreground">Strongest: <span className="text-foreground">{strongest.name}</span></p>
              <p className="text-[14px] text-muted-foreground">Needs love: <span className="text-foreground">{weakest.map((w) => w.short).join(", ")}</span></p>
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Suggested next moves</CardTitle></CardHeader>
            <div className="divide-y divide-border/70 border-t border-border/70">
              {weakest.map((w) => (
                <div key={w.id} className="flex gap-3 px-5 py-4">
                  <AreaIcon dim={w.id} size={32} />
                  <div><div className="text-[14px] font-medium">{w.name}</div><p className="text-[14px] text-muted-foreground">{IDEAS[w.id]}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Section title="All twelve areas">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((d) => {
            const meta = DIMS.find((x) => x.id === d.id)!;
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-center gap-3">
                  <AreaIcon dim={d.id} size={36} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-medium">{d.name}</div><div className="truncate text-[12px] text-muted-foreground">{meta.blurb}</div></div>
                  <div className="text-[20px] font-semibold tabular-nums" style={{ color: d.color }}>{d.score}</div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="w-16 shrink-0">You: {d.self}/10</span>
                  <input type="range" min={1} max={10} value={d.self} onChange={(e) => act({ t: "selfRate", dim: d.id, value: +e.target.value })} className="flex-1" style={{ accentColor: d.color }} aria-label={`How you rate ${d.name}`} />
                  <span className="w-16 shrink-0 text-right tabular-nums">{d.xp30} XP</span>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
