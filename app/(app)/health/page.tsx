"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Minus, Plus } from "lucide-react";
import { PageHeader, Ring, Section, axisProps, tooltipStyle, useAnimate } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEALS, WORKOUTS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { HealthDay } from "@/lib/types";
import { addDays, cn, fmtDay, today } from "@/lib/utils";

const EMPTY: HealthDay = { water: 0, sleep: 0, meals: [], workouts: [] };
const WATER = "#4C9BE8";
const SLEEP = "#6D6AE8";
const MOVE = "#34A37B";

export default function Health() {
  const { s, me, act } = useGame();
  const t = today();
  const h = s.health[me]?.[t] ?? EMPTY;
  const [wType, setWType] = useState(WORKOUTS[0]);
  const [wMins, setWMins] = useState(30);
  const anim = useAnimate();

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(t, i - 6);
    const x = s.health[me]?.[d] ?? EMPTY;
    return { d: fmtDay(d), water: x.water, sleep: x.sleep, move: x.workouts.reduce((a, w) => a + w.mins, 0) };
  });
  const logged = week.filter((w) => w.water + w.sleep + w.move > 0);
  const avg = (k: "water" | "sleep" | "move") => (logged.length ? logged.reduce((a, w) => a + w[k], 0) / logged.length : 0);
  const wellness = Math.round(Math.min(100, Math.min(1, avg("water") / 8) * 35 + Math.min(1, avg("sleep") / 7.5) * 35 + Math.min(1, avg("move") / 30) * 30));
  const moved = h.workouts.reduce((a, w) => a + w.mins, 0);

  return (
    <div className="space-y-10">
      <PageHeader title="Health" subtitle="Sustainable over strict. Good food, good sleep, joyful movement." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div><div className="text-[13px] font-medium" style={{ color: WATER }}>Water</div><div className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{h.water}<span className="text-[15px] font-normal text-muted-foreground"> / 8 glasses</span></div></div>
            {h.water >= 8 && <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: WATER }}><Check className="h-4 w-4" strokeWidth={3} /></span>}
          </div>
          <div className="mt-5 grid grid-cols-8 gap-1.5" role="group" aria-label="Glasses of water">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} onClick={() => act({ t: "health", patch: { water: i < h.water ? i : i + 1 } })} aria-label={`${i + 1} glasses`}
                className="h-10 rounded-[10px] transition-colors" style={{ background: i < h.water ? WATER : `${WATER}1f` }} />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="icon" aria-label="One less glass" disabled={h.water === 0} onClick={() => act({ t: "health", patch: { water: h.water - 1 } })}><Minus /></Button>
            <Button variant="tinted" className="flex-1" onClick={() => act({ t: "health", patch: { water: h.water + 1 } })}><Plus />Glass of water</Button>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">Eight glasses earns 15 XP.</p>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-medium" style={{ color: SLEEP }}>Sleep last night</div>
          <div className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{h.sleep}<span className="text-[15px] font-normal text-muted-foreground"> hours</span></div>
          <input type="range" min={0} max={12} step={0.5} value={h.sleep} onChange={(e) => act({ t: "health", patch: { sleep: +e.target.value } })} className="mt-6 w-full" aria-label="Hours slept" style={{ accentColor: SLEEP }} />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>0</span><span>7–9 h is the sweet spot</span><span>12</span></div>
          <p className="mt-4 text-[14px] text-muted-foreground">
            {h.sleep === 0 ? "How did you sleep? Slide to log it." : h.sleep < 6 ? "A short night. Try putting screens away an hour earlier tonight." : h.sleep <= 9.5 ? "Lovely. Rest like that is when yesterday's learning sticks." : "A long sleep. Listen to your body; rest is valid."}
          </p>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-medium" style={{ color: MOVE }}>Movement today</div>
          <div className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{moved}<span className="text-[15px] font-normal text-muted-foreground"> minutes</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <select className="field" value={wType} onChange={(e) => setWType(e.target.value)} aria-label="Type">{WORKOUTS.map((w) => <option key={w}>{w}</option>)}</select>
            <select className="field" value={wMins} onChange={(e) => setWMins(+e.target.value)} aria-label="Minutes">{[10, 15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
          </div>
          <Button variant="tinted" className="mt-2 w-full" onClick={() => act({ t: "workout", type: wType, mins: wMins })}><Plus />Log movement</Button>
          {h.workouts.length > 0 && (
            <div className="mt-3 space-y-1">{h.workouts.map((w, i) => <div key={i} className="flex justify-between text-[13px]"><span>{w.type}</span><span className="tabular-nums text-muted-foreground">{w.mins} min</span></div>)}</div>
          )}
        </Card>
      </div>

      <Section title="Mindful plate">
        <Card className="p-5">
          <p className="mb-4 text-[14px] text-muted-foreground">Vegetarian, balanced and joyful. Treats count too, with zero guilt.</p>
          <div className="flex flex-wrap gap-2">
            {MEALS.map((m) => {
              const on = h.meals.includes(m.id);
              return (
                <button key={m.id} onClick={() => act({ t: "meal", mealId: m.id })} aria-pressed={on}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] transition", on ? "border-transparent bg-success text-white" : "border-border bg-card hover:bg-secondary/60")}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}{m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">Protein tip: pair dal, sprouts, paneer, curd or peanut chutney with each main meal. Millets keep energy steady through long days.</p>
        </Card>
      </Section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>Your week</CardTitle><CardDescription>Water in glasses, sleep in hours.</CardDescription></div></CardHeader>
          <div className="h-60 px-2 pb-4 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={week} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="d" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Bar isAnimationActive={anim} dataKey="water" name="Water" fill={WATER} radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Line isAnimationActive={anim} dataKey="sleep" name="Sleep" stroke={SLEEP} strokeWidth={2.5} dot={{ r: 3, fill: SLEEP, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <Ring value={wellness / 100} size={128} stroke={12} color={MOVE}>
            <div><div className="text-[30px] font-semibold leading-none tracking-tight tabular-nums">{wellness}</div><div className="mt-1 text-[11px] text-muted-foreground">wellness</div></div>
          </Ring>
          <div className="mt-5 grid w-full grid-cols-3 gap-2 text-[12px]">
            <div><div className="text-[15px] font-semibold tabular-nums">{avg("water").toFixed(1)}</div><div className="text-muted-foreground">glasses</div></div>
            <div><div className="text-[15px] font-semibold tabular-nums">{avg("sleep").toFixed(1)}h</div><div className="text-muted-foreground">sleep</div></div>
            <div><div className="text-[15px] font-semibold tabular-nums">{Math.round(avg("move"))}m</div><div className="text-muted-foreground">moving</div></div>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">7-day average on the days you logged.</p>
        </Card>
      </div>
    </div>
  );
}
