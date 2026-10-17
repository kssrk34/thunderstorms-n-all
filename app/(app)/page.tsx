"use client";

import Link from "next/link";
import { ChevronRight, Flame, Plus, Sparkles, Wind } from "lucide-react";
import { ClearSkyArt, SquadArt, SummitArt } from "@/components/brand";
import { AreaTag, Avatar, CheckCircle, EmptyState, Rings, Section, Xp, useLevel } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { DIM } from "@/lib/catalog";
import { DAILY_XP_TARGET, habitDone, leaderboard, netXp, streakOf, underdogMultiplier } from "@/lib/engine";
import { habitsFor } from "@/lib/reducer";
import { useGame, useMember } from "@/lib/store";
import { cn, daysBetween, fmtShort, plural, today } from "@/lib/utils";

const BLUE = "hsl(var(--primary))";
const BOLT = "hsl(var(--accent))";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Today() {
  const { s, me, profile, act, openSheet } = useGame();
  const t = today();
  const L = useLevel(me);
  const streak = streakOf(s, me);
  const habits = habitsFor(s, me);
  const todos = s.todos.filter((x) => x.userId === me && (!x.done || x.doneOn === t));
  const done = habits.filter((h) => habitDone(s, me, h.id)).length + todos.filter((x) => x.done).length;
  const total = habits.length + todos.length;
  const xpToday = Math.max(0, netXp(s, me, "daily"));
  const boost = underdogMultiplier(s, me) > 1;
  const goals = s.goals.filter((g) => g.userId === me && !g.done).slice(0, 3);
  const challenges = s.challenges.filter((c) => c.participants.includes(me) && c.endsOn >= t && !c.completedBy.includes(me)).slice(0, 3);
  const weekly = leaderboard(s, "weekly", "xp");
  const sparkOpen = s.boxOpened[me] === t;
  const restUsed = (s.restDays[me] ?? []).includes(t);
  const goalTitle = (id?: string) => s.goals.find((g) => g.id === id)?.title;
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-10">
      <header className="motion-safe:animate-fade-up">
        <div className="eyebrow">{dateLabel}</div>
        <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight sm:text-[36px]">{greeting()}, {profile.name}</h1>
      </header>

      {/* rings */}
      <Card className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:gap-8 sm:p-7 motion-safe:animate-fade-up">
        <Rings size={148} stroke={15} gap={4} rings={[{ value: total ? done / total : 0, color: BLUE }, { value: xpToday / DAILY_XP_TARGET, color: BOLT }]} />
        <div className="w-full flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: BLUE }} />Quests</div>
              <div className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{done}<span className="text-[17px] font-normal text-muted-foreground">/{total}</span></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: BOLT }} />Charge</div>
              <div className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{xpToday}<span className="text-[17px] font-normal text-muted-foreground">/{DAILY_XP_TARGET} XP</span></div>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span className="font-medium">Level {L.level} · {L.title}</span>
              <span className="tabular-nums text-muted-foreground">{L.span - L.into} XP to level {L.level + 1}</span>
            </div>
            <Progress value={L.pct * 100} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-[#E8845C]" />{streak.current}-day streak</span>
            {boost && <span className="inline-flex items-center gap-1"><Wind className="h-4 w-4 text-primary" />Underdog boost: 1.25× XP this week</span>}
            {!restUsed && streak.current > 0 && <button className="text-primary hover:opacity-80" onClick={() => act({ t: "rest" })}>Take a rest day</button>}
            {restUsed && <span>Resting today. Your streak is safe.</span>}
          </div>
        </div>
      </Card>

      {/* today's quests */}
      <Section title="Today" action={total > 0 && <Button variant="link" size="sm" onClick={() => openSheet({ kind: "quest" })}><Plus />New quest</Button>}>
        {total === 0 ? (
          <Card>
            <EmptyState art={<ClearSkyArt />} title="Your sky is clear" body="Add a daily quest: something small you can do today, like a 20-minute walk or ten pages of a book."
              action={<Button onClick={() => openSheet({ kind: "quest" })}><Plus />New quest</Button>} />
          </Card>
        ) : (
          <List>
            {habits.map((h) => {
              const isDone = habitDone(s, me, h.id);
              return (
                <div key={h.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                  <CheckCircle done={isDone} onClick={() => act({ t: "habit", habitId: h.id })} label={`${isDone ? "Undo" : "Complete"} ${h.title}`} color={DIM[h.dim].color} />
                  <span className="text-[20px]" aria-hidden>{h.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-[16px] transition-colors", isDone && "text-muted-foreground line-through decoration-muted-foreground/40")}>{h.title}</div>
                    <div className="flex items-center gap-2"><AreaTag dim={h.dim} />{goalTitle(h.goalId) && <span className="truncate text-[12px] text-muted-foreground">· {goalTitle(h.goalId)}</span>}</div>
                  </div>
                  <Xp value={h.xp} />
                </div>
              );
            })}
            {todos.map((x) => (
              <div key={x.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                <CheckCircle done={x.done} onClick={() => act({ t: "todo", id: x.id })} label={`${x.done ? "Undo" : "Complete"} ${x.title}`} color={DIM[x.dim].color} />
                <span className="text-[20px]" aria-hidden>{x.emoji ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[16px]", x.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>{x.title}</div>
                  <div className="flex items-center gap-2"><AreaTag dim={x.dim} /><span className="text-[12px] text-muted-foreground">· One-time</span></div>
                </div>
                <Xp value={x.xp} />
              </div>
            ))}
          </List>
        )}
        {challenges.length > 0 && (
          <List>
            {challenges.map((c) => {
              const v = c.scope === "solo" ? c.progress[me] ?? 0 : Object.values(c.progress).reduce((a, b) => a + b, 0);
              return (
                <Link key={c.id} href="/quests?tab=challenges" className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition hover:bg-secondary/40">
                  <span className="text-[20px]" aria-hidden>{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px]">{c.title}</span><span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{v.toLocaleString("en-IN")}/{c.target.toLocaleString("en-IN")} {c.unit}</span></div>
                    <Progress value={(v / c.target) * 100} className="mt-1.5" color={DIM[c.dim].color} />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </Link>
              );
            })}
          </List>
        )}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
        {/* goals */}
        <Section title="Goals" action={goals.length > 0 && <Link href="/goals" className="text-[15px] text-primary hover:opacity-80">See all</Link>}>
          <Card className="flex-1 overflow-hidden">
            {goals.length === 0 ? (
              <EmptyState art={<SummitArt />} title="What would you love to achieve?" body="Goals give your quests a direction."
                action={<Button variant="tinted" onClick={() => openSheet({ kind: "goal" })}><Plus />Add a goal</Button>} />
            ) : (
              <div className="divide-y divide-border/70">
                {goals.map((g) => (
                  <Link key={g.id} href="/goals" className="block px-5 py-4 transition hover:bg-secondary/40">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[16px] font-medium">{g.title}</span>
                      {g.due && <span className="shrink-0 text-[12px] text-muted-foreground">{daysBetween(t, g.due) >= 0 ? `${plural(daysBetween(t, g.due), "day")} left` : `Due ${fmtShort(g.due)}`}</span>}
                    </div>
                    {g.target ? (
                      <>
                        <Progress value={(g.current / g.target) * 100} className="mt-2.5" color={DIM[g.dim].color} />
                        <div className="mt-1.5 text-[12px] tabular-nums text-muted-foreground">{g.current.toLocaleString("en-IN")} of {g.target.toLocaleString("en-IN")} {g.unit}</div>
                      </>
                    ) : <div className="mt-1"><AreaTag dim={g.dim} /></div>}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </Section>

        {/* league */}
        <Section title="This week" action={s.members.length > 1 && <Link href="/league" className="text-[15px] text-primary hover:opacity-80">League</Link>}>
          <Card className="flex-1 overflow-hidden">
            {s.members.length < 2 ? (
              <EmptyState art={<SquadArt />} title="It's quiet up here" body="Invite your cousins and the league comes alive."
                action={<Button asChild variant="tinted"><Link href="/settings#cousins">Invite cousins</Link></Button>} />
            ) : (
              <div className="divide-y divide-border/70">
                {weekly.map((r, i) => <LeagueRow key={r.id} id={r.id} rank={i + 1} xp={r.xp} me={me} />)}
              </div>
            )}
          </Card>
        </Section>
      </div>

      {/* daily spark: one gentle surprise, out of the way */}
      <Card className="flex items-center gap-4 p-4">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", sparkOpen ? "bg-secondary text-muted-foreground" : "bg-accent/15 text-accent")}><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">Daily spark</div>
          <div className="text-[13px] text-muted-foreground">{sparkOpen ? "Opened. A new one arrives at midnight." : "One small surprise a day, between 10 and 75 XP."}</div>
        </div>
        <Button size="sm" variant={sparkOpen ? "secondary" : "default"} disabled={sparkOpen} onClick={() => act({ t: "box" })}>{sparkOpen ? "Opened" : "Open"}</Button>
      </Card>
    </div>
  );
}

function LeagueRow({ id, rank, xp, me }: { id: string; rank: number; xp: number; me: string }) {
  const m = useMember(id);
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3", id === me && "bg-primary/[.05]")}>
      <span className="w-5 text-center text-[15px] font-semibold tabular-nums text-muted-foreground">{rank}</span>
      <Avatar id={id} size={34} />
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{m.name}{id === me && <span className="font-normal text-muted-foreground"> (you)</span>}</span>
      <span className="text-[15px] font-semibold tabular-nums">{xp}<span className="ml-1 text-[12px] font-normal text-muted-foreground">XP</span></span>
    </div>
  );
}
