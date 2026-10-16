"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Swords } from "lucide-react";
import { Avatar, LevelPill, PageHeader, tooltipStyle, useLevel } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COUSIN, COUSINS } from "@/lib/catalog";
import { activeDates, consistency, leaderboard, streakOf, underdogMultiplier, userLogs, xpBetween, type Metric, type Period } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { Duel, GameState } from "@/lib/types";
import { addDays, cn, fmtShort, monthStart, today, weekStart } from "@/lib/utils";

const METRIC_LABEL: Record<Metric, string> = { xp: "XP", streak: "Streak", consistency: "Consistency", badges: "Badges" };
const unit = (m: Metric) => (m === "xp" ? "XP" : m === "streak" ? "days" : m === "consistency" ? "%" : "badges");

function trophies(s: GameState) {
  const t = today();
  const ws = weekStart(t);
  const lws = addDays(ws, -7);
  const ms = monthStart(t);
  const best = (f: (id: string) => number) => COUSINS.map((c) => ({ id: c.id, v: f(c.id) })).sort((a, b) => b.v - a.v)[0];
  return [
    { emoji: "🏆", title: "Weekly MVP", desc: "Most XP this week", ...best((id) => xpBetween(userLogs(s, id), ws)), fmt: (v: number) => `${v} XP` },
    { emoji: "🎯", title: "Consistency Crown", desc: "Most active days (7d)", ...best((id) => consistency(s, id, 7)), fmt: (v: number) => `${v}%` },
    { emoji: "🔥", title: "Streak Master", desc: "Longest live streak", ...best((id) => streakOf(s, id).current), fmt: (v: number) => `${v} days` },
    { emoji: "🧲", title: "Squad Glue", desc: "Most meetups this month", ...best((id) => s.meetups.filter((m) => m.date >= ms && m.attendees.includes(id)).length), fmt: (v: number) => `${v} meetups` },
    { emoji: "🚀", title: "Comeback Kid", desc: "Biggest jump vs last week", ...best((id) => xpBetween(userLogs(s, id), ws) - xpBetween(userLogs(s, id), lws, addDays(ws, -1))), fmt: (v: number) => `${v >= 0 ? "+" : ""}${v} XP` },
    { emoji: "⚖️", title: "Balanced Being", desc: "Life areas touched this week", ...best((id) => new Set(userLogs(s, id).filter((l) => l.date >= ws && l.xp > 0).map((l) => l.dim)).size), fmt: (v: number) => `${v}/12 areas` },
  ];
}

function duelScore(s: GameState, d: Duel, id: string) {
  const end = d.period === "week" ? addDays(d.start, 6) : addDays(monthStart(addDays(d.start, 32)), -1);
  if (d.metric === "xp") return xpBetween(userLogs(s, id), d.start, end);
  return Array.from(activeDates(s, id)).filter((x) => x >= d.start && x <= end).length;
}

