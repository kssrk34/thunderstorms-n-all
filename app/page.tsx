"use client";

import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Check, Gift, Plus, Trash2 } from "lucide-react";
import { Avatar, DimChip, LevelPill, Ring, Stat, tooltipStyle, useLevel } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BADGES, SQUAD_WEEKLY_GOAL, habitDone, leaderboard, netXp, squadWeekXp, streakOf, underdogMultiplier, userLogs, xpBetween } from "@/lib/engine";
import { COUSIN, DIMS } from "@/lib/catalog";
import { habitsFor, useGame } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { addDays, cn, daysBetween, fmtDay, fmtShort, timeAgo, today } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { s, me, act } = useGame();
  const t = today();
  const L = useLevel(me);
  const streak = streakOf(s, me);
  const habits = habitsFor(s, me);
  const todos = s.todos.filter((x) => x.userId === me && (!x.done || s.logs.some((l) => l.ref === `todo:${x.id}` && l.date === t)));
  const doneCount = habits.filter((h) => habitDone(s, me, h.id)).length + todos.filter((x) => x.done).length;
  const totalCount = habits.length + todos.length;
  const todayXp = netXp(s, me, "daily");
  const weekly = leaderboard(s, "weekly", "xp");
  const rank = weekly.findIndex((r) => r.id === me) + 1;
  const squad = squadWeekXp(s);
  const boost = underdogMultiplier(s, me);
  const logs = userLogs(s, me);
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(t, i - 13);
    return { d: fmtShort(d), xp: xpBetween(logs, d, d) };
  });
  const badgeIds = Object.entries(s.badges[me] ?? {}).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const feed = s.logs.filter((l) => l.userId !== me && l.xp > 0).slice(-8).reverse();
  const goals = s.goals.filter((g) => g.userId === me && !g.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  const myChallenges = s.challenges.filter((c) => c.participants.includes(me) && c.endsOn >= t).slice(0, 3);

  const [todo, setTodo] = useState("");
  const [todoDim, setTodoDim] = useState<DimId>("career");

  return (
    <div className="space-y-6">
      {/* hero */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_90%_0%,rgba(250,204,21,.18),transparent),radial-gradient(400px_220px_at_0%_100%,rgba(56,189,248,.18),transparent)]" />
        <svg className="pointer-events-none absolute -right-4 -top-2 h-48 w-24 opacity-20 sm:right-16" viewBox="0 0 40 200" fill="none">
          <path d="M24 0 L10 80 L22 82 L6 200 L34 70 L20 68 L32 0Z" fill="#fde047" />
        </svg>
        <div className="relative flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar id={me} size={84} className="animate-float" />
            <div>
              <div className="text-sm text-muted-foreground">{greeting()},</div>
              <h1 className="font-display text-3xl font-bold">{COUSIN[me].name} <span className="align-middle text-2xl">⚡</span></h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <LevelPill id={me} />
                <span className="chip text-volt">{L.title}</span>
                <span className="chip text-muted-foreground">{COUSIN[me].role} · {COUSIN[me].area}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 md:pl-6">
            <div className="mb-1.5 flex items-end justify-between text-sm">
              <span className="font-semibold">Level {L.level} → {L.level + 1}</span>
              <span className="text-muted-foreground"><b className="text-foreground">{L.into}</b> / {L.span} XP</span>
            </div>
            <Progress value={L.pct * 100} className="h-4" />
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{L.span - L.into} XP to the next level</span>
              {boost > 1 && <span className="chip border-yellow-400/40 bg-yellow-400/10 text-volt">🌪️ Underdog Surge active: 1.25× XP this week</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="⚡" label="Today's XP" value={todayXp} sub={`${doneCount}/${totalCount} quests done`} accent="#facc15" />
        <Stat icon="🏆" label="Weekly rank" value={`#${rank}`} sub={`${weekly.find((r) => r.id === me)?.xp ?? 0} XP this week`} accent="#8b5cf6" />
        <div className="glass relative overflow-hidden rounded-2xl p-4">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-orange-500 opacity-25 blur-2xl" />
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="text-base">🔥</span> Streak</div>
          <div className="mt-1 font-display text-2xl font-bold">{streak.current} days</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Best: {streak.best}</span>
            <button className="text-sky-300 hover:underline" onClick={() => act({ t: "rest" })}>Use rest day</button>
          </div>
        </div>
        <Stat icon="🎖️" label="Badges" value={`${badgeIds.length}/${BADGES.length}`} sub="Achievements unlocked" accent="#38bdf8" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* today's quests */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Today&apos;s quests</CardTitle>
              <CardDescription>Tap to complete. Tap again to undo. Small wins compound.</CardDescription>
            </div>
            <Ring value={totalCount ? doneCount / totalCount : 0} size={58}>
              <span className="text-xs font-bold">{Math.round((doneCount / Math.max(1, totalCount)) * 100)}%</span>
            </Ring>
          </CardHeader>
          <CardContent className="space-y-2">
            {habits.map((h) => {
              const done = habitDone(s, me, h.id);
              return (
                <button key={h.id} onClick={() => act({ t: "habit", habitId: h.id })}
                  className={cn("group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    done ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/[.03] hover:border-sky-400/40 hover:bg-white/[.06]")}>
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition", done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-white/25 group-hover:border-sky-300")}>
                    {done && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="text-lg">{h.emoji}</span>
                  <span className={cn("flex-1 text-sm", done && "text-muted-foreground line-through")}>{h.title}</span>
                  <span className="hidden sm:inline"><DimChip dim={h.dim} /></span>
                  <span className={cn("text-xs font-bold", done ? "text-emerald-300" : "text-volt")}>+{h.xp}</span>
                </button>
              );
            })}
            {todos.map((x) => (
              <div key={x.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", x.done ? "border-emerald-400/30 bg-emerald-400/10" : "border-dashed border-white/15")}>
                <button onClick={() => act({ t: "todo", id: x.id })} className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg border", x.done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-white/25")}>
                  {x.done && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
                <span className="text-lg">📌</span>
                <span className={cn("flex-1 text-sm", x.done && "text-muted-foreground line-through")}>{x.title}</span>
                <span className="text-xs font-bold text-volt">+{x.xp}</span>
                <button onClick={() => act({ t: "todoDel", id: x.id })} className="text-muted-foreground hover:text-destructive" aria-label="Delete task"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (todo.trim()) { act({ t: "todoAdd", title: todo.trim(), dim: todoDim, xp: 15 }); setTodo(""); } }}>
              <input className="input-base" placeholder="Add a one-off task, e.g. Renew passport" value={todo} onChange={(e) => setTodo(e.target.value)} />
              <select className="input-base w-24 shrink-0 sm:w-32" value={todoDim} onChange={(e) => setTodoDim(e.target.value as DimId)}>
                {DIMS.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name.split(" ")[0]}</option>)}
              </select>
              <Button size="icon" className="h-10 w-10 shrink-0" aria-label="Add task"><Plus /></Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* squad meter */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>⛈️ Thunder Meter</CardTitle>
                <CardDescription>Squad XP this week. Fill it together to unlock a Squad Dosa Night 🫓</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end justify-between">
                <span className="font-display text-2xl font-bold">{squad.toLocaleString("en-IN")}</span>
                <span className="text-xs text-muted-foreground">/ {SQUAD_WEEKLY_GOAL.toLocaleString("en-IN")} XP</span>
              </div>
              <Progress value={(squad / SQUAD_WEEKLY_GOAL) * 100} className="h-3" />
              <div className="mt-3 flex -space-x-2">
                {weekly.map((r) => <Avatar key={r.id} id={r.id} size={30} />)}
              </div>
              {squad >= SQUAD_WEEKLY_GOAL && <p className="mt-3 text-sm font-semibold text-volt">🎉 Unlocked! Plan that dosa night this weekend.</p>}
            </CardContent>
          </Card>

          {/* surprise box */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-yellow-400/10" />
            <CardContent className="relative flex items-center gap-4 p-5">
              <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl", s.boxOpened[me] === t ? "bg-white/5 grayscale" : "bg-gradient-to-br from-yellow-300 to-amber-500 animate-float glow-volt")}>🎁</div>
              <div className="flex-1">
                <div className="font-display font-semibold">Surprise Bolt</div>
                <div className="text-xs text-muted-foreground">{s.boxOpened[me] === t ? "Opened today. A new one charges at midnight." : "One mystery reward a day: 10 to 75 XP."}</div>
              </div>
              <Button size="sm" variant="volt" disabled={s.boxOpened[me] === t} onClick={() => act({ t: "box" })}><Gift /> Open</Button>
            </CardContent>
          </Card>

          {/* mini leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>This week&apos;s league</CardTitle>
              <Link href="/league" className="text-xs text-sky-300 hover:underline">Full league</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {weekly.map((r, i) => (
                <div key={r.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5", r.id === me && "bg-sky-500/10 ring-1 ring-sky-400/30")}>
                  <span className="w-5 text-center text-sm font-bold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <Avatar id={r.id} size={30} />
                  <span className="flex-1 text-sm font-medium">{COUSIN[r.id].name}</span>
                  <span className="text-sm font-bold tabular-nums">{r.xp}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <div><CardTitle>XP momentum</CardTitle><CardDescription>Your last 14 days</CardDescription></div>
          </CardHeader>
          <CardContent className="h-56 flex-1 lg:h-auto lg:min-h-[14rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="xpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="xp" stroke="#38bdf8" strokeWidth={2.5} fill="url(#xpg)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cousin feed</CardTitle><span className="flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> live</span></CardHeader>
          <CardContent className="space-y-2.5">
            {feed.map((l) => (
              <div key={l.id} className="flex items-center gap-2.5 text-sm">
                <Avatar id={l.userId} size={26} ring={false} />
                <div className="min-w-0 flex-1">
                  <div className="truncate"><b>{COUSIN[l.userId].name}</b> <span className="text-muted-foreground">{l.label}</span></div>
                  <div className="text-[10px] text-muted-foreground/70">{l.date === t ? timeAgo(l.ts) : fmtDay(l.date)}</div>
                </div>
                <span className="text-xs font-bold text-volt">+{l.xp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>🎯 Upcoming goals</CardTitle><Link href="/habits" className="text-xs text-sky-300 hover:underline">All</Link></CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 && <p className="text-sm text-muted-foreground">No active goals. Set one in Habits & Goals.</p>}
            {goals.map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate font-medium">{g.title}</span><span className="shrink-0 text-xs text-muted-foreground">{daysBetween(t, g.due)}d left</span></div>
                <Progress value={(g.current / g.target) * 100} color={DIMS.find((d) => d.id === g.dim)?.color} />
                <div className="mt-1 text-[11px] text-muted-foreground">{g.unit === "₹" ? `₹${g.current.toLocaleString("en-IN")} / ₹${g.target.toLocaleString("en-IN")}` : `${g.current} / ${g.target} ${g.unit}`}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>⚔️ Your active quests</CardTitle><Link href="/quests" className="text-xs text-sky-300 hover:underline">All</Link></CardHeader>
          <CardContent className="space-y-3">
            {myChallenges.map((c) => {
              const mine = c.scope === "solo" ? c.progress[me] ?? 0 : Object.values(c.progress).reduce((a, b) => a + b, 0);
              return (
                <Link key={c.id} href="/quests" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 transition hover:bg-white/[.06]">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <Progress value={(mine / c.target) * 100} className="mt-1.5 h-1.5" />
                  </div>
                  <span className="text-xs text-muted-foreground">{mine}/{c.target}</span>
                </Link>
              );
            })}
            <Link href="/quests" className="flex items-center justify-center gap-1 text-xs text-sky-300 hover:underline">Find more quests <ArrowRight className="h-3 w-3" /></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🎖️ Recent badges</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {BADGES.map((b) => {
                const has = badgeIds.includes(b.id);
                return (
                  <div key={b.id} title={`${b.name}: ${b.desc}`} className={cn("grid aspect-square place-items-center rounded-xl border text-2xl transition", has ? "border-yellow-300/30 bg-yellow-300/10 hover:scale-110" : "border-white/5 bg-white/[.02] opacity-30 grayscale")}>
                    {b.emoji}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
