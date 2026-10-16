"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Avatar, PageHeader, tooltipStyle } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUSIN, DIM, DIMS } from "@/lib/catalog";
import { streakOf, userLogs, xpBetween } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { GameState } from "@/lib/types";
import { addDays, cn, fmtShort, parseD, today, weekStart } from "@/lib/utils";

const MOODS = ["😫", "😕", "😐", "🙂", "🤩"];
const ENERGY = ["🪫", "🔋", "⚡", "⚡⚡", "🌩️"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function insights(s: GameState, me: string) {
  const t = today();
  const logs = userLogs(s, me);
  const out: { icon: string; title: string; body: string }[] = [];

  // best day of week
  const byDow = Array(7).fill(0), cnt = Array(7).fill(0);
  for (let i = 0; i < 35; i++) { const d = addDays(t, -i); const k = parseD(d).getDay(); byDow[k] += xpBetween(logs, d, d); cnt[k]++; }
  const avg = byDow.map((v, i) => v / Math.max(1, cnt[i]));
  const best = avg.indexOf(Math.max(...avg)), worst = avg.indexOf(Math.min(...avg));
  if (avg[best] > 0) out.push({ icon: "📅", title: `${DOW[best]}s are your power days`, body: `You average ${Math.round(avg[best])} XP on ${DOW[best]}s vs ${Math.round(avg[worst])} on ${DOW[worst]}s. Schedule something small and easy for ${DOW[worst]}s.` });

  // week over week
  const ws = weekStart(t);
  const thisW = xpBetween(logs, ws), lastW = xpBetween(logs, addDays(ws, -7), addDays(ws, -1));
  const dayIdx = (parseD(t).getDay() + 6) % 7 + 1;
  const pace = Math.round((thisW / dayIdx) * 7);
  out.push({ icon: pace >= lastW ? "📈" : "🧭", title: pace >= lastW ? "You're on pace to beat last week" : "A little behind last week's pace", body: `Projected ${pace} XP vs ${lastW} last week. ${pace >= lastW ? "Keep the momentum, but protect your rest." : "One family call and one workout would close the gap."}` });

  // sleep vs mood
  const pairs = Object.entries(s.mood[me] ?? {}).map(([d, m]) => ({ m: m.mood, sl: s.health[me]?.[d]?.sleep ?? 0 })).filter((p) => p.sl > 0);
  const good = pairs.filter((p) => p.sl >= 7), bad = pairs.filter((p) => p.sl < 7);
  if (good.length && bad.length) {
    const g = good.reduce((a, p) => a + p.m, 0) / good.length, b = bad.reduce((a, p) => a + p.m, 0) / bad.length;
    out.push({ icon: "🌙", title: g >= b ? "Sleep lifts your mood" : "Mood isn't tracking sleep (yet)", body: `Average mood ${g.toFixed(1)}/5 after 7h+ sleep vs ${b.toFixed(1)}/5 after shorter nights.` });
  }

  // neglected dimensions
  const from = addDays(t, -13);
  const touched = new Set(logs.filter((l) => l.date >= from && l.xp > 0).map((l) => l.dim));
  const missing = DIMS.filter((d) => !touched.has(d.id));
  if (missing.length) out.push({ icon: "🌱", title: `${missing.length} life area${missing.length > 1 ? "s" : ""} untouched in 2 weeks`, body: `${missing.slice(0, 3).map((d) => d.emoji + " " + d.name).join(", ")}. Pick one tiny action this week.` });

  const st = streakOf(s, me);
  out.push({ icon: "🔥", title: st.current >= st.best && st.current > 2 ? "You're on your best streak ever!" : `Streak: ${st.current} days (best ${st.best})`, body: "Remember the rule: never miss twice. A rest day protects your streak once a week." });
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

  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(t, i - 13);
    const m = s.mood[me]?.[d];
    return { d: fmtShort(d), mood: m?.mood ?? null, energy: m?.energy ?? null };
  });
  const wall = s.gratitude.slice(0, 10);
  const weekXp = DIMS.map((d) => ({ ...d, xp: xpBetween(userLogs(s, me), weekStart(t), "9999", d.id) })).filter((d) => d.xp > 0).sort((a, b) => b.xp - a.xp);

  return (
    <div className="space-y-6">
      <PageHeader emoji="🪞" title="Reflect & Insights" subtitle="Look back to leap forward. Two minutes a day, ten minutes a week." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>How are you, really?</CardTitle><CardDescription>Daily check-in · +5 XP</CardDescription></div>{todayMood && <span className="chip text-emerald-300">✓ checked in</span>}</CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Mood</div>
              <div className="flex justify-between gap-2">
                {MOODS.map((e, i) => <button key={i} onClick={() => setMood(i + 1)} className={cn("grid h-14 flex-1 place-items-center rounded-2xl text-3xl transition", mood === i + 1 ? "scale-105 bg-yellow-400/15 ring-2 ring-volt" : "bg-white/5 opacity-60 hover:opacity-100")}>{e}</button>)}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Energy</div>
              <div className="flex justify-between gap-2">
                {ENERGY.map((e, i) => <button key={i} onClick={() => setEnergy(i + 1)} className={cn("grid h-11 flex-1 place-items-center rounded-xl text-lg transition", energy === i + 1 ? "bg-sky-400/15 ring-2 ring-sky-400" : "bg-white/5 opacity-60 hover:opacity-100")}>{e}</button>)}
              </div>
            </div>
            <input className="input-base" placeholder="One word for today? (optional)" value={mnote} onChange={(e) => setMnote(e.target.value)} />
            <Button className="w-full" onClick={() => act({ t: "mood", entry: { mood, energy, note: mnote } })}>{todayMood ? "Update check-in" : "Check in"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Mood & energy</CardTitle><CardDescription>Last 14 days</CardDescription></div></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ left: -25, right: 8, top: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="mood" name="Mood" stroke="#facc15" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="energy" name="Energy" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">🔮 Personal insights</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights(s, me).map((i) => (
            <Card key={i.title} className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">{i.icon}</span>
                <div><div className="text-sm font-semibold">{i.title}</div><p className="mt-1 text-xs text-muted-foreground">{i.body}</p></div>
              </div>
            </Card>
          ))}
          <Card className="p-4">
            <div className="text-sm font-semibold">🧩 This week&apos;s XP mix</div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
              {weekXp.map((d) => <div key={d.id} title={`${d.name}: ${d.xp}`} style={{ flex: d.xp, background: d.color }} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {weekXp.slice(0, 5).map((d) => <span key={d.id}>{d.emoji} {d.xp}</span>)}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>🙏 Gratitude wall</CardTitle><CardDescription>Shared with cousins · +10 XP (up to 3 a day)</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (grat.trim()) { act({ t: "gratitude", text: grat.trim() }); setGrat(""); } }}>
              <input className="input-base" placeholder="Today I'm grateful for…" value={grat} onChange={(e) => setGrat(e.target.value)} />
              <Button type="submit">Add</Button>
            </form>
            {wall.map((g) => (
              <div key={g.id} className="flex gap-3 rounded-xl bg-white/[.03] p-3">
                <Avatar id={g.userId} size={28} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{g.text}</p>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{COUSIN[g.userId].name} · {fmtShort(g.date)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>📝 Weekly review</CardTitle><CardDescription>Sunday ritual · +40 XP</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            {reviewed ? (
              <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm">
                <div className="font-semibold text-emerald-300">✓ Review done for this week</div>
                <p><b>Wins:</b> {reviewed.wins}</p>
                <p><b>Struggles:</b> {reviewed.struggles}</p>
                <p><b>Next week:</b> {reviewed.intention}</p>
                <p><b>Rating:</b> {"⭐".repeat(reviewed.rating)}</p>
              </div>
            ) : (
              <>
                <textarea className="input-base min-h-[64px]" placeholder="🏆 3 wins this week (big or tiny)" value={rv.wins} onChange={(e) => setRv({ ...rv, wins: e.target.value })} />
                <textarea className="input-base min-h-[64px]" placeholder="🌧️ What was hard? What did it teach you?" value={rv.struggles} onChange={(e) => setRv({ ...rv, struggles: e.target.value })} />
                <input className="input-base" placeholder="🎯 One intention for next week" value={rv.intention} onChange={(e) => setRv({ ...rv, intention: e.target.value })} />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">Rate the week</span>
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRv({ ...rv, rating: n })} className={cn("text-xl transition", n <= rv.rating ? "" : "opacity-25 grayscale")}>⭐</button>)}
                </div>
                <Button className="w-full" disabled={!rv.wins.trim() || !rv.intention.trim()} onClick={() => act({ t: "review", r: rv })}>Complete weekly review</Button>
              </>
            )}
            <div className="pt-2 text-xs text-muted-foreground">
              Top areas this week: {weekXp.slice(0, 3).map((d) => `${DIM[d.id].emoji} ${DIM[d.id].name}`).join(" · ") || "-"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
