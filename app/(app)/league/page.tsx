"use client";

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Swords, Wind } from "lucide-react";
import { SquadArt } from "@/components/brand";
import { Avatar, AvatarView, EmptyState, PageHeader, Section, axisProps, tooltipStyle, useLevel, useAnimate } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeDates, consistency, leaderboard, memberIds, squadWeekXp, squadWeeklyGoal, streakOf, underdogMultiplier, userLogs, xpBetween, type Metric, type Period } from "@/lib/engine";
import { useGame, useMember } from "@/lib/store";
import type { Duel, GameState } from "@/lib/types";
import { addDays, cn, fmtDay, fmtShort, monthStart, plural, timeAgo, today, weekStart } from "@/lib/utils";

const METRIC: Record<Metric, { label: string; unit: string }> = {
  xp: { label: "XP", unit: "XP" }, streak: { label: "Streak", unit: "days" }, consistency: { label: "Consistency", unit: "%" }, badges: { label: "Badges", unit: "" },
};

function trophies(s: GameState) {
  const t = today();
  const ws = weekStart(t);
  const ids = memberIds(s);
  const best = (f: (id: string) => number) => ids.map((id) => ({ id, v: f(id) })).sort((a, b) => b.v - a.v)[0];
  return [
    { title: "Most XP", ...best((id) => xpBetween(userLogs(s, id), ws)), fmt: (v: number) => `${v} XP` },
    { title: "Most consistent", ...best((id) => consistency(s, id, 7)), fmt: (v: number) => `${v}% of days` },
    { title: "Longest streak", ...best((id) => streakOf(s, id).current), fmt: (v: number) => plural(v, "day") },
    { title: "Most balanced", ...best((id) => new Set(userLogs(s, id).filter((l) => l.date >= ws && l.xp > 0).map((l) => l.dim)).size), fmt: (v: number) => `${v} of 12 areas` },
  ].filter((x) => x.v > 0);
}

function duelScore(s: GameState, d: Duel, id: string) {
  const end = d.period === "week" ? addDays(d.start, 6) : addDays(monthStart(addDays(d.start, 32)), -1);
  if (d.metric === "xp") return xpBetween(userLogs(s, id), d.start, end);
  return Array.from(activeDates(s, id)).filter((x) => x >= d.start && x <= end).length;
}

