"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Minus, Plus } from "lucide-react";
import { PageHeader, Ring, tooltipStyle } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEALS, WORKOUTS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { HealthDay } from "@/lib/types";
import { addDays, cn, fmtDay, today } from "@/lib/utils";

const EMPTY: HealthDay = { water: 0, sleep: 0, meals: [], workouts: [] };

export default function Health() {
  const { s, me, act } = useGame();
  const t = today();
  const h = s.health[me]?.[t] ?? EMPTY;
  const [wType, setWType] = useState(WORKOUTS[0]);
  const [wMins, setWMins] = useState(30);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(t, i - 6);
    const x = s.health[me]?.[d] ?? EMPTY;
    return { d: fmtDay(d), water: x.water, sleep: x.sleep, move: x.workouts.reduce((a, w) => a + w.mins, 0) };
  });
  const daysLogged = week.filter((w) => w.water + w.sleep > 0);
  const avg = (k: "water" | "sleep" | "move") => daysLogged.length ? daysLogged.reduce((a, w) => a + w[k], 0) / daysLogged.length : 0;
  const wellness = Math.round(Math.min(100, (Math.min(1, avg("water") / 8) * 35 + Math.min(1, avg("sleep") / 7.5) * 35 + Math.min(1, avg("move") / 30) * 30)));
  const balancedToday = h.meals.filter((m) => MEALS.find((x) => x.id === m)?.balanced).length;

  return (
    <div className="space-y-6">
      <PageHeader emoji="💪" title="Health & Lifestyle" subtitle="Sustainable over strict. Good food, good sleep, joyful movement." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><div><CardTitle>💧 Hydration</CardTitle><CardDescription>8 glasses = +15 XP</CardDescription></div><span className="font-display text-2xl font-bold text-sky-300">{h.water}/8</span></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <button key={i} onClick={() => act({ t: "health", patch: { water: i < h.water ? i : i + 1 } })} aria-label={`${i + 1} glasses`}
                  className={cn("relative grid h-14 place-items-end overflow-hidden rounded-b-xl rounded-t-md border-2 transition", i < h.water ? "border-sky-400/70" : "border-white/15 hover:border-sky-400/40")}>
                  <div className={cn("w-full transition-all duration-500", i < h.water ? "h-[85%] bg-gradient-to-t from-sky-500 to-cyan-300" : "h-0")} />
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => act({ t: "health", patch: { water: Math.max(0, h.water - 1) } })}><Minus /></Button>
              <Button size="sm" className="flex-1" onClick={() => act({ t: "health", patch: { water: h.water + 1 } })}><Plus /> Glass of water</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>🌙 Sleep</CardTitle><CardDescription>7–9 hours = +15 XP</CardDescription></div><span className="font-display text-2xl font-bold text-violet-300">{h.sleep}h</span></CardHeader>
          <CardContent>
            <input type="range" min={0} max={12} step={0.5} value={h.sleep} onChange={(e) => act({ t: "health", patch: { sleep: +e.target.value } })} className="w-full" aria-label="Hours slept" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0h</span><span>6h</span><span className="text-emerald-300">7–9h sweet spot</span><span>12h</span></div>
            <p className="mt-4 rounded-xl bg-violet-500/10 p-3 text-xs text-violet-200">
              {h.sleep === 0 ? "How did you sleep last night? Slide to log." : h.sleep < 6 ? "Short night. Try a no-screens rule after 11 pm tonight 📵" : h.sleep <= 9.5 ? "Beautiful. Your brain consolidated yesterday's learning while you slept 🧠" : "Long sleep! Listen to your body. Rest is valid."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>🏃 Movement</CardTitle><CardDescription>Any movement counts</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="input-base" value={wType} onChange={(e) => setWType(e.target.value)}>{WORKOUTS.map((w) => <option key={w}>{w}</option>)}</select>
              <select className="input-base" value={wMins} onChange={(e) => setWMins(+e.target.value)}>{[10, 15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </div>
            <Button className="w-full" onClick={() => act({ t: "workout", type: wType, mins: wMins })}><Plus /> Log workout</Button>
            <div className="space-y-1.5">
              {h.workouts.length === 0 && <p className="text-xs text-muted-foreground">Nothing yet today. Even a 10-minute walk after lunch counts!</p>}
              {h.workouts.map((w, i) => <div key={i} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm"><span>{w.type}</span><span className="text-muted-foreground">{w.mins} min</span></div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>🍛 Mindful plate</CardTitle><CardDescription>South Indian vegetarian, balanced and joyful. Treats are logged too, with zero guilt.</CardDescription></div>
          <span className="chip text-emerald-300">{balancedToday} balanced today</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {MEALS.map((m) => {
              const on = h.meals.includes(m.id);
              return (
                <button key={m.id} onClick={() => act({ t: "meal", mealId: m.id })}
                  className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition", on ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/[.03] hover:bg-white/[.07]")}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="flex-1 leading-tight">{m.label}{m.balanced && <span className="mt-0.5 block text-[10px] text-emerald-300">protein + fibre</span>}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">🌿 Protein tip for vegetarians: pair dal, sprouts, paneer, curd or peanut chutney with each main meal. Millets (ragi, jowar, foxtail) keep energy steady through long work and study days.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>Your week</CardTitle><CardDescription>Water (glasses) and sleep (hours)</CardDescription></div></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={week} margin={{ left: -20, right: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="water" name="Water" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                <Line dataKey="sleep" name="Sleep" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4, fill: "#a78bfa" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <Ring value={wellness / 100} size={120} stroke={10} color="#34d399">
            <div><div className="font-display text-3xl font-bold">{wellness}</div><div className="text-[10px] text-muted-foreground">wellness</div></div>
          </Ring>
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-xs">
            <div><div className="font-semibold">{avg("water").toFixed(1)}</div><div className="text-muted-foreground">avg glasses</div></div>
            <div><div className="font-semibold">{avg("sleep").toFixed(1)}h</div><div className="text-muted-foreground">avg sleep</div></div>
            <div><div className="font-semibold">{Math.round(avg("move"))}m</div><div className="text-muted-foreground">avg movement</div></div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Progress, not perfection. 80% consistency beats 100% burnout.</p>
        </Card>
      </div>
    </div>
  );
}
