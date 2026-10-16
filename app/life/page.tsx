"use client";

import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Avatar, PageHeader, Ring, tooltipStyle } from "@/components/game";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUSIN, COUSINS, DIMS } from "@/lib/catalog";
import { dimScores } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { cn } from "@/lib/utils";

const IDEAS: Record<DimId, string> = {
  health: "Try a 20-minute evening walk around your lake (Durgam Cheruvu or Ulsoor) three times this week.",
  mind: "Pick one book and read 10 pages before bed. That's a book a month.",
  emotional: "Do a 2-minute mood check-in each night and name one feeling.",
  career: "Block one 45-minute deep-work slot daily with notifications off.",
  money: "Automate a ₹1,000 SIP the day after salary or stipend lands.",
  family: "Call a grandparent this weekend. Ask them about their twenties.",
  friends: "Message one old school friend you haven't spoken to in a year.",
  creativity: "Spend 30 minutes this weekend on something just for fun: kolam, music, sketching.",
  giving: "Volunteer for one weekend morning at a local NGO or a teach-for-a-day program.",
  calm: "Try 5 minutes of pranayama or quiet sitting after waking.",
  adventure: "Plan a one-day trip: Ananthagiri Hills, Bhongir Fort, or Nandi Hills.",
  vision: "Write down 3 things you want your 25-year-old self to be proud of.",
};

export default function Life() {
  const { s, me, act } = useGame();
  const [cmp, setCmp] = useState<string | null>(null);
  const mine = dimScores(s, me);
  const other = cmp ? dimScores(s, cmp) : null;
  const data = mine.map((d, i) => ({ dim: d.emoji + " " + d.name.split(" ")[0], me: d.score, other: other?.[i].score ?? 0 }));
  const overall = Math.round(mine.reduce((a, d) => a + d.score, 0) / mine.length);
  const sorted = [...mine].sort((a, b) => a.score - b.score);
  const weakest = sorted.slice(0, 2);
  const strongest = sorted[sorted.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader emoji="🌐" title="12 Life Areas" subtitle="A balanced life, not a lopsided one. Scores blend your self-rating with 30 days of action." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div><CardTitle>Your life wheel</CardTitle><CardDescription>Compare with a cousin for inspiration, not judgement</CardDescription></div>
            <div className="flex gap-1">
              {COUSINS.filter((c) => c.id !== me).map((c) => (
                <button key={c.id} onClick={() => setCmp(cmp === c.id ? null : c.id)} className={cn("rounded-full transition", cmp === c.id ? "ring-2 ring-volt" : "opacity-50 hover:opacity-100")}>
                  <Avatar id={c.id} size={28} ring={false} />
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[360px] sm:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,.1)" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={COUSIN[me].name} dataKey="me" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} strokeWidth={2} />
                {cmp && <Radar name={COUSIN[cmp].name} dataKey="other" stroke="#facc15" fill="#facc15" fillOpacity={0.12} strokeWidth={2} strokeDasharray="4 3" />}
                <Tooltip {...tooltipStyle} />
                {cmp && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center gap-5">
              <Ring value={overall / 100} size={96} stroke={9} color="#8b5cf6">
                <div><div className="font-display text-2xl font-bold">{overall}</div><div className="text-[10px] text-muted-foreground">/ 100</div></div>
              </Ring>
              <div>
                <div className="font-display text-lg font-semibold">Life Balance Score</div>
                <p className="text-sm text-muted-foreground">Strongest: <b className="text-foreground">{strongest.emoji} {strongest.name}</b></p>
                <p className="text-sm text-muted-foreground">Needs love: <b className="text-foreground">{weakest.map((w) => w.emoji + " " + w.name.split(" ")[0]).join(", ")}</b></p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>✨ Suggested next moves</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {weakest.map((w) => (
                <div key={w.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <div className="text-sm font-semibold" style={{ color: w.color }}>{w.emoji} {w.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{IDEAS[w.id]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((d) => {
          const meta = DIMS.find((x) => x.id === d.id)!;
          return (
            <Card key={d.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: d.color + "22" }}>{d.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground">{meta.blurb}</div>
                </div>
                <div className="font-display text-xl font-bold" style={{ color: d.color }}>{d.score}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: `linear-gradient(90deg, ${d.color}88, ${d.color})` }} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="w-20 shrink-0">Self-rating {d.self}/10</span>
                <input type="range" min={1} max={10} value={d.self} onChange={(e) => act({ t: "selfRate", dim: d.id, value: +e.target.value })} className="flex-1" aria-label={`Self rating for ${d.name}`} />
                <span className="w-16 shrink-0 text-right">{d.xp30} XP/30d</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
