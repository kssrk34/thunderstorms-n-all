"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Avatar, PageHeader, Ring } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { COUSIN, COUSINS, LESSONS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import { cn, fmtShort, inr, monthStart, today } from "@/lib/utils";

export default function Money() {
  const { s, me, act } = useGame();
  const t = today();
  const ms = monthStart(t);
  const target = s.savingsTarget[me] ?? 10000;
  const mine = s.savings.filter((x) => x.userId === me);
  const month = mine.filter((x) => x.date >= ms).reduce((a, x) => a + x.amount, 0);
  const total = mine.reduce((a, x) => a + x.amount, 0);
  const learned = s.lessons[me] ?? [];
  const finGoals = s.goals.filter((g) => g.userId === me && g.cat === "finance");

  const [amt, setAmt] = useState(500);
  const [note, setNote] = useState("");
  const [income, setIncome] = useState(60000);

  const squad = COUSINS.map((c) => {
    const m = s.savings.filter((x) => x.userId === c.id && x.date >= ms).reduce((a, x) => a + x.amount, 0);
    return { id: c.id, pct: Math.round((m / (s.savingsTarget[c.id] ?? 10000)) * 100) };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-6">
      <PageHeader emoji="🪙" title="Money & Freedom" subtitle="Small, boring, consistent moves. That's how wealth is built." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-5">
            <Ring value={month / target} size={110} stroke={10} color="#facc15">
              <div><div className="font-display text-xl font-bold">{Math.round((month / target) * 100)}%</div><div className="text-[10px] text-muted-foreground">this month</div></div>
            </Ring>
            <div>
              <div className="text-xs text-muted-foreground">Saved this month</div>
              <div className="font-display text-2xl font-bold">{inr(month)}</div>
              <div className="text-xs text-muted-foreground">of {inr(target)} target</div>
              <div className="mt-2 text-xs text-muted-foreground">Lifetime: <b className="text-foreground">{inr(total)}</b></div>
            </div>
          </div>
          <label className="mt-5 block text-xs text-muted-foreground">Monthly target
            <input type="number" step={500} min={500} className="input-base mt-1" value={target} onChange={(e) => act({ t: "savingTarget", amount: Math.max(500, +e.target.value) })} />
          </label>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Log a save</CardTitle><CardDescription>₹100 saved = 1 XP (5–30 per entry)</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[200, 500, 1000, 2000, 5000].map((v) => (
                <button key={v} onClick={() => setAmt(v)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", amt === v ? "border-volt bg-yellow-400/15 text-volt" : "border-white/10 bg-white/5")}>{inr(v)}</button>
              ))}
            </div>
            <input type="number" min={1} className="input-base" value={amt} onChange={(e) => setAmt(Math.max(1, +e.target.value))} />
            <input className="input-base" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Skipped Zomato, cooked pongal instead" />
            <Button variant="volt" className="w-full" onClick={() => { act({ t: "saving", amount: amt, note }); setNote(""); }}><Plus /> Save {inr(amt)}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Squad savings race</CardTitle><CardDescription>% of each person&apos;s own target, never raw amounts</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            {squad.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-4 text-xs font-bold">{i + 1}</span>
                <Avatar id={r.id} size={28} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs"><span>{COUSIN[r.id].name}</span><span className="font-semibold">{r.pct}%</span></div>
                  <Progress value={r.pct} className="mt-1 h-1.5" color={COUSIN[r.id].color} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>📒 50 / 30 / 20 budget planner</CardTitle><CardDescription>A simple starting split for your take-home pay or stipend</CardDescription></div></CardHeader>
          <CardContent>
            <label className="text-xs text-muted-foreground">Monthly take-home
              <input type="number" step={1000} className="input-base mt-1" value={income} onChange={(e) => setIncome(Math.max(0, +e.target.value))} />
            </label>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full">
              <div className="w-1/2 bg-sky-500" /><div className="w-[30%] bg-violet-500" /><div className="w-[20%] bg-yellow-400" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["Needs", 0.5, "#38bdf8", "Rent, groceries, EMI, bills"], ["Wants", 0.3, "#8b5cf6", "Cafes, OTT, shopping, trips"], ["Save/Invest", 0.2, "#facc15", "SIP, RD, emergency fund"]].map(([l, p, c, d]) => (
                <div key={l as string} className="rounded-xl bg-white/[.03] p-3">
                  <div className="text-xs font-semibold" style={{ color: c as string }}>{l as string}</div>
                  <div className="font-display text-lg font-bold">{inr(income * (p as number))}</div>
                  <div className="text-[10px] text-muted-foreground">{d as string}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>🧠 Money literacy quests</CardTitle><CardDescription>{learned.length}/{LESSONS.length} learned · +15 XP each</CardDescription></div></CardHeader>
          <CardContent className="space-y-2">
            {LESSONS.map((l) => {
              const done = learned.includes(l.id);
              return (
                <div key={l.id} className={cn("flex items-start gap-3 rounded-xl border p-3", done ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-white/[.03]")}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.blurb}</div>
                  </div>
                  {done ? <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300"><Check className="h-4 w-4" /></span>
                    : <Button size="sm" variant="secondary" onClick={() => act({ t: "lesson", id: l.id })}>Learned</Button>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Finance goals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {finGoals.length === 0 && <p className="text-sm text-muted-foreground">Add a finance goal (e.g. emergency fund) in Habits & Goals.</p>}
            {finGoals.map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{g.title}</span><span className="text-xs text-muted-foreground">{Math.round((g.current / g.target) * 100)}%</span></div>
                <Progress value={(g.current / g.target) * 100} color="#facc15" className="h-3" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{inr(g.current)} / {inr(g.target)}</span>
                  {!g.done && <Button size="sm" variant="ghost" onClick={() => act({ t: "goalStep", id: g.id, amount: 5000 })}><Plus /> ₹5,000</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent saves</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine.slice(0, 8).map((x) => (
              <div key={x.id} className="flex items-center justify-between rounded-lg bg-white/[.03] px-3 py-2 text-sm">
                <span className="truncate">{x.note || "Saved"}</span>
                <span className="shrink-0 pl-2 text-xs"><b className="text-volt">{inr(x.amount)}</b> <span className="text-muted-foreground">· {fmtShort(x.date)}</span></span>
              </div>
            ))}
            {mine.length === 0 && <p className="text-sm text-muted-foreground">No saves yet. Even ₹100 counts!</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
