"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarCheck, ChevronRight, Flame, Plus, Shield, Sparkles, Star, Swords, UserPlus, X, Zap } from "lucide-react";
import { ClearSkyArt } from "@/components/brand";
import { DimensionComparison, PERIOD_LABEL, scoresFor, type ComparePeriod } from "@/components/compare";
import { Feed } from "@/components/feed";
import {
  AreaTag, AuraChip, AuraCounter, AvatarView, CheckCircle, Delta, EmptyState, QuestGlyph, RankBadge, Ring, Section, axisProps, memberColor, pct, tooltipStyle, useAnimate, useLevel,
} from "@/components/game";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { challengeProgress } from "@/lib/balance";
import { DIM, DIMS, MAX_MEMBERS } from "@/lib/catalog";
import { dailyPlan, periodAura, rivalryStandings, squadWeekAura, squadWeeklyGoal, streakOf, timeLeft, type Priority } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { Member } from "@/lib/types";
import { addDays, cn, fmtShort, today, weekStart, weekday } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { s, profile } = useGame();
  const [period, setPeriod] = useState<ComparePeriod>("week");
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="space-y-10">
      <header className="motion-safe:animate-fade-up">
        <div className="eyebrow">{dateLabel}</div>
        <h1 className="mt-1.5 font-display text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">{greeting()}, {profile.name.split(" ")[0]}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Five cousins. Five unique journeys. One shared universe.</p>
      </header>

      <SquadStrip />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <MissionCenter />
        <div className="space-y-6">
          <RecapBanner />
          <Section title="Cousin activity" eyebrow="Live" action={<Link href="/arena" className="text-[14px] text-primary hover:opacity-80">Arena</Link>}>
            <div className="panel max-h-[560px] overflow-y-auto">
              <Feed events={s.feed.slice(0, 14)} empty={s.members.length < 2 ? "When your cousins join, their wins show up here." : undefined} />
            </div>
          </Section>
        </div>
      </div>

      <Section title="Ten dimensions, side by side" eyebrow="Life Balance"
        action={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as ComparePeriod)}>
            <TabsList>{(Object.keys(PERIOD_LABEL) as ComparePeriod[]).map((p) => <TabsTrigger key={p} value={p}>{PERIOD_LABEL[p]}</TabsTrigger>)}</TabsList>
          </Tabs>
        }>
        <p className="-mt-1 px-1 text-[13px] text-muted-foreground">
          Calculated from completed quests and habits. <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-[2px] bg-foreground/60" /> marks the previous {period === "week" ? "week" : period === "month" ? "30 days" : "period"}</span>.{" "}
          <Link href="/life#how" className="text-primary hover:opacity-80">How it works</Link>
        </p>
        <DimensionComparison period={period} />
      </Section>

      <SquadPulse period={period} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the five cousins                                                    */
