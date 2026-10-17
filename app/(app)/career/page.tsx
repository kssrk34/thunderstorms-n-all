"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";
import { AvatarView, PageHeader, Section, Xp, axisProps, tooltipStyle, useAnimate } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { CAREER_QUICK, DIM } from "@/lib/catalog";
import { userLogs, xpBetween } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { addDays, fmtShort, today, weekStart } from "@/lib/utils";

const SKILLS = [
  { tag: "code", name: "Building and shipping", color: "#4C7DFF" },
  { tag: "study", name: "Deep study", color: "#6D6AE8" },
  { tag: "network", name: "Relationships", color: "#E06C7A" },
  { tag: "read", name: "Reading", color: "#E09B3D" },
];

export default function Career() {
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const logs = userLogs(s, me);
  const anim = useAnimate();
  const goals = s.goals.filter((g) => g.userId === me && !g.done && (g.dim === "career" || g.dim === "mind"));
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const ws = addDays(weekStart(t), -7 * (5 - i));
    return { w: fmtShort(ws), career: Math.max(0, xpBetween(logs, ws, addDays(ws, 6), "career")), learning: Math.max(0, xpBetween(logs, ws, addDays(ws, 6), "mind")) };
  });
  const board = s.members.filter((m) => m.id !== me).map((m) => ({ m, g: s.goals.find((x) => x.userId === m.id && !x.done && (x.dim === "career" || x.dim === "mind")) }));

  return (
    <div className="space-y-10">
      <PageHeader title="Career" subtitle="The quiet reps that move your work and learning forward." />

      <Section title="Quick log">
        <List>
          {CAREER_QUICK.map((q) => (
            <div key={q.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-[15px]">{q.label}</span>
              <Xp value={q.xp} />
              <Button size="icon-sm" variant="tinted" aria-label={`Log: ${q.label}`} onClick={() => act({ t: "quick", id: q.id })}><Plus /></Button>
            </div>
          ))}
        </List>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Skills</CardTitle><CardDescription>Every rep levels a skill. Five reps per level.</CardDescription></div></CardHeader>
          <div className="space-y-5 px-5 pb-5">
            {SKILLS.map((sk) => {
              const reps = logs.filter((l) => l.tag === sk.tag && l.xp > 0).length;
              return (
                <div key={sk.tag}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[14px]"><span>{sk.name}</span><span className="text-[12px] tabular-nums text-muted-foreground">Level {Math.floor(reps / 5) + 1} · {reps} reps</span></div>
                  <Progress value={((reps % 5) / 5) * 100} color={sk.color} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Momentum</CardTitle><CardDescription>Career and learning XP per week.</CardDescription></div></CardHeader>
          <div className="h-56 px-2 pb-4 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="w" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Bar isAnimationActive={anim} dataKey="career" name="Career" stackId="a" fill={DIM.career.color} maxBarSize={28} />
                <Bar isAnimationActive={anim} dataKey="learning" name="Learning" stackId="a" fill={DIM.mind.color} radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Section title="Career and learning goals" action={<Button variant="link" size="sm" onClick={() => openSheet({ kind: "goal", preset: { dim: "career" } })}><Plus />Add</Button>}>
        {goals.length === 0 ? (
          <Card className="p-5 text-[15px] text-muted-foreground">No career or learning goals yet. A certification, a skill, a role you&apos;re aiming for?</Card>
        ) : (
          <List>
            {goals.map((g) => (
              <Link key={g.id} href="/goals" className="block px-4 py-3.5 transition hover:bg-secondary/40">
                <div className="text-[15px]">{g.title}</div>
                {g.target ? <Progress value={(g.current / g.target) * 100} className="mt-2" color={DIM[g.dim].color} /> : <div className="text-[12px] text-muted-foreground">{DIM[g.dim].short}</div>}
              </Link>
            ))}
          </List>
        )}
      </Section>

      {board.length > 0 && (
        <Section title="Accountability">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {board.map(({ m, g }) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-2"><AvatarView member={m} size={30} /><span className="truncate text-[15px] font-medium">{m.name}</span></div>
                {g ? (
                  <>
                    <div className="mt-3 line-clamp-2 text-[14px]">{g.title}</div>
                    {g.target && <Progress value={(g.current / g.target) * 100} className="mt-2" color={m.color} />}
                  </>
                ) : <div className="mt-3 text-[13px] text-muted-foreground">No career goal yet</div>}
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
