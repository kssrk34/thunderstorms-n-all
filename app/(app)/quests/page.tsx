"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import { ClearSkyArt, StormArt } from "@/components/brand";
import { AreaTag, Avatar, AvatarView, CheckCircle, DeleteButton, EmptyState, PageHeader, SuggestionChip, Xp } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { List, ListHeader } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIM, QUEST_SUGGESTIONS } from "@/lib/catalog";
import { habitDone, habitStreak } from "@/lib/engine";
import { habitsFor } from "@/lib/reducer";
import { useGame, useMember } from "@/lib/store";
import type { Challenge } from "@/lib/types";
import { addDays, cn, daysBetween, fmtDay, fmtShort, plural, today } from "@/lib/utils";

type Tab = "daily" | "once" | "challenges";

function QuestsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (["daily", "once", "challenges"].includes(params.get("tab") ?? "") ? params.get("tab") : "daily") as Tab;
  const { openSheet } = useGame();
  const setTab = (v: string) => router.replace(v === "daily" ? "/quests" : `/quests?tab=${v}`, { scroll: false });

  return (
    <div>
      <PageHeader title="Quests" subtitle="Small, specific steps. Do them, check them off, watch them add up."
        action={<Button size="sm" onClick={() => openSheet({ kind: "quest", preset: { kind: tab === "challenges" ? "challenge" : tab } })}><Plus />New</Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full sm:inline-flex sm:w-auto">
          <TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="once">One-time</TabsTrigger><TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><Daily /></TabsContent>
        <TabsContent value="once"><OneTime /></TabsContent>
        <TabsContent value="challenges"><Challenges /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function Quests() {
  return <Suspense><QuestsInner /></Suspense>;
}

function Ideas({ kind }: { kind: "daily" | "once" }) {
  const { openSheet } = useGame();
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-2">
      {QUEST_SUGGESTIONS.filter((x) => x.kind === kind).map((x) => (
        <SuggestionChip key={x.title} onClick={() => openSheet({ kind: "quest", preset: { kind, title: x.title, dim: x.dim, emoji: x.emoji } })}>
          <span aria-hidden>{x.emoji}</span>{x.title}
        </SuggestionChip>
      ))}
    </div>
  );
}

function Daily() {
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const habits = habitsFor(s, me);
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const goalTitle = (id?: string) => s.goals.find((g) => g.id === id)?.title;
  if (!habits.length) {
    return (
      <Card>
        <EmptyState art={<ClearSkyArt />} title="No daily quests yet" body="Daily quests repeat every day. Pick something small enough that you'll actually do it."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "daily" } })}><Plus />New daily quest</Button>} />
        <div className="px-6 pb-8"><p className="mb-3 text-center text-[13px] text-muted-foreground">Or start from an idea</p><Ideas kind="daily" /></div>
      </Card>
    );
  }
  return (
    <List>
      {habits.map((h) => {
        const isDone = habitDone(s, me, h.id);
        const st = habitStreak(s, me, h.id);
        return (
          <div key={h.id} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
            <CheckCircle done={isDone} onClick={() => act({ t: "habit", habitId: h.id })} label={`${isDone ? "Undo" : "Complete"} ${h.title}`} color={DIM[h.dim].color} />
            <span className="text-[20px]" aria-hidden>{h.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px]">{h.title}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                <AreaTag dim={h.dim} />
                {st > 1 && <span>· {st}-day streak</span>}
                {goalTitle(h.goalId) && <span className="truncate">· {goalTitle(h.goalId)}</span>}
              </div>
            </div>
            <div className="hidden items-center gap-1 sm:flex" aria-label="Last 7 days">
              {week.map((d) => {
                const on = habitDone(s, me, h.id, d);
                return <span key={d} title={`${fmtDay(d)} ${fmtShort(d)}${on ? ": done" : ""}`} className={cn("h-2.5 w-2.5 rounded-full", !on && "bg-secondary")} style={on ? { background: DIM[h.dim].color } : undefined} />;
              })}
            </div>
            <Xp value={h.xp} className="w-10 justify-end" />
            <DeleteButton onConfirm={() => act({ t: "habitRemove", habitId: h.id })} label="Remove" />
          </div>
        );
      })}
    </List>
  );
}