/* ------------------------------------------------------------------ */
function SquadStrip() {
  const { s, me } = useGame();
  // Places only go to cousins who have earned Aura this week; ties share a place and nobody is ranked at 0.
  const weekly = s.members.map((m) => periodAura(s, m.id, "weekly"));
  const placeOf = (id: string) => {
    const i = s.members.findIndex((m) => m.id === id);
    return weekly[i] > 0 ? 1 + weekly.filter((a) => a > weekly[i]).length : 0;
  };
  const ordered = [...s.members].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : a.joinedAt - b.joinedAt));
  const open = Math.max(0, MAX_MEMBERS - s.members.length);
  return (
    <section aria-label="The squad">
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {ordered.map((m) => <CousinCard key={m.id} m={m} place={placeOf(m.id)} />)}
        {Array.from({ length: open }, (_, i) => (
          <Link key={i} href="/profile?tab=settings#cousins" className="panel flex w-[220px] shrink-0 snap-start flex-col items-center justify-center gap-3 border-dashed p-5 text-center text-muted-foreground transition hover:border-primary/40 hover:text-foreground lg:w-auto">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-border"><UserPlus className="h-5 w-5" /></span>
            <span className="text-[14px] font-medium">Open spot</span>
            <span className="text-[12px]">Invite the next cousin</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CousinCard({ m, place }: { m: Member; place: number }) {
  const { s, me, stats } = useGame();
  const L = useLevel(m.id);
  const st = stats(m.id);
  const streak = streakOf(s, m.id);
  const todayAura = Math.max(0, periodAura(s, m.id, "daily"));
  const week = Math.max(0, periodAura(s, m.id, "weekly"));
  const vision = st?.b30.vision ?? null;
  const color = memberColor(m);
  const you = m.id === me;
  return (
    <Link href={you ? "/profile" : `/u/${m.username}`}
      className={cn("panel group relative flex w-[220px] shrink-0 snap-start flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-primary/40 lg:w-auto", you && "border-primary/40")}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60" style={{ background: `radial-gradient(80% 100% at 50% 0%, ${color}38, transparent 70%)` }} />
      <div className="relative flex items-start justify-between">
        <AvatarView member={m} size={56} />
        <div className="flex flex-col items-end gap-1">
          {place > 0 && s.members.length > 1 && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", place === 1 ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground")}>#{place} this week</span>}
          {you && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">You</span>}
        </div>
      </div>
      <div className="relative mt-3 min-w-0">
        <div className="truncate font-display text-[17px] font-semibold tracking-tight">{m.name}</div>
        <div className="truncate text-[12px] text-muted-foreground">@{m.username}</div>
      </div>
      <RankBadge id={m.id} size={20} className="relative mt-2" />
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="font-display text-[24px] font-bold leading-none tracking-tight">
            {you ? <AuraCounter value={L.aura} /> : <span className="inline-flex items-center gap-1 tabular-nums"><Zap className="h-[0.8em] w-[0.8em] fill-primary text-primary" />{L.aura.toLocaleString("en-IN")}</span>}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Level {L.level} · {L.title}</div>
        </div>
        <Ring value={(vision ?? 0) / 100} size={48} stroke={5} color={color}>
          <span className="font-display text-[12px] font-semibold tabular-nums">{vision === null ? "—" : vision}</span>
        </Ring>
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-1 border-t border-border/60 pt-3 text-center">
        <div><div className="font-display text-[15px] font-semibold tabular-nums">+{todayAura}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Today</div></div>
        <div><div className="font-display text-[15px] font-semibold tabular-nums">+{week}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Week</div></div>
        <div><div className="inline-flex items-center justify-center gap-0.5 font-display text-[15px] font-semibold tabular-nums"><Flame className={cn("h-3.5 w-3.5", streak.current ? "text-[#FF8A4C]" : "text-muted-foreground")} />{streak.current}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div></div>
      </div>
      <div className="relative mt-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">Balance {pct(vision)}</div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* today                                                               */
/* ------------------------------------------------------------------ */
function MissionCenter() {
  const { s, me, profile, act, openSheet, stats } = useGame();
  const t = today();
  const plan = dailyPlan(s, me, profile.dailyGoal, t);
  const streak = streakOf(s, me);
  const [picking, setPicking] = useState(false);
  const prioIds = new Set(plan.priorities.map((p) => p.id));
  const rest = plan.due.filter((h) => !prioIds.has(h.id));
  const refs = new Set(s.logs.filter((l) => l.userId === me && l.date === t).map((l) => l.ref));
  const shared = [
    ...s.challenges.filter((c) => c.participants.includes(me) && c.endsOn >= t && !c.completedBy.includes(me)).map((c) => ({ kind: "c" as const, id: c.id, title: c.title, end: c.endsOn, value: c.scope === "squad" ? c.participants.reduce((a, p) => a + challengeProgress(s, c.id, p), 0) : challengeProgress(s, c.id, me), target: c.target, unit: c.unit, dim: c.dim })),
    ...s.rivalries.filter((r) => r.participants.includes(me) && r.end >= t).map((r) => ({ kind: "r" as const, id: r.id, title: r.title, end: r.end, place: rivalryStandings(s, r).findIndex((x) => x.id === me) + 1, of: r.participants.length })),
  ].sort((a, b) => a.end.localeCompare(b.end)).slice(0, 3);
  const st = stats(me);
  const nothing = plan.due.length === 0 && plan.todos.length === 0;
  const toggle = (p: Priority) => act(p.type === "habit" ? { t: "habit", habitId: p.id } : { t: "todo", id: p.id });

  return (
    <Section title="Today's mission" eyebrow="Mission center" action={<Button size="sm" variant="tinted" onClick={() => openSheet({ kind: "log" })}><Zap />Log activity</Button>}>
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Ring value={plan.earned / Math.max(1, plan.objective)} size={112} stroke={11} glow={plan.earned >= plan.objective}>
            <div>
              <div className="font-display text-[24px] font-bold leading-none tabular-nums"><AuraCounter value={plan.earned} icon={false} /></div>
              <div className="mt-1 text-[11px] text-muted-foreground">of {plan.objective}</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-[15px] font-semibold">{plan.earned >= plan.objective ? "Daily objective reached. Charged." : plan.rested ? "Rest day. Your streak is safe." : `${plan.objective - plan.earned} Aura Points to your daily objective`}</div>
              <div className="text-[13px] text-muted-foreground">{plan.available > 0 ? `${plan.available} Aura Points still available from today's quests.` : nothing ? "Add a quest to plan your day." : "Everything planned for today is done."}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-[#FF8A4C]" />{streak.current}-day streak</span>
              <span className="inline-flex items-center gap-1" title="Each 7 days in a row earns a shield. A missed day uses one instead of breaking your streak."><Shield className="h-4 w-4 text-ion" />{streak.shields} {streak.shields === 1 ? "shield" : "shields"}</span>
              {st?.weekCompletion !== null && st?.weekCompletion !== undefined && <span className="inline-flex items-center gap-1"><CalendarCheck className="h-4 w-4 text-primary" />{st.weekCompletion}% of this week done</span>}
              {!plan.rested && streak.current > 0 && !(s.restDays[me] ?? []).some((d) => d >= weekStart(t)) && <button className="text-primary hover:opacity-80" onClick={() => act({ t: "rest" })}>Take a rest day</button>}
            </div>
          </div>
        </div>

        {nothing ? (
          <div className="border-t border-border/60">
            <EmptyState art={<ClearSkyArt />} title="A clear sky" body="Pick one small thing you'll do today. Your Life Balance and Aura grow from what you complete."
              action={<Button onClick={() => openSheet({ kind: "quest" })}><Plus />New quest</Button>} />
          </div>
        ) : (
          <>
            <div className="border-t border-border/60 px-5 pb-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Top three</span>
                <button className="text-[13px] text-primary hover:opacity-80" onClick={() => setPicking(true)}>Choose</button>
              </div>
            </div>
            <div className="divide-y divide-border/50 px-2 pb-2">
              {plan.priorities.length === 0 && <p className="px-3 py-3 text-[14px] text-muted-foreground">Nothing left to prioritise today.</p>}
              {plan.priorities.map((p, i) => <PriorityRow key={p.id} p={p} n={i + 1} onToggle={() => toggle(p)} />)}
            </div>
            {rest.length > 0 && (
              <>
                <div className="border-t border-border/60 px-5 pb-1 pt-4"><span className="eyebrow">Also due today</span></div>
                <div className="divide-y divide-border/50 px-2 pb-2">
                  {rest.map((h) => {
                    const done = refs.has(`h:${h.id}:${t}`);
                    return (
                      <div key={h.id} className="flex min-h-[56px] items-center gap-3 px-3 py-2">
                        <CheckCircle done={done} onClick={() => act({ t: "habit", habitId: h.id })} label={`${done ? "Undo" : "Complete"} ${h.title}`} color={DIM[h.dim].color} />
                        <QuestGlyph icon={h.icon} dim={h.dim} size={30} />
                        <span className={cn("min-w-0 flex-1 truncate text-[15px]", done && "text-muted-foreground line-through decoration-muted-foreground/40")}>{h.title}</span>
                        <AuraChip value={h.xp} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {shared.length > 0 && (
          <div className="border-t border-border/60 p-5">
            <div className="eyebrow mb-3">Shared challenges</div>
            <div className="space-y-3">
              {shared.map((x) => (
                <Link key={x.id} href={x.kind === "c" ? "/arena?tab=missions" : "/arena?tab=rivalries"} className="flex items-center gap-3 rounded-xl transition hover:opacity-90">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-arc/15 text-arc">{x.kind === "c" ? <Sparkles className="h-4 w-4" /> : <Swords className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[14px] font-medium">{x.title}</span><span className="shrink-0 text-[12px] text-muted-foreground">{timeLeft(x.end)}</span></div>
                    {x.kind === "c" ? (
                      <>
                        <Progress value={(x.value / x.target) * 100} className="mt-1.5" color={DIM[x.dim].color} />
                        <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{x.value} of {x.target} {x.unit}</div>
                      </>
                    ) : <div className="text-[12px] text-muted-foreground">You&apos;re {x.place === 1 ? "in the lead" : `#${x.place} of ${x.of}`}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <PriorityPicker open={picking} onOpenChange={setPicking} />
    </Section>
  );
}

function PriorityRow({ p, n, onToggle }: { p: Priority; n: number; onToggle: () => void }) {
  return (
    <div className="flex min-h-[60px] items-center gap-3 px-3 py-2">
      <CheckCircle done={p.done} onClick={onToggle} label={`${p.done ? "Undo" : "Complete"} ${p.title}`} color={DIM[p.dim].color} />
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary font-display text-[12px] font-semibold text-muted-foreground">{n}</span>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[15px] font-medium", p.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>{p.title}</div>
        <div className="flex items-center gap-2"><AreaTag dim={p.dim} /><span className="text-[11px] text-muted-foreground">{p.type === "habit" ? "Daily" : "One-time"}{p.picked && " · your pick"}</span></div>
      </div>
      <AuraChip value={p.xp} />
    </div>
  );
}

function PriorityPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { s, me, profile, act } = useGame();
  const plan = dailyPlan(s, me, profile.dailyGoal);
  const pool = [...plan.due.map((h) => ({ id: h.id, title: h.title, dim: h.dim, icon: h.icon, xp: h.xp })), ...plan.todos.filter((x) => !x.done).map((x) => ({ id: x.id, title: x.title, dim: x.dim, icon: x.icon, xp: x.xp }))];
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { if (open) setIds(plan.priorities.filter((p) => p.picked).map((p) => p.id)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Today&apos;s top three</DialogTitle><DialogDescription>Pick up to three that matter most. Anything you leave empty fills itself from today&apos;s quests.</DialogDescription></DialogHeader>
        <div className="max-h-[50dvh] space-y-1.5 overflow-y-auto">
          {pool.map((q) => {
            const i = ids.indexOf(q.id);
            return (
              <button key={q.id} type="button" onClick={() => setIds(i >= 0 ? ids.filter((x) => x !== q.id) : ids.length < 3 ? [...ids, q.id] : ids)}
                className={cn("flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition", i >= 0 ? "border-primary bg-primary/10" : "border-border bg-card")}>
                <QuestGlyph icon={q.icon} dim={q.dim} size={30} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{q.title}</span>
                {i >= 0 ? <span className="grid h-6 w-6 place-items-center rounded-full bg-primary font-display text-[12px] font-bold text-primary-foreground">{i + 1}</span> : <Star className="h-4 w-4 text-muted-foreground/50" />}
              </button>
            );
          })}
          {pool.length === 0 && <p className="py-6 text-center text-[14px] text-muted-foreground">Nothing open today.</p>}
        </div>
        <Button size="lg" className="mt-5 w-full" onClick={() => { act({ t: "prioritize", ids }); onOpenChange(false); }}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}

/** Monday to Wednesday: last week's recap is ready. Dismissed per week on this device. */
function RecapBanner() {
  const t = today();
  const wk = addDays(weekStart(t), -7);
  const key = `tna-recap-${wk}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(weekday(t) > 2 || localStorage.getItem(key) === "1"); } catch { setHidden(weekday(t) > 2); } }, [key, t]);
  if (hidden) return null;
  return (
    <Link href="/recap" className="electric panel group relative flex items-center gap-4 overflow-hidden p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><Sparkles className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Your weekly recap is ready</span>
        <span className="block text-[13px] text-muted-foreground">{fmtShort(wk)} – {fmtShort(addDays(wk, 6))}: Aura, quests, strongest areas</span>
      </span>
      <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-0.5" />
      <button type="button" aria-label="Dismiss" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
        onClick={(e) => { e.preventDefault(); try { localStorage.setItem(key, "1"); } catch { /* storage blocked */ } setHidden(true); }}>
        <X className="h-3.5 w-3.5" />
      </button>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* the squad as a whole                                                */
/* ------------------------------------------------------------------ */
function SquadPulse({ period }: { period: ComparePeriod }) {
  const { s, stats } = useGame();
  const anim = useAnimate();
  const members = s.members;
  if (members.length === 0) return null;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const row: Record<string, number | string | null> = { w: i === 7 ? "Now" : fmtShort(addDays(weekStart(today()), -7 * (7 - i) + 6)) };
    const vals = members.map((m) => stats(m.id)?.trend[i] ?? null).filter((v): v is number => v !== null);
    row.squad = vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : null;
    for (const m of members) row[m.id] = stats(m.id)?.trend[i] ?? null;
    return row;
  });
  const improvements = members.map((m) => {
    const st = stats(m.id);
    return { m, d: st && st.b7.vision !== null && st.bPrev7.vision !== null ? st.b7.vision - st.bPrev7.vision : null };
  }).filter((x) => x.d !== null).sort((a, b) => b.d! - a.d!);
  const dimAvg = DIMS.filter((d) => d.id !== "vision").map((d) => {
    const vals = members.map((m) => scoresFor(stats(m.id), period).now?.[d.id] ?? null).filter((v): v is number => v !== null);
    return { d, avg: vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : null };
  }).filter((x) => x.avg !== null).sort((a, b) => b.avg! - a.avg!);
  const charge = squadWeekAura(s);
  const goal = squadWeeklyGoal(s);
  const top = improvements[0];
  return (
    <Section title="Squad pulse" eyebrow="Together">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div><div className="font-display text-[16px] font-semibold">Overall Life Balance</div><div className="text-[13px] text-muted-foreground">Squad average and each cousin, last eight weeks</div></div>
          </div>
          <div className="mt-3 h-56 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="w" {...axisProps} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axisProps} />
                <Tooltip {...tooltipStyle} formatter={(v: number, id: string) => [`${v}%`, id === "squad" ? "Squad" : members.find((m) => m.id === id)?.name ?? id]} />
                {members.map((m) => <Line key={m.id} isAnimationActive={anim} dataKey={m.id} stroke={memberColor(m)} strokeOpacity={0.5} strokeWidth={1.5} dot={false} connectNulls />)}
                <Line isAnimationActive={anim} dataKey="squad" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-primary" />Squad</span>
            {members.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: memberColor(m) }} />{m.name}</span>)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="eyebrow">Most improved this week</div>
            {top && top.d! > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                <AvatarView member={top.m} size={40} />
                <div className="min-w-0"><div className="truncate text-[15px] font-semibold">{top.m.name}</div><Delta now={top.d} prev={0} className="text-[13px]" /></div>
              </div>
            ) : <p className="mt-2 text-[14px] text-muted-foreground">Nobody yet. A strong day could make it you.</p>}
          </div>
          <div className="panel p-5">
            <div className="eyebrow">{PERIOD_LABEL[period]}</div>
            {dimAvg.length ? (
              <div className="mt-3 space-y-2 text-[14px]">
                <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Strongest</span><AreaTag dim={dimAvg[0].d.id} className="text-[13px] text-foreground" /><span className="font-semibold tabular-nums">{dimAvg[0].avg}%</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Needs attention</span><AreaTag dim={dimAvg[dimAvg.length - 1].d.id} className="text-[13px] text-foreground" /><span className="font-semibold tabular-nums">{dimAvg[dimAvg.length - 1].avg}%</span></div>
              </div>
            ) : <p className="mt-2 text-[14px] text-muted-foreground">A few days of quests and the squad&apos;s strengths will show here.</p>}
          </div>
          <div className="panel p-5">
            <div className="eyebrow">Squad charge</div>
            <div className="mt-2 flex items-baseline gap-1.5"><span className="font-display text-[26px] font-bold tabular-nums">{charge.toLocaleString("en-IN")}</span><span className="text-[13px] text-muted-foreground">of {goal.toLocaleString("en-IN")} Aura this week</span></div>
            <Progress value={(charge / goal) * 100} className="mt-3 h-2" color="hsl(var(--arc))" />
          </div>
        </div>
      </div>
    </Section>
  );
}

