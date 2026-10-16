"use client";

import { useState } from "react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { DimChip, Empty, PageHeader } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIM, DIMS } from "@/lib/catalog";
import { habitDone, userLogs, xpBetween } from "@/lib/engine";
import { habitsFor, useGame } from "@/lib/store";
import type { DimId, Goal } from "@/lib/types";
import { addDays, cn, daysBetween, fmtShort, today } from "@/lib/utils";

const CATS: { id: Goal["cat"]; label: string; emoji: string }[] = [
  { id: "career", label: "Career", emoji: "🚀" }, { id: "learning", label: "Learning", emoji: "🧠" }, { id: "health", label: "Health", emoji: "💪" },
  { id: "finance", label: "Finance", emoji: "🪙" }, { id: "hobby", label: "Hobbies", emoji: "🎨" }, { id: "personal", label: "Personal", emoji: "🌱" },
];

export default function HabitsGoals() {
  const { s, me, act } = useGame();
  const t = today();
  const habits = habitsFor(s, me);
  const logs = userLogs(s, me);
  const days = Array.from({ length: 35 }, (_, i) => addDays(t, i - 34));
  const maxXp = Math.max(1, ...days.map((d) => xpBetween(logs, d, d)));

  const [hOpen, setHOpen] = useState(false);
  const [h, setH] = useState({ title: "", emoji: "✨", dim: "health" as DimId, xp: 15 });
  const [gOpen, setGOpen] = useState(false);
  const [g, setG] = useState({ title: "", dim: "career" as DimId, cat: "career" as Goal["cat"], target: 10, unit: "sessions", xpPerStep: 10, due: addDays(t, 30) });
  const goals = s.goals.filter((x) => x.userId === me);

  const habitStreak = (id: string) => {
    let n = 0;
    let d = habitDone(s, me, id, t) ? t : addDays(t, -1);
    while (habitDone(s, me, id, d)) { n++; d = addDays(d, -1); }
    return n;
  };

  return (
    <div className="space-y-6">
      <PageHeader emoji="✅" title="Habits & Goals" subtitle="Tiny daily reps, big long-term wins. Never miss twice." />

      <Card>
        <CardHeader><div><CardTitle>Consistency map</CardTitle><CardDescription>Last 5 weeks: brighter means more XP that day</CardDescription></div></CardHeader>
        <CardContent>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-1" style={{ gridAutoColumns: "minmax(18px, 1fr)" }}>
            {days.map((d) => {
              const v = xpBetween(logs, d, d);
              const k = v <= 0 ? 0 : Math.min(1, v / maxXp);
              return <div key={d} title={`${fmtShort(d)}: ${v} XP`} className="aspect-square rounded-md ring-1 ring-white/5" style={{ background: k === 0 ? "rgba(255,255,255,.04)" : `rgba(56,189,248,${0.15 + k * 0.85})`, boxShadow: k > 0.8 ? "0 0 10px rgba(56,189,248,.5)" : undefined }} />;
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="habits">
        <TabsList><TabsTrigger value="habits">Daily habits</TabsTrigger><TabsTrigger value="goals">Goals & milestones</TabsTrigger></TabsList>

        <TabsContent value="habits" className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setHOpen(true)}><Plus /> New habit</Button></div>
          {habits.map((hb) => {
            const done = habitDone(s, me, hb.id);
            const st = habitStreak(hb.id);
            return (
              <Card key={hb.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <button onClick={() => act({ t: "habit", habitId: hb.id })} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 text-xl transition", done ? "border-emerald-400 bg-emerald-400/20" : "border-white/15 hover:border-sky-400")}>
                    {done ? <Check className="h-5 w-5 text-emerald-300" strokeWidth={3} /> : hb.emoji}
                  </button>
                  <div className="min-w-0">
                    <div className="font-medium">{hb.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5"><DimChip dim={hb.dim} /><span className="chip text-volt">+{hb.xp} XP</span>{st > 0 && <span className="chip text-orange-300">🔥 {st}d</span>}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)).map((d) => (
                      <div key={d} title={fmtShort(d)} className={cn("h-5 w-2.5 rounded-sm sm:w-3", habitDone(s, me, hb.id, d) ? "bg-gradient-to-t from-sky-500 to-violet-400" : "bg-white/10")} />
                    ))}
                  </div>
                  <button onClick={() => act({ t: "habitRemove", habitId: hb.id })} className="text-muted-foreground hover:text-destructive" aria-label="Remove habit"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-end"><Button onClick={() => setGOpen(true)}><Plus /> New goal</Button></div>
          {goals.length === 0 && <Empty emoji="🎯" text="No goals yet. What would make this year legendary?" />}
          {CATS.map((c) => {
            const list = goals.filter((x) => x.cat === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{c.emoji} {c.label}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((x) => {
                    const money = x.unit === "₹";
                    const step = money ? 1000 : 1;
                    return (
                      <Card key={x.id} className={cn("p-4", x.done && "border-emerald-400/30")}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{x.done && "🏆 "}{x.title}</div>
                            <div className="mt-1 flex gap-1.5"><DimChip dim={x.dim} /><span className="chip text-muted-foreground">{x.done ? "Completed" : `${daysBetween(t, x.due)}d left`}</span></div>
                          </div>
                          <button onClick={() => act({ t: "goalDel", id: x.id })} className="text-muted-foreground hover:text-destructive" aria-label="Delete goal"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <Progress value={(x.current / x.target) * 100} className="mt-3 h-3" color={x.done ? "#34d399" : DIM[x.dim].color} />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{money ? `₹${x.current.toLocaleString("en-IN")} / ₹${x.target.toLocaleString("en-IN")}` : `${x.current} / ${x.target} ${x.unit}`} · {Math.round((x.current / x.target) * 100)}%</span>
                          {!x.done && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => act({ t: "goalStep", id: x.id, amount: -step })}><Minus /></Button>
                              <Button size="sm" onClick={() => act({ t: "goalStep", id: x.id, amount: step })}><Plus /> {money ? "₹1,000" : 1}</Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={hOpen} onOpenChange={setHOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New daily habit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className="input-base w-16 text-center text-xl" value={h.emoji} onChange={(e) => setH({ ...h, emoji: e.target.value })} maxLength={4} />
              <input className="input-base" placeholder="e.g. 10 min Telugu/Tamil reading with Amma" value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} />
            </div>
            <select className="input-base" value={h.dim} onChange={(e) => setH({ ...h, dim: e.target.value as DimId })}>{DIMS.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>)}</select>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>XP reward (keep it honest!)</span><span>+{h.xp}</span></div>
              <input type="range" min={5} max={30} step={5} value={h.xp} onChange={(e) => setH({ ...h, xp: +e.target.value })} className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground">💡 Tip: anchor it to something you already do. &ldquo;After my morning filter coffee, I will…&rdquo;</p>
            <Button className="w-full" disabled={!h.title.trim()} onClick={() => { act({ t: "habitAdd", habit: { ...h, title: h.title.trim() } }); setHOpen(false); setH({ ...h, title: "" }); }}>Add habit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gOpen} onOpenChange={setGOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className="input-base" placeholder="e.g. Finish the Google UX certificate" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Category
                <select className="input-base mt-1" value={g.cat} onChange={(e) => setG({ ...g, cat: e.target.value as Goal["cat"] })}>{CATS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select>
              </label>
              <label className="text-xs text-muted-foreground">Life area
                <select className="input-base mt-1" value={g.dim} onChange={(e) => setG({ ...g, dim: e.target.value as DimId })}>{DIMS.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>)}</select>
              </label>
              <label className="text-xs text-muted-foreground">Target
                <input type="number" min={1} className="input-base mt-1" value={g.target} onChange={(e) => setG({ ...g, target: Math.max(1, +e.target.value) })} />
              </label>
              <label className="text-xs text-muted-foreground">Unit
                <input className="input-base mt-1" value={g.unit} onChange={(e) => setG({ ...g, unit: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">XP per step
                <input type="number" min={1} max={50} className="input-base mt-1" value={g.xpPerStep} onChange={(e) => setG({ ...g, xpPerStep: Math.min(50, Math.max(1, +e.target.value)) })} />
              </label>
              <label className="text-xs text-muted-foreground">Due date
                <input type="date" className="input-base mt-1" value={g.due} onChange={(e) => setG({ ...g, due: e.target.value })} />
              </label>
            </div>
            <Button className="w-full" disabled={!g.title.trim()} onClick={() => { act({ t: "goalAdd", g: { ...g, title: g.title.trim() } }); setGOpen(false); }}>Create goal (+100 XP when crushed)</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