export default function League() {
  const { s, me, act } = useGame();
  const [period, setPeriod] = useState<Period>("weekly");
  const [metric, setMetric] = useState<Metric>("xp");
  const rows = leaderboard(s, period, metric);
  const podium = [rows[1], rows[0], rows[2]];
  const surge = COUSINS.find((c) => underdogMultiplier(s, c.id) > 1);

  const t = today();
  const weeks = [3, 2, 1, 0].map((k) => {
    const ws = addDays(weekStart(t), -7 * k);
    const row: Record<string, number | string> = { w: k === 0 ? "This wk" : `Wk of ${fmtShort(ws)}` };
    for (const c of COUSINS) row[c.name] = xpBetween(userLogs(s, c.id), ws, addDays(ws, 6));
    return row;
  });

  const [duelOpen, setDuelOpen] = useState(false);
  const [dd, setDd] = useState<Omit<Duel, "id" | "start">>({ a: me, b: COUSINS.find((c) => c.id !== me)!.id, metric: "xp", period: "week", stake: "Loser buys Irani chai + Osmania biscuits ☕" });

  return (
    <div className="space-y-6">
      <PageHeader emoji="🏆" title="Cousin League" subtitle="Friendly rivalry, real growth. Rankings update live as anyone logs."
        action={<Button onClick={() => { setDd({ ...dd, a: me }); setDuelOpen(true); }}><Swords /> Challenge to a duel</Button>} />

      <div className="flex flex-wrap gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>{(["daily", "weekly", "monthly", "all"] as Period[]).map((p) => <TabsTrigger key={p} value={p} className="capitalize">{p === "all" ? "All-time" : p}</TabsTrigger>)}</TabsList>
        </Tabs>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>{(Object.keys(METRIC_LABEL) as Metric[]).map((m) => <TabsTrigger key={m} value={m}>{METRIC_LABEL[m]}</TabsTrigger>)}</TabsList>
        </Tabs>
      </div>

      {/* podium */}
      <Card className="relative overflow-hidden p-6 pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(400px_160px_at_50%_0%,rgba(250,204,21,.18),transparent)]" />
        <div className="relative mx-auto grid max-w-2xl grid-cols-3 items-end gap-3 sm:gap-6">
          {podium.map((r, i) => {
            if (!r) return <div key={i} />;
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            const h = place === 1 ? "h-32 sm:h-40" : place === 2 ? "h-24 sm:h-28" : "h-16 sm:h-20";
            return (
              <div key={r.id} className="flex flex-col items-center">
                {place === 1 && <div className="mb-1 animate-float text-3xl">👑</div>}
                <Avatar id={r.id} size={place === 1 ? 76 : 58} />
                <div className="mt-2 text-center text-sm font-semibold">{COUSIN[r.id].name}</div>
                <div className="font-display text-lg font-bold text-volt">{r.value}<span className="ml-1 text-xs font-medium text-muted-foreground">{unit(metric)}</span></div>
                <div className={cn("mt-2 grid w-full place-items-center rounded-t-2xl border border-b-0 border-white/10 font-display text-3xl font-bold", h,
                  place === 1 ? "bg-gradient-to-b from-yellow-400/40 to-yellow-400/5 text-yellow-200" : place === 2 ? "bg-gradient-to-b from-slate-300/30 to-transparent text-slate-200" : "bg-gradient-to-b from-orange-400/30 to-transparent text-orange-200")}>
                  {place}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><div><CardTitle>Full standings</CardTitle><CardDescription>Ranked by {METRIC_LABEL[metric].toLowerCase()} · {period === "all" ? "all-time" : period}</CardDescription></div></CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r, i) => <RowItem key={r.id} r={r} i={i} me={me} />)}
            {surge && (
              <div className="mt-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-100">
                🌪️ <b>Underdog Surge:</b> {COUSIN[surge.id].name} is earning 1.25× XP until they catch up. Nobody stays at the bottom for long.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>Duels ⚔️</CardTitle><CardDescription>Head-to-head, low stakes, high banter</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            {s.duels.map((d) => {
              const a = duelScore(s, d, d.a), b = duelScore(s, d, d.b);
              const pct = a + b === 0 ? 50 : (a / (a + b)) * 100;
              return (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Avatar id={d.a} size={30} /><span className="text-sm font-semibold">{a}</span></div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.metric === "xp" ? "XP" : "Active days"} · {d.period}</span>
                    <div className="flex items-center gap-2"><span className="text-sm font-semibold">{b}</span><Avatar id={d.b} size={30} /></div>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                    <div style={{ width: `${pct}%`, background: COUSIN[d.a].color }} className="transition-all duration-700" />
                    <div className="flex-1" style={{ background: COUSIN[d.b].color }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">🎲 {d.stake}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">This week&apos;s trophies</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {trophies(s).map((tr) => (
            <Card key={tr.title} className="p-4 text-center transition hover:-translate-y-1">
              <div className="text-3xl">{tr.emoji}</div>
              <div className="mt-1 text-sm font-semibold">{tr.title}</div>
              <div className="text-[11px] text-muted-foreground">{tr.desc}</div>
              <div className="mt-3 flex items-center justify-center gap-2"><Avatar id={tr.id} size={26} /><span className="text-sm font-medium">{COUSIN[tr.id].name}</span></div>
              <div className="mt-1 text-xs font-bold text-volt">{tr.fmt(tr.v)}</div>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Weekly XP, week by week</CardTitle><CardDescription>Who&apos;s trending up?</CardDescription></div></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ left: -15, right: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="w" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {COUSINS.map((c) => <Bar key={c.id} dataKey={c.name} fill={c.color} radius={[6, 6, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={duelOpen} onOpenChange={setDuelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start a duel ⚔️</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Opponent</div>
            <div className="flex flex-wrap gap-2">
              {COUSINS.filter((c) => c.id !== me).map((c) => (
                <button key={c.id} onClick={() => setDd({ ...dd, b: c.id })} className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs", dd.b === c.id ? "border-sky-400/60 bg-sky-500/15" : "border-white/10 bg-white/5")}>
                  <Avatar id={c.id} size={22} ring={false} /> {c.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input-base" value={dd.metric} onChange={(e) => setDd({ ...dd, metric: e.target.value as Duel["metric"] })}><option value="xp">Most XP</option><option value="days">Most active days</option></select>
              <select className="input-base" value={dd.period} onChange={(e) => setDd({ ...dd, period: e.target.value as Duel["period"] })}><option value="week">This week</option><option value="month">This month</option></select>
            </div>
            <input className="input-base" value={dd.stake} onChange={(e) => setDd({ ...dd, stake: e.target.value })} placeholder="Stakes (keep it fun!)" />
            <Button className="w-full" onClick={() => { act({ t: "duel", d: { ...dd, a: me } }); setDuelOpen(false); }}><Plus /> Throw down the gauntlet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowItem({ r, i, me }: { r: ReturnType<typeof leaderboard>[number]; i: number; me: string }) {
  const L = useLevel(r.id);
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.02] px-3 py-2.5", r.id === me && "border-sky-400/30 bg-sky-500/10")}>
      <span className="w-6 text-center font-display font-bold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
      <Avatar id={r.id} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">{COUSIN[r.id].name} <LevelPill id={r.id} /></div>
        <div className="truncate text-[11px] text-muted-foreground">{L.title} · {COUSIN[r.id].role}</div>
      </div>
      <div className="hidden gap-4 text-center text-[11px] text-muted-foreground sm:flex">
        <div><div className="font-semibold text-foreground">{r.xp}</div>XP</div>
        <div><div className="font-semibold text-foreground">🔥{r.streak}</div>streak</div>
        <div><div className="font-semibold text-foreground">{r.consistency}%</div>consist.</div>
        <div><div className="font-semibold text-foreground">{r.badges}</div>badges</div>
      </div>
      <div className="font-display text-lg font-bold text-volt sm:hidden">{r.value}</div>
    </div>
  );
}
