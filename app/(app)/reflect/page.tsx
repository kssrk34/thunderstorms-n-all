"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Star } from "lucide-react";
import { MoonArt } from "@/components/brand";
import { AvatarView, EmptyState, PageHeader, Section, axisProps, tooltipStyle, useAnimate } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIMS } from "@/lib/catalog";
import { streakOf, userLogs, xpBetween } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { GameState } from "@/lib/types";
import { addDays, cn, fmtShort, parseD, today, weekStart } from "@/lib/utils";

const MOODS = ["Rough", "Low", "Okay", "Good", "Great"];
const ENERGY = ["Drained", "Low", "Steady", "Charged", "Electric"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function insights(s: GameState, me: string) {
  const t = today();
  const logs = userLogs(s, me);
  const out: { title: string; body: string }[] = [];
  if (!logs.some((l) => l.xp > 0)) return out;

  const byDow = Array(7).fill(0), cnt = Array(7).fill(0);
  for (let i = 0; i < 35; i++) { const d = addDays(t, -i); const k = parseD(d).getDay(); byDow[k] += xpBetween(logs, d, d); cnt[k]++; }
  const avg = byDow.map((v, i) => v / Math.max(1, cnt[i]));
  const best = avg.indexOf(Math.max(...avg)), worst = avg.indexOf(Math.min(...avg));
  if (avg[best] > 0 && best !== worst) out.push({ title: `${DOW[best]}s are your strongest days`, body: `You average ${Math.round(avg[best])} XP on ${DOW[best]}s and ${Math.round(avg[worst])} on ${DOW[worst]}s. Plan something small and easy for ${DOW[worst]}s.` });

  const ws = weekStart(t);
  const thisW = xpBetween(logs, ws), lastW = xpBetween(logs, addDays(ws, -7), addDays(ws, -1));
  const dayIdx = ((parseD(t).getDay() + 6) % 7) + 1;
  const pace = Math.round((thisW / dayIdx) * 7);
  if (lastW > 0) out.push({ title: pace >= lastW ? "On pace to beat last week" : "A little behind last week", body: `Projected ${pace} XP against ${lastW} last week. ${pace >= lastW ? "Keep it up, and protect your rest." : "One small quest a day closes the gap."}` });

  const pairs = Object.entries(s.mood[me] ?? {}).map(([d, m]) => ({ m: m.mood, sl: s.health[me]?.[d]?.sleep ?? 0 })).filter((p) => p.sl > 0);
  const good = pairs.filter((p) => p.sl >= 7), bad = pairs.filter((p) => p.sl < 7);
  if (good.length && bad.length) {
    const g = good.reduce((a, p) => a + p.m, 0) / good.length, b = bad.reduce((a, p) => a + p.m, 0) / bad.length;
    out.push({ title: g >= b ? "Sleep lifts your mood" : "Mood isn't following sleep, yet", body: `Average mood ${g.toFixed(1)} of 5 after 7+ hours, ${b.toFixed(1)} after shorter nights.` });
  }

  const touched = new Set(logs.filter((l) => l.date >= addDays(t, -13) && l.xp > 0).map((l) => l.dim));
  const missing = DIMS.filter((d) => !touched.has(d.id));
  if (missing.length && missing.length < 12) out.push({ title: `${missing.length} life ${missing.length === 1 ? "area" : "areas"} untouched for two weeks`, body: `${missing.slice(0, 3).map((d) => d.name).join(", ")}. Pick one tiny action this week.` });

  const st = streakOf(s, me);
  if (st.current > 2) out.push({ title: st.current >= st.best ? "Your best streak yet" : `${st.current}-day streak`, body: "Never miss twice. A weekly rest day keeps your streak safe." });
  return out;
}

export default function Reflect() {
  const { s, me, act } = useGame();
  const t = today();
  const todayMood = s.mood[me]?.[t];
  const [mood, setMood] = useState(todayMood?.mood ?? 4);
  const [energy, setEnergy] = useState(todayMood?.energy ?? 3);
  const [mnote, setMnote] = useState(todayMood?.note ?? "");
  const [grat, setGrat] = useState("");
  const [rv, setRv] = useState({ wins: "", struggles: "", intention: "", rating: 4 });
  const reviewed = s.reviews.find((r) => r.userId === me && r.weekOf === weekStart(t));
  const logs = userLogs(s, me);
  const anim = useAnimate();

  const moodChart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(t, i - 13);
    const m = s.mood[me]?.[d];
    return { d: fmtShort(d), mood: m?.mood ?? null, energy: m?.energy ?? null };
  });
  const xpChart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(t, i - 13);
    return { d: fmtShort(d), xp: Math.max(0, xpBetween(logs, d, d)) };
  });
  const hasMood = moodChart.some((x) => x.mood !== null);
  const ins = insights(s, me);
  const wall = s.gratitude.slice(0, 12);

  return (
    <div className="space-y-10">
      <PageHeader title="Reflect" subtitle="Look back to leap forward. Two minutes a day, ten minutes a week." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div><div className="text-[17px] font-semibold tracking-tight">How are you, really?</div><div className="text-[13px] text-muted-foreground">Daily check-in · 5 XP</div></div>
            {todayMood && <span className="inline-flex items-center gap-1 text-[13px] text-success"><Check className="h-4 w-4" />Checked in</span>}
          </div>
          <div className="mt-5 space-y-4">
            <Scale label="Mood" value={mood} onChange={setMood} words={MOODS} color="hsl(var(--primary))" />
            <Scale label="Energy" value={energy} onChange={setEnergy} words={ENERGY} color="hsl(var(--accent))" />
            <input className="field" placeholder="One word for today (optional)" value={mnote} onChange={(e) => setMnote(e.target.value)} maxLength={60} />
            <Button className="w-full" onClick={() => act({ t: "mood", entry: { mood, energy, note: mnote } })}>{todayMood ? "Update check-in" : "Check in"}</Button>
          </div>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Mood and energy</CardTitle><CardDescription>The last two weeks.</CardDescription></div></CardHeader>
          {hasMood ? (
            <div className="h-60 px-2 pb-4 text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodChart} margin={{ left: -26, right: 8, top: 6 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="d" {...axisProps} interval="preserveStartEnd" />
                  <YAxis domain={[1, 5]} ticks={[1, 3, 5]} {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Line isAnimationActive={anim} type="monotone" dataKey="mood" name="Mood" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }} connectNulls />
                  <Line isAnimationActive={anim} type="monotone" dataKey="energy" name="Energy" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState art={<MoonArt />} title="No check-ins yet" body="Check in for a few days and your patterns will show up here." />}
        </Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Momentum</CardTitle><CardDescription>XP you earned each day, the last two weeks.</CardDescription></div></CardHeader>
        <div className="h-48 px-2 pb-4 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={xpChart} margin={{ left: -20, right: 8, top: 6 }}>
              <defs>
                <linearGradient id="xpfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="d" {...axisProps} interval="preserveStartEnd" />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Area isAnimationActive={anim} type="monotone" dataKey="xp" name="XP" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#xpfill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {ins.length > 0 && (
        <Section title="Insights">
          <div className="grid gap-3 md:grid-cols-2">
            {ins.map((i) => <Card key={i.title} className="p-5"><div className="text-[15px] font-semibold">{i.title}</div><p className="mt-1 text-[14px] text-muted-foreground">{i.body}</p></Card>)}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader><div><CardTitle>Gratitude wall</CardTitle><CardDescription>Shared with your cousins · 10 XP, up to three a day.</CardDescription></div></CardHeader>
          <form className="flex gap-2 px-5" onSubmit={(e) => { e.preventDefault(); if (grat.trim() && act({ t: "gratitude", text: grat.trim() })) setGrat(""); }}>
            <input className="field" placeholder="Today I'm grateful for…" value={grat} onChange={(e) => setGrat(e.target.value)} maxLength={280} />
            <Button type="submit" disabled={!grat.trim()}>Add</Button>
          </form>
          <div className="mt-4 flex-1 divide-y divide-border/70 border-t border-border/70">
            {wall.length === 0 && <p className="px-5 py-5 text-[14px] text-muted-foreground">Nothing yet. What&apos;s one good thing about today?</p>}
            {wall.map((g) => <GratitudeRow key={g.id} userId={g.userId} text={g.text} date={g.date} />)}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[17px] font-semibold tracking-tight">Weekly review</div>
          <div className="text-[13px] text-muted-foreground">A Sunday ritual · 40 XP · only you can see it</div>
          {reviewed ? (
            <div className="mt-5 space-y-3 text-[14px]">
              <div className="inline-flex items-center gap-1 text-[13px] text-success"><Check className="h-4 w-4" />Done for this week</div>
              <div><div className="text-[12px] font-medium text-muted-foreground">Wins</div><p className="whitespace-pre-line">{reviewed.wins}</p></div>
              {reviewed.struggles && <div><div className="text-[12px] font-medium text-muted-foreground">What was hard</div><p className="whitespace-pre-line">{reviewed.struggles}</p></div>}
              <div><div className="text-[12px] font-medium text-muted-foreground">Next week</div><p>{reviewed.intention}</p></div>
              <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn("h-4 w-4", i < reviewed.rating ? "fill-accent text-accent" : "text-muted-foreground/30")} />)}</div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <textarea className="field" placeholder="Three wins this week, big or tiny" value={rv.wins} onChange={(e) => setRv({ ...rv, wins: e.target.value })} maxLength={1000} />
              <textarea className="field" placeholder="What was hard, and what did it teach you?" value={rv.struggles} onChange={(e) => setRv({ ...rv, struggles: e.target.value })} maxLength={1000} />
              <input className="field" placeholder="One intention for next week" value={rv.intention} onChange={(e) => setRv({ ...rv, intention: e.target.value })} maxLength={300} />
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground">Rate the week</span>
                <div className="flex">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRv({ ...rv, rating: n })} aria-label={`${n} stars`} className="p-1">
                    <Star className={cn("h-6 w-6 transition", n <= rv.rating ? "fill-accent text-accent" : "text-muted-foreground/30")} />
                  </button>
                ))}</div>
              </div>
              <Button className="w-full" disabled={!rv.wins.trim() || !rv.intention.trim()} onClick={() => act({ t: "review", r: rv })}>Complete review</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Scale({ label, value, onChange, words, color }: { label: string; value: number; onChange: (v: number) => void; words: string[]; color: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[13px]"><span className="text-muted-foreground">{label}</span><span className="font-medium">{words[value - 1]}</span></div>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {words.map((w, i) => (
          <button key={w} type="button" role="radio" aria-checked={value === i + 1} aria-label={w} onClick={() => onChange(i + 1)}
            className="h-9 rounded-[10px] transition-colors" style={{ background: i < value ? color : "hsl(var(--secondary))", opacity: i < value ? 0.35 + (i + 1) * 0.13 : 1 }} />
        ))}
      </div>
    </div>
  );
}

function GratitudeRow({ userId, text, date }: { userId: string; text: string; date: string }) {
  const { s } = useGame();
  const m = s.members.find((x) => x.id === userId);
  return (
    <div className="flex gap-3 px-5 py-3">
      {m && <AvatarView member={m} size={28} />}
      <div className="min-w-0 flex-1"><p className="text-[14px]">{text}</p><div className="mt-0.5 text-[11px] text-muted-foreground">{m?.name ?? "A cousin"} · {fmtShort(date)}</div></div>
    </div>
  );
}

