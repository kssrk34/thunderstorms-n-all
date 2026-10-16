"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";
import { Avatar, PageHeader, tooltipStyle } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CAREER_QUICK, COUSIN, COUSINS } from "@/lib/catalog";
import { userLogs, xpBetween } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { addDays, daysBetween, fmtShort, today, weekStart } from "@/lib/utils";

const SKILLS = [
  { tag: "code", name: "Building & Coding", emoji: "⌨️", color: "#38bdf8" },
  { tag: "study", name: "Deep Study", emoji: "🎓", color: "#a78bfa" },
  { tag: "network", name: "Networking", emoji: "🔗", color: "#f472b6" },
  { tag: "read", name: "Reading", emoji: "📖", color: "#facc15" },
];

export default function Career() {
  const { s, me, act } = useGame();
  const t = today();
  const logs = userLogs(s, me);
  const quick = CAREER_QUICK[me] ?? [];
  const goals = s.goals.filter((g) => g.userId === me && (g.cat === "career" || g.cat === "learning"));
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const ws = addDays(weekStart(t), -7 * (5 - i));
    return { w: fmtShort(ws), career: Math.max(0, xpBetween(logs, ws, addDays(ws, 6), "career")), learning: Math.max(0, xpBetween(logs, ws, addDays(ws, 6), "mind")) };
  });

  return (
    <div className="space-y-6">
      <PageHeader emoji="🚀" title="Career & Skills" subtitle={`${COUSIN[me].role} · Focus: ${COUSIN[me].focus}`} />

      <Card>
        <CardHeader><div><CardTitle>⚡ Quick log</CardTitle><CardDescription>One tap for the reps that move your career forward</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {quick.map((q) => (
            <button key={q.id} onClick={() => act({ t: "quick", label: q.label, xp: q.xp, dim: q.dim, tag: q.tag, kind: "career" })}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.06] to-transparent p-4 text-left transition hover:-translate-y-0.5 hover:border-yellow-300/40 active:scale-[.98]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-2xl transition group-hover:scale-110">{q.emoji}</span>
              <span className="flex-1 text-sm font-medium">{q.label}</span>
              <span className="font-display font-bold text-volt">+{q.xp}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Skill tree</CardTitle><CardDescription>Every rep levels a skill. 5 reps per skill level.</CardDescription></div></CardHeader>
          <CardContent className="space-y-4">
            {SKILLS.map((sk) => {
              const reps = logs.filter((l) => l.tag === sk.tag && l.xp > 0).length;
              const lvl = Math.floor(reps / 5) + 1;
              return (
                <div key={sk.tag}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{sk.emoji} {sk.name}</span>
                    <span className="text-xs text-muted-foreground">Lv {lvl} · {reps} reps</span>
                  </div>
                  <Progress value={((reps % 5) / 5) * 100} color={sk.color} className="h-3" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Growth momentum</CardTitle><CardDescription>Career + learning XP per week</CardDescription></div></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ left: -20, right: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="career" name="Career" stackId="a" fill="#facc15" />
                <Bar dataKey="learning" name="Learning" stackId="a" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>🎯 Career & certification goals</CardTitle><CardDescription>Add more in Habits & Goals</CardDescription></div></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {goals.length === 0 && <p className="text-sm text-muted-foreground">No career goals yet.</p>}
          {goals.map((g) => (
            <div key={g.id} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{g.done && "🏆 "}{g.title}</div>
                <span className="shrink-0 text-xs text-muted-foreground">{g.done ? "Done!" : `${daysBetween(t, g.due)}d left`}</span>
              </div>
              <Progress value={(g.current / g.target) * 100} className="mt-3" />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{g.current} / {g.target} {g.unit}</span>
                {!g.done && <Button size="sm" variant="secondary" onClick={() => act({ t: "goalStep", id: g.id, amount: 1 })}><Plus /> 1 {g.unit.replace(/s$/, "")} · +{g.xpPerStep}</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>🤝 Accountability board</CardTitle><CardDescription>What everyone&apos;s working toward. Cheer, nudge, help.</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COUSINS.map((c) => {
            const g = s.goals.filter((x) => x.userId === c.id && x.cat === "career" && !x.done)[0];
            return (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <div className="flex items-center gap-2"><Avatar id={c.id} size={30} /><div><div className="text-sm font-semibold">{c.name}</div><div className="text-[10px] text-muted-foreground">{c.role}</div></div></div>
                {g ? (
                  <>
                    <div className="mt-2 line-clamp-2 text-xs">{g.title}</div>
                    <Progress value={(g.current / g.target) * 100} className="mt-2 h-1.5" color={c.color} />
                  </>
                ) : <div className="mt-2 text-xs text-muted-foreground">No active career goal</div>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
