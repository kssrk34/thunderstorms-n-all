"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ChevronRight, Flame, Plus, Shield, Sparkles, Star, Swords, Target, TrendingUp, UserPlus, Users, X, Zap } from "lucide-react";
import { ClearSkyArt, SkyScene } from "@/components/brand";
import { DimensionComparison, PERIOD_LABEL, scoresFor, type ComparePeriod } from "@/components/compare";
import { Feed } from "@/components/feed";
import {
  AreaTag, AuraChip, AuraCounter, AvatarView, CheckCircle, Delta, EmptyState, MemberPortrait, QuestGlyph, RankEmblem, Ring, Section, axisProps, memberColor, tooltipStyle, useAnimate, useLevel, useRank,
} from "@/components/game";
import { InvitationCard, scheduleLabel } from "@/components/share";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { challengeProgress } from "@/lib/balance";
import { CHARACTER, DIM, DIMS, MAX_MEMBERS } from "@/lib/catalog";
import { dailyPlan, periodAura, rivalryStandings, squadWeekAura, squadWeeklyGoal, streakOf, timeLeft, type Priority } from "@/lib/engine";
import { isLive, participantIds, pendingInvites, shareProgress } from "@/lib/shared";
import { useGame } from "@/lib/store";
import type { Member } from "@/lib/types";
import { addDays, cn, fmtShort, today, weekStart, weekday } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const [period, setPeriod] = useState<ComparePeriod>("week");
  return (
    <div className="space-y-9">
      <Hero />
      <SquadStrip />
      <Invitations />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Section title="Life Balance overview" eyebrow="Ten dimensions, side by side"
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
        <MissionCenter />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <RecapBanner />
          <RecentActivity />
        </div>
        <ActiveChallenges />
      </div>

      <SquadPulse period={period} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* header                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  const { profile } = useGame();
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <header className="relative isolate overflow-hidden rounded-[28px] border border-border/70 shadow-card motion-safe:animate-fade-up">
      <SkyScene />
      <div className="relative px-5 pb-12 pt-7 text-center sm:pb-16 sm:pt-10">
        <div className="text-[12px] font-medium text-foreground/60 sm:text-[13px]">{greeting()}, {profile.name.split(" ")[0]} · {dateLabel}</div>
        <h1 className="mt-2 font-display text-[30px] font-bold leading-[1.05] tracking-tight sm:text-[44px]">Five Cousins. One Universe.</h1>
        <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[.24em] text-foreground/65 sm:text-[13px]">Real Progress. Real Relationships. Real Aura.</p>
      </div>
    </header>
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
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0">
        {ordered.map((m) => <CousinCard key={m.id} m={m} place={placeOf(m.id)} />)}
        {Array.from({ length: open }, (_, i) => (
          <Link key={i} href="/profile?tab=settings#cousins" className="flex w-[200px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-border bg-card/60 p-5 text-center text-muted-foreground transition hover:border-primary/40 hover:text-foreground lg:w-auto">
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
  const { s, me } = useGame();
  const L = useLevel(m.id);
  const rank = useRank(m.id);
  const streak = streakOf(s, m.id);
  const week = Math.max(0, periodAura(s, m.id, "weekly"));
  const color = memberColor(m);
  const c = m.character ? CHARACTER[m.character] : undefined;
  const you = m.id === me;
  return (
    <Link href={you ? "/profile" : `/u/${m.username}`}
      className="group relative flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float lg:w-auto"
      style={{ ["--tone" as string]: color }}>
      <div className="relative aspect-[5/4] overflow-hidden" style={{ background: c?.deep ?? color }}>
        <MemberPortrait member={m} className="transition duration-500 group-hover:scale-[1.04]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        {you && <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#0B1530] shadow">You</span>}
        {place > 0 && s.members.length > 1 && (
          <span className="absolute right-2.5 top-2.5 grid h-8 w-7 place-items-center font-display text-[13px] font-bold text-white drop-shadow" title={`#${place} this week`} aria-label={`Number ${place} this week`}>
            <svg viewBox="0 0 28 32" className="absolute inset-0 h-full w-full" aria-hidden><path d="M14 1 26 5.5v10c0 7.5-5 12.5-12 15.5C7 28 2 23 2 15.5v-10Z" fill={place === 1 ? "hsl(var(--accent))" : color} stroke="rgba(255,255,255,.85)" strokeWidth="1.5" /></svg>
            <span className="relative">{place}</span>
          </span>
        )}
        <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-white">
          <RankEmblem tier={rank.tier} division={rank.division} size={22} />
          <span className="text-[11px] font-semibold drop-shadow">{rank.label}</span>
        </span>
      </div>
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-[17px] font-semibold tracking-tight">{m.name}</span>
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Lv {L.level}</span>
        </div>
        <div className="truncate text-[12px] text-muted-foreground">{c && !m.photo ? c.title : `@${m.username}`}</div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={`Level ${L.level}: ${Math.round(L.pct * 100)}% to the next`}>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(3, L.pct * 100)}%`, background: color }} />
        </div>
        <div className="mt-2.5 font-display text-[22px] font-bold leading-none tracking-tight" style={{ color }}>
          {you ? <AuraCounter value={L.aura} /> : <span className="inline-flex items-center gap-1 tabular-nums"><Zap className="h-[0.8em] w-[0.8em] fill-current" />{L.aura.toLocaleString("en-IN")}</span>}
          <span className="ml-1 text-[13px] font-medium text-muted-foreground">Aura</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", week > 0 && "text-success")}><TrendingUp className="h-3.5 w-3.5" />+{week} this week</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums"><Flame className={cn("h-3.5 w-3.5", streak.current ? "text-[#FF8A4C]" : "")} />{streak.current}d</span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* invitations waiting                                                 */
/* ------------------------------------------------------------------ */
function Invitations() {
  const { s, me } = useGame();
  const waiting = pendingInvites(s, me);
  if (!waiting.length) return null;
  return (
    <Section title={waiting.length === 1 ? "You're invited" : `${waiting.length} invitations`} eyebrow="From your cousins" action={<Link href="/quests?tab=shared" className="text-[14px] text-primary hover:opacity-80">All invitations</Link>}>
      <div className="grid gap-3 md:grid-cols-2">{waiting.slice(0, 2).map((sq) => <InvitationCard key={sq.id} sq={sq} />)}</div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* today                                                               */
/* ------------------------------------------------------------------ */
function MissionCenter() {
  const { s, me, profile, act, openSheet } = useGame();
  const t = today();
  const plan = dailyPlan(s, me, profile.dailyGoal, t);
  const streak = streakOf(s, me);
  const [picking, setPicking] = useState(false);
  const prioIds = new Set(plan.priorities.map((p) => p.id));
  const refs = new Set(s.logs.filter((l) => l.userId === me && l.date === t).map((l) => l.ref));
  const rest: Priority[] = [
    ...plan.due.filter((h) => !prioIds.has(h.id)).map((h) => ({ type: "habit" as const, id: h.id, title: h.title, xp: h.xp, dim: h.dim, picked: false, done: refs.has(`h:${h.id}:${t}`) })),
    ...plan.todos.filter((x) => !prioIds.has(x.id) && !x.done).map((x) => ({ type: "todo" as const, id: x.id, title: x.title, xp: x.xp, dim: x.dim, picked: false, done: x.done })),
  ];
  const all = [...plan.priorities, ...rest];
  const doneCount = all.filter((p) => p.done).length;
  const nothing = all.length === 0;
  const icon = (p: Priority) => (p.type === "habit" ? s.habits.find((h) => h.id === p.id)?.icon : s.todos.find((x) => x.id === p.id)?.icon);
  const shared = (p: Priority) => !!(p.type === "habit" ? s.habits.find((h) => h.id === p.id)?.shareId : s.todos.find((x) => x.id === p.id)?.shareId);
  const toggle = (p: Priority) => act(p.type === "habit" ? { t: "habit", habitId: p.id } : { t: "todo", id: p.id });

  return (
    <Section title="Today's missions" eyebrow="Mission center" action={<Button size="sm" variant="tinted" onClick={() => openSheet({ kind: "log" })}><Zap />Log activity</Button>}>
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <Ring value={plan.earned / Math.max(1, plan.objective)} size={84} stroke={9} glow={plan.earned >= plan.objective}>
            <div>
              <div className="font-display text-[19px] font-bold leading-none tabular-nums"><AuraCounter value={plan.earned} icon={false} /></div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">of {plan.objective}</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{nothing ? "Plan your day" : `${doneCount}/${all.length} completed`}</div>
            <div className="text-[12px] text-muted-foreground">{plan.earned >= plan.objective ? "Daily objective reached. Charged." : plan.rested ? "Rest day. Your streak is safe." : `${plan.objective - plan.earned} Aura Points to your daily objective`}</div>
            {!nothing && <Progress value={(100 * doneCount) / Math.max(1, all.length)} className="mt-2 h-1.5" />}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-[#FF8A4C]" />{streak.current}-day streak</span>
              <span className="inline-flex items-center gap-1" title="Each 7 days in a row earns a shield. A missed day uses one instead of breaking your streak."><Shield className="h-3.5 w-3.5 text-ion" />{streak.shields}</span>
              {!plan.rested && streak.current > 0 && !(s.restDays[me] ?? []).some((d) => d >= weekStart(t)) && <button className="text-primary hover:opacity-80" onClick={() => act({ t: "rest" })}>Rest day</button>}
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
            <div className="flex items-center justify-between border-t border-border/60 px-4 pb-1 pt-3 sm:px-5">
              <span className="eyebrow">Top three first</span>
              <button className="text-[12px] font-medium text-primary hover:opacity-80" onClick={() => setPicking(true)}>Choose</button>
            </div>
            <div className="divide-y divide-border/50 px-2 pb-2">
              {all.slice(0, 7).map((p, i) => (
                <div key={p.id} className="flex min-h-[56px] items-center gap-3 px-2 py-1.5 sm:px-3">
                  <QuestGlyph icon={icon(p)} dim={p.dim} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("flex items-center gap-1.5 truncate text-[14px] font-medium", p.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                      {i < plan.priorities.length && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/12 font-display text-[10px] font-bold text-primary">{i + 1}</span>}
                      <span className="truncate">{p.title}</span>
                      {shared(p) && <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Shared with cousins" />}
                    </div>
                    <div className="flex items-center gap-2"><AreaTag dim={p.dim} className="text-[11px]" /><AuraChip value={p.xp} className="text-[11px]" /></div>
                  </div>
                  <CheckCircle done={p.done} onClick={() => toggle(p)} label={`${p.done ? "Undo" : "Complete"} ${p.title}`} color={DIM[p.dim].color} />
                </div>
              ))}
            </div>
            {all.length > 7 && <Link href="/quests" className="flex items-center justify-center gap-1 border-t border-border/60 py-2.5 text-[13px] font-medium text-primary hover:opacity-80">{all.length - 7} more today <ChevronRight className="h-4 w-4" /></Link>}
          </>
        )}
      </div>
      <PriorityPicker open={picking} onOpenChange={setPicking} />
    </Section>
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
/* the squad, live                                                     */
/* ------------------------------------------------------------------ */
function RecentActivity() {
  const { s } = useGame();
  return (
    <Section title="Recent activity" eyebrow="Live" action={<Link href="/arena" className="text-[14px] text-primary hover:opacity-80">Arena</Link>}>
      <div className="panel max-h-[520px] overflow-y-auto">
        <Feed events={s.feed.slice(0, 10)} empty={s.members.length < 2 ? "When your cousins join, their wins show up here." : undefined} />
      </div>
    </Section>
  );
}

interface ChallengeCard { key: string; href?: string; share?: string; icon: React.ReactNode; title: string; who: string[]; value?: number; target?: number; unit?: string; color: string; end?: string; reward: string; note?: string }

/** Missions, rivalries and shared quests you're in: who, how far, how long, and what finishing earns. */
function ActiveChallenges() {
  const { s, me, openSheet } = useGame();
  const t = today();
  const cards: ChallengeCard[] = [
    ...s.challenges.filter((c) => c.participants.includes(me) && c.endsOn >= t).map((c): ChallengeCard => {
      const value = c.scope === "squad" ? c.participants.reduce((a, p) => a + challengeProgress(s, c.id, p), 0) : challengeProgress(s, c.id, me);
      return {
        key: `c:${c.id}`, href: "/arena?tab=missions", icon: <QuestGlyph icon={c.icon} dim={c.dim} size={38} />, title: c.title, who: c.participants, value: Math.min(value, c.target), target: c.target, unit: c.unit,
        color: DIM[c.dim].color, end: c.endsOn, reward: `+${c.xp} Aura${c.participants.length > 1 ? " each" : ""}`, note: c.completedBy.includes(me) ? "Complete" : c.scope === "team" && c.participants.length > 1 ? "Everyone hits their target" : c.scope === "squad" ? "One shared total" : undefined,
      };
    }),
    ...s.shares.filter((sq) => sq.members[me]?.status === "accepted" && isLive(sq, t)).map((sq): ChallengeCard => {
      const p = shareProgress(s, sq, t);
      const mine = p.members.find((m) => m.id === me);
      return {
        key: `s:${sq.id}`, share: sq.id, icon: <QuestGlyph icon={sq.icon} dim={sq.dim} size={38} />, title: sq.title, who: participantIds(sq), color: DIM[sq.dim].color, end: sq.endsOn,
        ...(sq.mode === "team" && sq.target ? { value: Math.min(p.total, sq.target), target: sq.target, unit: "together" } : {}),
        reward: sq.mode === "team" ? `+${sq.xp} each time${sq.bonus ? ` · +${sq.bonus} team bonus` : ""}` : `+${sq.xp} Aura ${sq.kind === "habit" ? "each time" : ""}`.trim(),
        note: sq.mode === "team" ? "Team goal" : sq.kind === "habit" ? `${scheduleLabel(sq.days)}${mine?.consistency != null ? ` · you ${mine.consistency}%` : ""}` : "Shared quest",
      };
    }),
    ...s.rivalries.filter((r) => r.participants.includes(me) && r.end >= t).map((r): ChallengeCard => {
      const place = rivalryStandings(s, r).findIndex((x) => x.id === me) + 1;
      return { key: `r:${r.id}`, href: "/arena?tab=rivalries", icon: <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-arc/15 text-arc"><Swords className="h-[19px] w-[19px]" /></span>, title: r.title, who: r.participants, color: "hsl(var(--arc))", end: r.end, reward: r.stake ? `Trophy · ${r.stake}` : "Trophy and badge", note: place === 1 ? "You're in the lead" : `You're #${place} of ${r.participants.length}` };
    }),
  ].sort((a, b) => (a.end ?? "9999").localeCompare(b.end ?? "9999"));

  return (
    <Section title="Active challenges" eyebrow="Together" action={<Link href="/arena?tab=missions" className="text-[14px] text-primary hover:opacity-80">All missions</Link>}>
      {cards.length === 0 ? (
        <div className="panel">
          <EmptyState art={<Target className="h-10 w-10 text-primary/60" />} title="Nothing running yet" body="Start a mission, or invite cousins to any quest or habit and do it together."
            action={<><Button onClick={() => openSheet({ kind: "quest", preset: { kind: "challenge" } })}><Plus />New mission</Button><Button variant="secondary" onClick={() => openSheet({ kind: "quest", preset: { kind: "daily", invite: true } })}><UserPlus />Shared habit</Button></>} />
        </div>
      ) : (
        <div className="space-y-3">
          {cards.slice(0, 6).map((c) => {
            const inner = (
              <>
                {c.icon}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-semibold">{c.title}</span><span className="shrink-0 text-[12px] text-muted-foreground">{c.end ? timeLeft(c.end, t) : "Ongoing"}</span></div>
                  {c.target ? (
                    <>
                      <Progress value={(100 * (c.value ?? 0)) / c.target} className="mt-1.5 h-1.5" color={c.color} />
                      <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{c.value} of {c.target} {c.unit}{c.note ? ` · ${c.note}` : ""}</div>
                    </>
                  ) : c.note ? <div className="mt-0.5 text-[12px] text-muted-foreground">{c.note}</div> : null}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex -space-x-1.5">{c.who.slice(0, 5).map((id) => { const m = s.members.find((x) => x.id === id); return m ? <AvatarView key={id} member={m} size={22} frame={false} className="rounded-full ring-2 ring-card" /> : null; })}</div>
                    <span className="truncate text-[11px] font-semibold text-primary">{c.reward}</span>
                  </div>
                </div>
              </>
            );
            return c.share
              ? <button key={c.key} type="button" onClick={() => openSheet({ kind: "share", id: c.share! })} className="panel flex w-full items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40">{inner}</button>
              : <Link key={c.key} href={c.href!} className="panel flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-primary/40">{inner}</Link>;
          })}
        </div>
      )}
    </Section>
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
    <Section title="Squad pulse" eyebrow="Stronger together">
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
                {members.map((m) => <Line key={m.id} isAnimationActive={anim} dataKey={m.id} stroke={memberColor(m)} strokeOpacity={0.55} strokeWidth={1.5} dot={false} connectNulls />)}
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