function OneTime() {
  const { s, me, act, openSheet } = useGame();
  const [showDone, setShowDone] = useState(false);
  const mine = s.todos.filter((x) => x.userId === me);
  const open = mine.filter((x) => !x.done);
  const done = mine.filter((x) => x.done).reverse();
  if (!mine.length) {
    return (
      <Card>
        <EmptyState art={<ClearSkyArt />} title="Nothing on the list" body="One-time quests are things you do once: book the appointment, call the friend, set up the budget."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "once" } })}><Plus />New one-time quest</Button>} />
        <div className="px-6 pb-8"><p className="mb-3 text-center text-[13px] text-muted-foreground">Or start from an idea</p><Ideas kind="once" /></div>
      </Card>
    );
  }
  const row = (x: (typeof mine)[number]) => (
    <div key={x.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
      <CheckCircle done={x.done} onClick={() => act({ t: "todo", id: x.id })} label={`${x.done ? "Undo" : "Complete"} ${x.title}`} color={DIM[x.dim].color} />
      <span className="text-[20px]" aria-hidden>{x.emoji ?? "✨"}</span>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[16px]", x.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>{x.title}</div>
        <AreaTag dim={x.dim} />
      </div>
      <Xp value={x.xp} />
      <DeleteButton onConfirm={() => act({ t: "todoDel", id: x.id })} />
    </div>
  );
  return (
    <div className="space-y-6">
      {open.length ? <List>{open.map(row)}</List> : <Card><EmptyState title="All done" body="Every one-time quest is checked off. Clear skies." /></Card>}
      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(!showDone)} className="mb-2 flex items-center gap-1 px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground" aria-expanded={showDone}>
            Completed ({done.length}) <ChevronDown className={cn("h-4 w-4 transition-transform", showDone && "rotate-180")} />
          </button>
          {showDone && <List className="motion-safe:animate-fade-up">{done.map(row)}</List>}
        </div>
      )}
    </div>
  );
}

function Challenges() {
  const { s, me, openSheet } = useGame();
  const t = today();
  const live = s.challenges.filter((c) => c.endsOn >= t);
  const mine = live.filter((c) => c.participants.includes(me));
  const open = live.filter((c) => !c.participants.includes(me));
  const past = s.challenges.filter((c) => c.endsOn < t && c.participants.includes(me)).slice(0, 12);
  if (!mine.length && !open.length && !past.length) {
    return (
      <Card>
        <EmptyState art={<StormArt />} title="No challenges yet" body="A challenge is a target with a deadline, like moving every day this week. Go solo or bring your cousins."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "challenge" } })}><Plus />Start a challenge</Button>} />
      </Card>
    );
  }
  return (
    <div className="space-y-8">
      {mine.length > 0 && <div><ListHeader>Yours</ListHeader><div className="grid gap-4 md:grid-cols-2">{mine.map((c) => <ChallengeCard key={c.id} c={c} />)}</div></div>}
      {open.length > 0 && <div><ListHeader>From your cousins</ListHeader><div className="grid gap-4 md:grid-cols-2">{open.map((c) => <ChallengeCard key={c.id} c={c} />)}</div></div>}
      {past.length > 0 && <div><ListHeader>Finished</ListHeader><div className="grid gap-4 md:grid-cols-2">{past.map((c) => <ChallengeCard key={c.id} c={c} />)}</div></div>}
    </div>
  );
}