export default function League() {
  const { s, me } = useGame();
  const [period, setPeriod] = useState<Period>("weekly");
  const [metric, setMetric] = useState<Metric>("xp");
  const [duelOpen, setDuelOpen] = useState(false);
  const anim = useAnimate();

  if (s.members.length < 2) {
    return (
      <div>
        <PageHeader title="Cousins" subtitle="Friendly rivalry, real growth." />
        <Card>
          <EmptyState art={<SquadArt />} title="Your league is waiting" body="Leaderboards, shared challenges and the squad charge light up as soon as a cousin joins."
            action={<Button asChild><Link href="/settings#cousins">Invite your cousins</Link></Button>} />
        </Card>
      </div>
    );
  }

  const rows = leaderboard(s, period, metric);
  const surge = s.members.find((m) => underdogMultiplier(s, m.id) > 1);
  const squad = squadWeekXp(s);
  const goal = squadWeeklyGoal(s);
  const feed = s.logs.filter((l) => l.userId !== me && l.xp > 0).slice(-8).reverse();
  const t = today();
  const weeks = [3, 2, 1, 0].map((k) => {
    const ws = addDays(weekStart(t), -7 * k);
    const row: Record<string, number | string> = { w: k === 0 ? "This week" : fmtShort(ws) };
    for (const m of s.members) row[m.id] = Math.max(0, xpBetween(userLogs(s, m.id), ws, addDays(ws, 6)));
    return row;
  });
  const tr = trophies(s);

  return (
    <div className="space-y-10">
      <PageHeader title="Cousins" subtitle="Friendly rivalry, real growth. Rankings update as anyone logs."
        action={<Button size="sm" variant="secondary" onClick={() => setDuelOpen(true)}><Swords />Duel</Button>} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="weekly">This week</TabsTrigger><TabsTrigger value="monthly">This month</TabsTrigger><TabsTrigger value="all">All time</TabsTrigger>
            </TabsList>
          </Tabs>
          <select className="field h-9 w-auto rounded-[11px] text-[13px]" value={metric} onChange={(e) => setMetric(e.target.value as Metric)} aria-label="Rank by">
            {(Object.keys(METRIC) as Metric[]).map((m) => <option key={m} value={m}>Rank by {m === "xp" ? "XP" : METRIC[m].label.toLowerCase()}</option>)}
          </select>
        </div>
        <List>
          {rows.map((r, i) => <StandingRow key={r.id} id={r.id} rank={i + 1} value={r.value} unit={METRIC[metric].unit} me={me} />)}
        </List>
        {surge && (
          <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
            <Wind className="h-4 w-4 shrink-0 text-primary" />
            <span><Name id={surge.id} /> has the underdog boost: 1.25× XP until they catch up. Nobody stays at the bottom for long.</span>
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Squad charge</CardTitle><CardDescription>Everyone&apos;s XP this week, together.</CardDescription></div></CardHeader>
          <div className="px-5 pb-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[34px] font-semibold leading-none tracking-tight tabular-nums">{squad.toLocaleString("en-IN")}</span>
              <span className="text-[15px] text-muted-foreground">of {goal.toLocaleString("en-IN")} XP</span>
            </div>
            <Progress value={(squad / goal) * 100} className="mt-4 h-2.5" color="hsl(var(--accent))" />
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">{s.members.map((m) => <AvatarView key={m.id} member={m} size={30} className="ring-2 ring-card" />)}</div>
              <span className="text-[13px] text-muted-foreground">{squad >= goal ? "Fully charged. Plan something together this weekend." : `${(goal - squad).toLocaleString("en-IN")} XP to go`}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Recent activity</CardTitle><CardDescription>What your cousins have been up to.</CardDescription></div></CardHeader>
          {feed.length === 0 ? (
            <p className="px-5 pb-6 text-[15px] text-muted-foreground">Nothing yet. It&apos;s the calm before the storm.</p>
          ) : (
            <div className="divide-y divide-border/70 border-t border-border/70">
              {feed.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar id={l.userId} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px]"><span className="font-medium"><Name id={l.userId} /></span> <span className="text-muted-foreground">{l.label}</span></div>
                    <div className="text-[11px] text-muted-foreground/80">{l.date === t ? timeAgo(l.ts) : fmtDay(l.date)}</div>
                  </div>
                  <span className="text-[13px] font-medium tabular-nums text-muted-foreground">+{l.xp}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {s.duels.length > 0 && (
        <Section title="Duels">
          <div className="grid gap-4 md:grid-cols-2">
            {s.duels.slice(0, 6).map((d) => <DuelCard key={d.id} d={d} />)}
          </div>
        </Section>
      )}

      {tr.length > 0 && (
        <Section title="This week's standouts">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tr.map((x) => (
              <Card key={x.title} className="p-4">
                <div className="text-[13px] text-muted-foreground">{x.title}</div>
                <div className="mt-3 flex items-center gap-2"><Avatar id={x.id} size={28} /><span className="truncate text-[15px] font-medium"><Name id={x.id} /></span></div>
                <div className="mt-1 text-[13px] tabular-nums text-muted-foreground">{x.fmt(x.v)}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Card>
        <CardHeader><div><CardTitle>Week by week</CardTitle><CardDescription>XP over the last four weeks.</CardDescription></div></CardHeader>
        <div className="h-64 px-2 pb-4 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ left: -18, right: 8, top: 4 }} barGap={3}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="w" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} formatter={(v: number, id: string) => [`${v} XP`, s.members.find((m) => m.id === id)?.name ?? id]} />
              {s.members.map((m) => <Bar isAnimationActive={anim} key={m.id} dataKey={m.id} name={m.name} fill={m.color} radius={[5, 5, 0, 0]} maxBarSize={22} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-5 text-[12px] text-muted-foreground">
          {s.members.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} />{m.name}</span>)}
        </div>
      </Card>

      <DuelSheet open={duelOpen} onOpenChange={setDuelOpen} />
    </div>
  );
}

function Name({ id }: { id: string }) {
  return <>{useMember(id).name}</>;
}

function StandingRow({ id, rank, value, unit, me }: { id: string; rank: number; value: number; unit: string; me: string }) {
  const m = useMember(id);
  const L = useLevel(id);
  return (
    <div className={cn("flex min-h-[64px] items-center gap-3 px-4 py-3", id === me && "bg-primary/[.05]")}>
      <span className={cn("w-6 text-center text-[17px] font-semibold tabular-nums", rank === 1 ? "text-accent" : "text-muted-foreground")}>{rank}</span>
      <AvatarView member={m} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium">{m.name}{id === me && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
        <div className="truncate text-[12px] text-muted-foreground">Level {L.level} · {L.title}</div>
      </div>
      <div className="text-right">
        <span className="text-[20px] font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="ml-1 text-[12px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function DuelCard({ d }: { d: Duel }) {
  const { s } = useGame();
  const A = useMember(d.a);
  const B = useMember(d.b);
  const a = duelScore(s, d, d.a);
  const b = duelScore(s, d, d.b);
  const pct = a + b === 0 ? 50 : (a / (a + b)) * 100;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><AvatarView member={A} size={32} /><div><div className="text-[14px] font-medium">{A.name}</div><div className="text-[13px] tabular-nums text-muted-foreground">{a}</div></div></div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{d.metric === "xp" ? "XP" : "Active days"} · {d.period === "week" ? "this week" : "this month"}</span>
        <div className="flex items-center gap-2 text-right"><div><div className="text-[14px] font-medium">{B.name}</div><div className="text-[13px] tabular-nums text-muted-foreground">{b}</div></div><AvatarView member={B} size={32} /></div>
      </div>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-secondary">
        <div style={{ width: `${pct}%`, background: A.color }} className="transition-all duration-700" />
        <div className="flex-1" style={{ background: B.color }} />
      </div>
      {d.stake && <p className="mt-3 text-[13px] text-muted-foreground">Stakes: {d.stake}</p>}
    </Card>
  );
}

function DuelSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { s, me, act } = useGame();
  const others = s.members.filter((m) => m.id !== me);
  const [dd, setDd] = useState<{ b: string; metric: Duel["metric"]; period: Duel["period"]; stake: string }>({ b: others[0]?.id ?? "", metric: "xp", period: "week", stake: "" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a duel</DialogTitle><DialogDescription>Head to head, low stakes, high banter.</DialogDescription></DialogHeader>
        <div className="space-y-5">
          <div>
            <span className="label">Opponent</span>
            <div className="flex flex-wrap gap-2">
              {others.map((m) => (
                <button key={m.id} type="button" onClick={() => setDd({ ...dd, b: m.id })}
                  className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[14px] transition", dd.b === m.id ? "border-primary bg-primary/10" : "border-border bg-card")}>
                  <AvatarView member={m} size={26} />{m.name}
                </button>
              ))}
            </div>
          </div>
          <Tabs value={dd.metric} onValueChange={(v) => setDd({ ...dd, metric: v as Duel["metric"] })}><TabsList className="flex w-full"><TabsTrigger value="xp">Most XP</TabsTrigger><TabsTrigger value="days">Most active days</TabsTrigger></TabsList></Tabs>
          <Tabs value={dd.period} onValueChange={(v) => setDd({ ...dd, period: v as Duel["period"] })}><TabsList className="flex w-full"><TabsTrigger value="week">This week</TabsTrigger><TabsTrigger value="month">This month</TabsTrigger></TabsList></Tabs>
          <input className="field" value={dd.stake} onChange={(e) => setDd({ ...dd, stake: e.target.value })} maxLength={100} placeholder="Stakes, e.g. loser buys the filter coffee" />
          <Button size="lg" className="w-full" disabled={!dd.b} onClick={() => { if (act({ t: "duel", d: dd })) onOpenChange(false); }}>Start duel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
