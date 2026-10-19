"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Crown, Heart, LogOut, MapPin, Minus, Plus, Swords, Trophy, Users } from "lucide-react";
import { SquadArt, StormArt } from "@/components/brand";
import {
  AreaTag, AuraChip, Avatar, AvatarView, DeleteButton, EmptyState, PageHeader, QuestGlyph, RankBadge, Section, Stat, axisProps, memberColor, tooltipStyle, useAnimate, useLevel,
} from "@/components/game";
import { QUEST_ICON } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { challengeProgress } from "@/lib/balance";
import { DIM, HANGOUT_IDEAS } from "@/lib/catalog";
import { auraBetween, consistency, leaderboard, memberIds, rivalryStandings, rivalryWinners, timeLeft, userLogs, type Metric } from "@/lib/engine";
import { useGame, useMember } from "@/lib/store";
import type { Challenge, Rivalry } from "@/lib/types";
import { addDays, cn, daysBetween, fmtShort, monthStart, today, weekStart } from "@/lib/utils";

type Tab = "leaderboard" | "rivalries" | "missions" | "together";
const TABS: Tab[] = ["leaderboard", "rivalries", "missions", "together"];

function ArenaInner() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "leaderboard";
  const { openSheet } = useGame();
  const setTab = (v: string) => router.replace(v === "leaderboard" ? "/arena" : `/arena?tab=${v}`, { scroll: false });
  const action = tab === "rivalries" ? <Button size="sm" onClick={() => openSheet({ kind: "rivalry" })}><Swords />Rivalry</Button>
    : tab === "missions" ? <Button size="sm" onClick={() => openSheet({ kind: "quest", preset: { kind: "challenge" } })}><Plus />Mission</Button>
      : tab === "together" ? <Button size="sm" onClick={() => openSheet({ kind: "meetup" })}><Plus />Meetup</Button> : undefined;
  return (
    <div>
      <PageHeader title="Arena" subtitle="Friendly rivalry, shared missions, and the days you spend together." action={action} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full sm:inline-flex sm:w-auto">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger><TabsTrigger value="rivalries">Rivalries</TabsTrigger><TabsTrigger value="missions">Missions</TabsTrigger><TabsTrigger value="together">Together</TabsTrigger>
        </TabsList>
        <TabsContent value="leaderboard"><Leaderboard /></TabsContent>
        <TabsContent value="rivalries"><Rivalries /></TabsContent>
        <TabsContent value="missions"><Missions /></TabsContent>
        <TabsContent value="together"><Together /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function Arena() {
  return <Suspense><ArenaInner /></Suspense>;
}

function NeedCousins({ what }: { what: string }) {
  return (
    <Card>
      <EmptyState art={<SquadArt />} title="Better with cousins" body={`${what} light up as soon as a cousin joins.`}
        action={<Button asChild><Link href="/profile?tab=settings#cousins">Invite your cousins</Link></Button>} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* leaderboard                                                         */
/* ------------------------------------------------------------------ */
const METRIC: Record<Metric, { label: string; unit: string }> = {
  aura: { label: "Aura Points", unit: "" }, balance: { label: "Life Balance", unit: "%" }, consistency: { label: "Consistency", unit: "%" }, streak: { label: "Streak", unit: "days" },
};
type LP = "weekly" | "monthly" | "all";

function Leaderboard() {
  const { s, me, stats } = useGame();
  const anim = useAnimate();
  const [p, setP] = useState<LP>("weekly");
  const [metric, setMetric] = useState<Metric>("aura");
  if (s.members.length < 2) return <NeedCousins what="Standings, rivalries and the squad charge" />;
  const rows = leaderboard(s, p, metric, stats);
  const t = today();
  const ws = weekStart(t);
  const lastWeek = (id: string) => auraBetween(userLogs(s, id), addDays(ws, -7), addDays(ws, -1));
  // same number of days into last week, for a fair comparison
  const lastWeekSoFar = (id: string) => auraBetween(userLogs(s, id), addDays(ws, -7), addDays(t, -7));
  const thisWeek = (id: string) => auraBetween(userLogs(s, id), ws, t);
  const weeks = [3, 2, 1, 0].map((k) => {
    const w = addDays(ws, -7 * k);
    const row: Record<string, number | string> = { w: k === 0 ? "This week" : fmtShort(w) };
    for (const m of s.members) row[m.id] = Math.max(0, auraBetween(userLogs(s, m.id), w, addDays(w, 6)));
    return row;
  });
  const ids = memberIds(s);
  const best = (f: (id: string) => number | null) => ids.map((id) => ({ id, v: f(id) })).filter((x) => x.v !== null && x.v > 0).sort((a, b) => b.v! - a.v!)[0];
  const standouts = [
    { title: "Most Aura", ...best((id) => thisWeek(id)), fmt: (v: number) => `${v} Aura Points` },
    { title: "Most improved", ...best((id) => thisWeek(id) - lastWeekSoFar(id)), fmt: (v: number) => `+${v} on last week` },
    { title: "Most consistent", ...best((id) => consistency(s, id, 7)), fmt: (v: number) => `${v}% of days` },
    { title: "Most balanced", ...best((id) => stats(id)?.b7.vision ?? null), fmt: (v: number) => `${v}% Life Vision` },
  ].filter((x) => x.id);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={p} onValueChange={(v) => setP(v as LP)}>
            <TabsList><TabsTrigger value="weekly">This week</TabsTrigger><TabsTrigger value="monthly">This month</TabsTrigger><TabsTrigger value="all">All time</TabsTrigger></TabsList>
          </Tabs>
          <select className="field h-9 w-auto rounded-[11px] text-[13px]" value={metric} onChange={(e) => setMetric(e.target.value as Metric)} aria-label="Rank by">
            {(Object.keys(METRIC) as Metric[]).map((m) => <option key={m} value={m}>Rank by {m === "aura" || m === "balance" ? METRIC[m].label : METRIC[m].label.toLowerCase()}</option>)}
          </select>
        </div>
        <List>
          {rows.map((r, i) => {
            const delta = p === "weekly" ? thisWeek(r.id) - lastWeekSoFar(r.id) : null;
            return <StandingRow key={r.id} id={r.id} rank={i + 1} value={r.value} unit={METRIC[metric].unit} me={me} delta={delta} />;
          })}
        </List>
        <p className="px-1 text-[12px] text-muted-foreground">{p === "weekly" ? "Arrows compare with the same point last week." : "Rankings update as anyone completes something."} Last week&apos;s totals: {s.members.map((m) => `${m.name} ${lastWeek(m.id)}`).join(" · ")}.</p>
      </section>

      {standouts.length > 0 && (
        <Section title="This week's standouts">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {standouts.map((x) => (
              <Card key={x.title} className="p-4">
                <div className="eyebrow">{x.title}</div>
                <div className="mt-3 flex items-center gap-2"><Avatar id={x.id!} size={30} /><span className="truncate text-[15px] font-medium"><Name id={x.id!} /></span></div>
                <div className="mt-1 text-[13px] tabular-nums text-muted-foreground">{x.fmt(x.v!)}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Card>
        <div className="px-5 pt-5"><div className="font-display text-[16px] font-semibold">Week by week</div><div className="text-[13px] text-muted-foreground">Aura Points over the last four weeks.</div></div>
        <div className="h-64 px-2 pb-3 pt-2 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ left: -18, right: 8, top: 4 }} barGap={3}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="w" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} formatter={(v: number, id: string) => [`${v} Aura Points`, s.members.find((m) => m.id === id)?.name ?? id]} />
              {s.members.map((m) => <Bar isAnimationActive={anim} key={m.id} dataKey={m.id} name={m.name} fill={memberColor(m)} radius={[5, 5, 0, 0]} maxBarSize={22} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-5 text-[12px] text-muted-foreground">
          {s.members.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: memberColor(m) }} />{m.name}</span>)}
        </div>
      </Card>
    </div>
  );
}

function Name({ id }: { id: string }) {
  return <>{useMember(id).name}</>;
}

function StandingRow({ id, rank, value, unit, me, delta }: { id: string; rank: number; value: number | null; unit: string; me: string; delta: number | null }) {
  const m = useMember(id);
  const L = useLevel(id);
  return (
    <Link href={id === me ? "/profile" : `/u/${m.username}`} className={cn("flex min-h-[70px] items-center gap-3 px-4 py-3 transition hover:bg-secondary/40", id === me && "bg-primary/[.06]")}>
      <span className={cn("w-6 text-center font-display text-[18px] font-bold tabular-nums", rank === 1 ? "text-accent" : "text-muted-foreground")}>{rank === 1 ? <Crown className="mx-auto h-5 w-5" /> : rank}</span>
      <AvatarView member={m} size={42} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{m.name}{id === me && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><RankBadge id={id} size={15} /><span className="hidden sm:inline">· Level {L.level}</span></div>
      </div>
      <div className="text-right">
        <div><span className="font-display text-[20px] font-bold tracking-tight tabular-nums">{value ?? "—"}</span>{unit && value !== null && <span className="ml-1 text-[12px] text-muted-foreground">{unit}</span>}</div>
        {delta !== null && delta !== 0 && <div className={cn("text-[11px] font-semibold tabular-nums", delta > 0 ? "text-success" : "text-muted-foreground")}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta)}</div>}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* rivalries                                                           */
/* ------------------------------------------------------------------ */
function Rivalries() {
  const { s, openSheet } = useGame();
  const t = today();
  if (s.members.length < 2) return <NeedCousins what="Weekly rivalries" />;
  const live = s.rivalries.filter((r) => r.end >= t);
  const done = s.rivalries.filter((r) => r.end < t).slice(0, 8);
  return (
    <div className="space-y-8">
      {live.length === 0 ? (
        <Card>
          <EmptyState art={<StormArt />} title="No rivalries this week" body="Start a friendly race: most Aura, most consistent, or the strongest week in one dimension. It runs until Sunday."
            action={<Button onClick={() => openSheet({ kind: "rivalry" })}><Swords />Start a rivalry</Button>} />
        </Card>
      ) : <div className="grid gap-4 md:grid-cols-2">{live.map((r) => <RivalryCard key={r.id} r={r} />)}</div>}
      {done.length > 0 && <div><div className="eyebrow mb-2 px-1">Finished</div><div className="grid gap-4 md:grid-cols-2">{done.map((r) => <RivalryCard key={r.id} r={r} />)}</div></div>}
    </div>
  );
}

function RivalryCard({ r }: { r: Rivalry }) {
  const { s, me, act } = useGame();
  const t = today();
  const ended = r.end < t;
  const standings = rivalryStandings(s, r);
  const winners = rivalryWinners(s, r, t);
  const top = Math.max(1, ...standings.map((x) => x.value));
  const joined = r.participants.includes(me);
  const unit = r.metric === "days" ? "days" : "Aura";
  return (
    <Card className={cn("flex flex-col p-5", !ended && "electric")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", ended ? "bg-accent/15 text-accent" : "bg-arc/15 text-arc")}>{ended ? <Trophy className="h-5 w-5" /> : <Swords className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-semibold leading-snug">{r.title}</div>
          <div className="text-[12px] text-muted-foreground">
            {r.metric === "aura" ? "Most Aura Points" : r.metric === "days" ? "Most active days" : `Most ${DIM[r.dim ?? "health"].short} Aura`} · {ended ? `Ended ${fmtShort(r.end)}` : `${timeLeft(r.end)} · ends Sunday`}
          </div>
        </div>
        {r.createdBy === me && !ended && <DeleteButton onConfirm={() => act({ t: "rivalDel", id: r.id })} label="Cancel" />}
      </div>
      <div className="mt-4 flex-1 space-y-2.5">
        {standings.map((x, i) => {
          const m = s.members.find((mm) => mm.id === x.id);
          if (!m) return null;
          return (
            <div key={x.id} className="flex items-center gap-2.5">
              <span className="w-4 text-center text-[12px] font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              <AvatarView member={m} size={26} frame={false} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[13px]"><span className={cn("truncate", x.id === me && "font-semibold")}>{x.id === me ? "You" : m.name}{winners.includes(x.id) && <Crown className="ml-1 inline h-3.5 w-3.5 text-accent" />}</span><span className="tabular-nums text-muted-foreground">{x.value} {unit}</span></div>
                <Progress value={(x.value / top) * 100} className="mt-1 h-1.5" color={memberColor(m)} />
              </div>
            </div>
          );
        })}
      </div>
      {r.stake && <p className="mt-3 text-[13px] text-muted-foreground">Stakes: {r.stake}</p>}
      {!ended && !joined && <Button variant="tinted" className="mt-4 w-full" onClick={() => act({ t: "rivalJoin", id: r.id })}><Plus />Join</Button>}
      {!ended && joined && r.createdBy !== me && <button className="mt-3 inline-flex items-center gap-1 self-start text-[12px] text-muted-foreground hover:text-foreground" onClick={() => act({ t: "rivalLeave", id: r.id })}><LogOut className="h-3.5 w-3.5" />Leave</button>}
      {ended && winners.length > 0 && <div className="mt-4 rounded-full bg-accent/10 py-2 text-center text-[13px] font-medium text-accent">{winners.map((w) => (w === me ? "You" : s.members.find((m) => m.id === w)?.name)).join(" & ")} won</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* missions                                                            */
/* ------------------------------------------------------------------ */
function Missions() {
  const { s, me, openSheet } = useGame();
  const t = today();
  const live = s.challenges.filter((c) => c.endsOn >= t);
  const mine = live.filter((c) => c.participants.includes(me));
  const open = live.filter((c) => !c.participants.includes(me));
  const past = s.challenges.filter((c) => c.endsOn < t && c.participants.includes(me)).slice(0, 12);
  if (!mine.length && !open.length && !past.length) {
    return (
      <Card>
        <EmptyState art={<StormArt />} title="No missions yet" body="A mission is a target with a deadline. Team missions pay everyone once every cousin hits their own target, like three workouts each this week."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "challenge" } })}><Plus />Start a mission</Button>} />
      </Card>
    );
  }
  return (
    <div className="space-y-8">
      {mine.length > 0 && <div><div className="eyebrow mb-2 px-1">You&apos;re in</div><div className="grid gap-4 md:grid-cols-2">{mine.map((c) => <MissionCard key={c.id} c={c} />)}</div></div>}
      {open.length > 0 && <div><div className="eyebrow mb-2 px-1">Open to join</div><div className="grid gap-4 md:grid-cols-2">{open.map((c) => <MissionCard key={c.id} c={c} />)}</div></div>}
      {past.length > 0 && <div><div className="eyebrow mb-2 px-1">Finished</div><div className="grid gap-4 md:grid-cols-2">{past.map((c) => <MissionCard key={c.id} c={c} />)}</div></div>}
    </div>
  );
}

const SCOPE_LABEL: Record<Challenge["scope"], string> = { solo: "Race", team: "Team mission", squad: "Shared target" };

function MissionCard({ c }: { c: Challenge }) {
  const { s, me, act } = useGame();
  const t = today();
  const creator = useMember(c.createdBy);
  const joined = c.participants.includes(me);
  const prog = (p: string) => challengeProgress(s, c.id, p);
  const total = c.participants.reduce((a, p) => a + prog(p), 0);
  const mine = prog(me);
  const done = c.scope === "solo" ? c.completedBy.includes(me) : c.completedBy.length > 0;
  const ended = c.endsOn < t;
  const color = DIM[c.dim].color;
  const together = c.participants.length > 1;
  return (
    <Card className={cn("flex flex-col p-5", ended && !done && "opacity-70", done && "electric electric-gold")}>
      <div className="flex items-start gap-3">
        <QuestGlyph icon={c.icon} dim={c.dim} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-semibold leading-snug tracking-tight">{c.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            <AreaTag dim={c.dim} />
            <span>· {done ? "Complete" : ended ? "Ended" : timeLeft(c.endsOn)}</span>
            {together && <span className="inline-flex items-center gap-1">· <Users className="h-3 w-3" />{SCOPE_LABEL[c.scope]}</span>}
          </div>
        </div>
        <AuraChip value={c.xp} />
      </div>
      {c.desc && <p className="mt-3 text-[14px] text-muted-foreground">{c.desc}</p>}
      <div className="mt-4 flex-1 space-y-2">
        {c.scope === "squad" ? (
          <>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Together</span><span className="font-medium tabular-nums">{total.toLocaleString("en-IN")} / {c.target.toLocaleString("en-IN")} {c.unit}</span></div>
            <Progress value={(total / c.target) * 100} color={color} className="h-2" />
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[12px] text-muted-foreground">{c.participants.map((p) => <span key={p} className="inline-flex items-center gap-1.5"><Avatar id={p} size={18} frame={false} /><Name id={p} />: {prog(p)}</span>)}</div>
          </>
        ) : c.participants.map((p) => {
          const v = prog(p);
          const hit = v >= c.target;
          return (
            <div key={p} className="flex items-center gap-2.5">
              <Avatar id={p} size={24} frame={false} />
              <Progress value={(v / c.target) * 100} className="h-2 flex-1" color={p === me ? color : `${color}88`} />
              <span className={cn("w-16 text-right text-[12px] tabular-nums text-muted-foreground", p === me && "font-semibold text-foreground", hit && "text-success")}>{hit ? "Done" : `${v}/${c.target}`}</span>
            </div>
          );
        })}
        {c.track === "quests" && <p className="pt-1 text-[12px] text-muted-foreground">Counts each completed {DIM[c.dim].short} quest automatically.</p>}
      </div>
      <div className="mt-5 flex items-center gap-2">
        {!joined ? (
          <Button variant="tinted" className="w-full" disabled={ended || (c.scope !== "solo" && c.completedBy.length > 0)} onClick={() => act({ t: "chJoin", id: c.id })}><Plus />Join {creator.name}&apos;s mission</Button>
        ) : done ? (
          <div className="w-full rounded-full bg-accent/10 py-2.5 text-center text-[14px] font-medium text-accent">Complete · +{c.xp} Aura Points{together && c.scope !== "solo" ? " each" : ""}</div>
        ) : ended ? (
          <div className="w-full rounded-full bg-secondary py-2.5 text-center text-[14px] text-muted-foreground">This mission has ended</div>
        ) : c.track === "manual" ? (
          <>
            {mine > 0 && <Button variant="secondary" size="icon" aria-label="Take one back" onClick={() => act({ t: "chLog", id: c.id, amount: -1 })}><Minus /></Button>}
            <Button className="flex-1" onClick={() => act({ t: "chLog", id: c.id, amount: 1 })} aria-label={`Add 1 to ${c.title}`}><Plus />Add 1</Button>
          </>
        ) : (
          <div className="w-full rounded-full bg-secondary/70 py-2.5 text-center text-[13px] text-muted-foreground">Complete {DIM[c.dim].short} quests to add progress</div>
        )}
        {c.createdBy === me && c.completedBy.length === 0 && <DeleteButton onConfirm={() => act({ t: "chDel", id: c.id })} />}
      </div>
      {joined && c.createdBy !== me && !done && !ended && <button className="mt-3 inline-flex items-center gap-1 self-start text-[12px] text-muted-foreground hover:text-foreground" onClick={() => act({ t: "chLeave", id: c.id })}><LogOut className="h-3.5 w-3.5" />Leave</button>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* together                                                            */
/* ------------------------------------------------------------------ */
function Together() {
  const { s, openSheet } = useGame();
  const t = today();
  if (s.members.length < 2) return <NeedCousins what="Meetups and memories" />;
  const sorted = [...s.meetups].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const thisMonth = s.meetups.filter((m) => m.date >= monthStart(t)).length;
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Meetups" value={s.meetups.length} sub="since you started" />
        <Stat label="Days since last" value={last ? daysBetween(last.date, t) : "–"} sub={last ? last.place : "Plan one"} />
        <Stat label="This month" value={thisMonth} sub="Two a month is a good rhythm" />
      </div>
      {s.meetups.length === 0 ? (
        <Card>
          <EmptyState title="No meetups yet" body="When you get together, record it here. Everyone who came earns Aura Points, and more when the whole squad is there."
            action={<Button onClick={() => openSheet({ kind: "meetup" })}><Plus />Record a meetup</Button>} />
          <div className="px-5 pb-6">
            <div className="eyebrow mb-2 px-1">Ideas for next time</div>
            <List>{HANGOUT_IDEAS.map((i) => <div key={i.title} className="px-4 py-3"><div className="text-[15px]">{i.title}</div><div className="text-[13px] text-muted-foreground">{i.desc}</div></div>)}</List>
          </div>
        </Card>
      ) : (
        <>
          {s.memories.length > 0 && (
            <Section title="Memories">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{s.memories.map((m) => <MemoryCard key={m.id} id={m.id} />)}</div>
            </Section>
          )}
          <Section title="Timeline">
            <List>
              {sorted.map((m) => (
                <div key={m.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium">{m.kind}</div>
                      <div className="flex items-center gap-1 text-[13px] text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{m.place} · {fmtShort(m.date)}</div>
                    </div>
                    <AuraChip value={m.xpEach} />
                  </div>
                  <div className="mt-2 flex -space-x-1.5">{m.attendees.map((a) => <Avatar key={a} id={a} size={26} frame={false} className="ring-2 ring-card" />)}</div>
                  {m.note && <p className="mt-2 text-[14px] text-muted-foreground">&ldquo;{m.note}&rdquo;</p>}
                </div>
              ))}
            </List>
          </Section>
        </>
      )}
    </div>
  );
}

function MemoryCard({ id }: { id: string }) {
  const { s, me, act } = useGame();
  const m = s.memories.find((x) => x.id === id)!;
  const by = useMember(m.by);
  const cheered = m.cheers.includes(me);
  const Icon = QUEST_ICON[m.icon ?? "sun"] ?? QUEST_ICON.sun;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
        <span className="text-[12px] text-muted-foreground">{fmtShort(m.date)}</span>
      </div>
      <div className="mt-3 font-display text-[16px] font-semibold tracking-tight">{m.title}</div>
      <p className="mt-1 flex-1 text-[14px] text-muted-foreground">{m.caption}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><AvatarView member={by} size={20} frame={false} />{by.name}</span>
        <button onClick={() => act({ t: "cheer", id: m.id })} aria-pressed={cheered} aria-label="Cheer"
          className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] transition", cheered ? "bg-[#EF6C82]/15 text-[#EF6C82]" : "bg-secondary text-muted-foreground hover:text-[#EF6C82]")}>
          <Heart className={cn("h-3.5 w-3.5", cheered && "fill-current")} />{m.cheers.length}
        </button>
      </div>
    </Card>
  );
}