function ChallengeCard({ c }: { c: Challenge }) {
  const { me, act } = useGame();
  const t = today();
  const creator = useMember(c.createdBy);
  const joined = c.participants.includes(me);
  const total = Object.values(c.progress).reduce((a, b) => a + b, 0);
  const mine = c.progress[me] ?? 0;
  const done = c.scope === "solo" ? c.completedBy.includes(me) : c.completedBy.length > 0;
  const ended = c.endsOn < t;
  const left = daysBetween(t, c.endsOn);
  const big = c.target >= 50;
  const step = big ? Math.max(1, Math.round(c.target / 20)) : 1;
  const [amt, setAmt] = useState(step);
  const value = c.scope === "solo" ? mine : total;
  const color = DIM[c.dim].color;
  return (
    <Card className={cn("flex flex-col p-5", ended && !done && "opacity-70")}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[22px]" style={{ background: `${color}1f` }} aria-hidden>{c.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold leading-snug tracking-tight">{c.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            <AreaTag dim={c.dim} />
            <span>· {done ? "Completed" : ended ? "Ended" : left === 0 ? "Ends today" : `${plural(left, "day")} left`}</span>
            {c.scope === "squad" && <span className="inline-flex items-center gap-1">· <Users className="h-3 w-3" />Shared target</span>}
          </div>
        </div>
        <Xp value={c.xp} />
      </div>
      {c.desc && <p className="mt-3 text-[14px] text-muted-foreground">{c.desc}</p>}

      <div className="mt-4 flex-1 space-y-2">
        {c.scope === "squad" ? (
          <>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Together</span><span className="font-medium tabular-nums">{total.toLocaleString("en-IN")} / {c.target.toLocaleString("en-IN")} {c.unit}</span></div>
            <Progress value={(total / c.target) * 100} color={color} className="h-2" />
          </>
        ) : c.participants.map((p) => <SoloRow key={p} id={p} v={c.progress[p] ?? 0} c={c} me={me} />)}
        {c.participants.length > 1 && c.scope === "squad" && (
          <div className="flex -space-x-1.5 pt-1">{c.participants.map((p) => <Avatar key={p} id={p} size={24} className="ring-2 ring-card" />)}</div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {!joined ? (
          <Button variant="tinted" className="w-full" disabled={ended} onClick={() => act({ t: "chJoin", id: c.id })}><Plus />Join {creator.name}&apos;s challenge</Button>
        ) : done ? (
          <div className="w-full rounded-full bg-success/10 py-2.5 text-center text-[14px] font-medium text-success">Completed · +{c.xp} XP</div>
        ) : ended ? (
          <div className="w-full rounded-full bg-secondary py-2.5 text-center text-[14px] text-muted-foreground">This challenge has ended</div>
        ) : (
          <>
            {mine > 0 && <Button variant="secondary" size="icon" aria-label="Undo one" onClick={() => act({ t: "chLog", id: c.id, amount: -(big ? amt : 1) })}><Minus /></Button>}
            {big && <input type="number" min={1} inputMode="numeric" className="field w-24 text-center" value={amt} onChange={(e) => setAmt(Math.max(1, +e.target.value || 1))} aria-label="Amount" />}
            <Button className="flex-1" onClick={() => act({ t: "chLog", id: c.id, amount: big ? amt : 1 })}>
              <Plus />{big ? amt.toLocaleString("en-IN") : 1} {c.unit}
            </Button>
          </>
        )}
        {c.createdBy === me && !done && <DeleteButton onConfirm={() => act({ t: "chDel", id: c.id })} />}
      </div>
      {value > 0 && !done && !ended && <p className="mt-2 text-center text-[12px] text-muted-foreground">{Math.max(0, c.target - value).toLocaleString("en-IN")} {c.unit} to go</p>}
    </Card>
  );
}

function SoloRow({ id, v, c, me }: { id: string; v: number; c: Challenge; me: string }) {
  const m = useMember(id);
  return (
    <div className="flex items-center gap-2.5">
      <AvatarView member={m} size={24} />
      <Progress value={(v / c.target) * 100} className="h-2 flex-1" color={id === me ? DIM[c.dim].color : `${m.color}99`} />
      <span className={cn("w-16 text-right text-[12px] tabular-nums text-muted-foreground", id === me && "font-medium text-foreground")}>{c.completedBy.includes(id) ? "Done" : `${v}/${c.target}`}</span>
    </div>
  );
}
