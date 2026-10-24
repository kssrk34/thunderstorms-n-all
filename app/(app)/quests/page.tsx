"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, ChevronDown, EyeOff, Minus, Pencil, Plus, RotateCcw } from "lucide-react";
import { ClearSkyArt, SummitArt } from "@/components/brand";
import { AreaIcon, AreaTag, AuraChip, AvatarView, CheckCircle, DeleteButton, EmptyState, PageHeader, QuestGlyph, Section, SuggestionChip } from "@/components/game";
import { Button } from "@/components/ui/button";
import { ShareButton, SharedHub, scheduleLabel } from "@/components/share";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { challengeProgress } from "@/lib/balance";
import { DIM, GOAL_SUGGESTIONS, QUEST_SUGGESTIONS } from "@/lib/catalog";
import { habitStreak, habitsFor, timeLeft } from "@/lib/engine";
import { habitDone, isDue } from "@/lib/ledger";
import { isLive, pendingInvites } from "@/lib/shared";
import { useGame } from "@/lib/store";
import type { GameState, Goal, Habit, Todo } from "@/lib/types";
import { addDays, cn, daysBetween, fmtDay, fmtShort, plural, today } from "@/lib/utils";

type Tab = "today" | "habits" | "once" | "shared" | "goals";
const TABS: Tab[] = ["today", "habits", "once", "shared", "goals"];
const schedule = (h: Habit) => scheduleLabel(h.days);

function QuestsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "today";
  const { s, me, openSheet } = useGame();
  const invites = pendingInvites(s, me).length;
  const setTab = (v: string) => router.replace(v === "today" ? "/quests" : `/quests?tab=${v}`, { scroll: false });
  return (
    <div>
      <PageHeader title="My Quests" subtitle="Small actions. Massive outcomes. Your habits, quests and goals, and the ones you share with cousins."
        action={<Button size="sm" onClick={() => openSheet(tab === "goals" ? { kind: "goal" } : { kind: "quest", preset: { kind: tab === "once" ? "once" : "daily", invite: tab === "shared" } })}><Plus />New</Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-scrollbar flex w-full overflow-x-auto sm:inline-flex sm:w-auto">
          <TabsTrigger value="today">Today</TabsTrigger><TabsTrigger value="habits">Habits</TabsTrigger><TabsTrigger value="once">One-time</TabsTrigger>
          <TabsTrigger value="shared" className="inline-flex items-center justify-center gap-1.5">Shared{invites > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground" aria-label={`${invites} invitations`}>{invites}</span>}</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="today"><Today /></TabsContent>
        <TabsContent value="habits"><Habits /></TabsContent>
        <TabsContent value="once"><OneTime /></TabsContent>
        <TabsContent value="shared"><SharedHub focus={params.get("q")} /></TabsContent>
        <TabsContent value="goals"><Goals /></TabsContent>
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
      {QUEST_SUGGESTIONS.filter((x) => x.kind === kind).slice(0, 8).map((x) => (
        <SuggestionChip key={x.title} onClick={() => openSheet({ kind: "quest", preset: { kind, title: x.title, dim: x.dim, icon: x.icon, xp: x.xp } })}>{x.title}</SuggestionChip>
      ))}
    </div>
  );
}

/** Removing a shared copy leaves it (or, for the organiser, ends it for everyone); the button says which. */
function sharedLabel(s: GameState, me: string, shareId: string | undefined, plain: string) {
  const sq = shareId ? s.shares.find((x) => x.id === shareId) : undefined;
  if (!sq || !isLive(sq) || sq.members[me]?.status !== "accepted") return plain;
  return sq.createdBy === me ? "End for all" : "Leave";
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground/70 transition hover:bg-secondary hover:text-foreground">
      <Pencil className="h-4 w-4" />
    </button>
  );
}

function HabitRow({ h, week }: { h: Habit; week?: string[] }) {
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const done = habitDone(s, me, h.id, t);
  const due = isDue(h, t);
  const st = habitStreak(s, me, h);
  const goal = s.goals.find((g) => g.id === h.goalId)?.title;
  return (
    <div className="flex min-h-[66px] items-center gap-3 px-3 py-2.5 sm:px-4">
      <CheckCircle done={done} onClick={() => act({ t: "habit", habitId: h.id })} label={`${done ? "Undo" : "Complete"} ${h.title}`} color={DIM[h.dim].color} />
      <QuestGlyph icon={h.icon} dim={h.dim} />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 truncate text-[15px] font-medium", done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
          <span className="truncate">{h.title}</span>{h.private && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Private" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          <AreaTag dim={h.dim} dim2={h.dim2} />
          <span>· {due ? schedule(h) : `Not due today · ${schedule(h)}`}</span>
          {st > 1 && <span>· {st}-day streak</span>}
          {goal && <span className="truncate">· {goal}</span>}
        </div>
      </div>
      {week && (
        <div className="hidden items-center gap-1 md:flex" aria-label="Last 7 days">
          {week.map((d) => {
            const on = habitDone(s, me, h.id, d);
            const sched = isDue(h, d);
            return <span key={d} title={`${fmtDay(d)} ${fmtShort(d)}${on ? ": done" : sched ? "" : ": not scheduled"}`} className={cn("h-2.5 w-2.5 rounded-full", !on && (sched ? "bg-secondary" : "border border-border"))} style={on ? { background: DIM[h.dim].color, boxShadow: `0 0 6px ${DIM[h.dim].color}` } : undefined} />;
          })}
        </div>
      )}
      <AuraChip value={h.xp} className="w-11 justify-end" />
      <ShareButton type="habit" item={h} />
      <EditButton label={`Edit ${h.title}`} onClick={() => openSheet({ kind: "quest", preset: { edit: { type: "habit", id: h.id } } })} />
      <DeleteButton onConfirm={() => act({ t: "habitRemove", habitId: h.id })} label={sharedLabel(s, me, h.shareId, "Retire")} />
    </div>
  );
}

function TodoRow({ x }: { x: Todo }) {
  const { s, me, act, openSheet } = useGame();
  return (
    <div className="flex min-h-[62px] items-center gap-3 px-3 py-2.5 sm:px-4">
      <CheckCircle done={x.done} onClick={() => act({ t: "todo", id: x.id })} label={`${x.done ? "Undo" : "Complete"} ${x.title}`} color={DIM[x.dim].color} />
      <QuestGlyph icon={x.icon} dim={x.dim} />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 text-[15px] font-medium", x.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
          <span className="truncate">{x.title}</span>{x.private && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Private" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          <AreaTag dim={x.dim} dim2={x.dim2} />
          <span>· {x.done && x.doneOn ? `Done ${fmtShort(x.doneOn)}` : `Added ${fmtShort(x.created)}`}</span>
        </div>
      </div>
      <AuraChip value={x.xp} />
      <ShareButton type="todo" item={x} />
      <EditButton label={`Edit ${x.title}`} onClick={() => openSheet({ kind: "quest", preset: { edit: { type: "todo", id: x.id } } })} />
      <DeleteButton onConfirm={() => act({ t: "todoDel", id: x.id })} label={sharedLabel(s, me, x.shareId, "Delete")} />
    </div>
  );
}

function Today() {
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const due = habitsFor(s, me).filter((h) => isDue(h, t));
  const todos = s.todos.filter((x) => x.userId === me && (!x.done || x.doneOn === t));
  const live = s.challenges.filter((c) => c.participants.includes(me) && c.endsOn >= t);
  if (!due.length && !todos.length && !live.length) {
    return (
      <Card>
        <EmptyState art={<ClearSkyArt />} title="Nothing planned for today" body="Add a daily quest for something you want to do regularly, or a one-time quest for a single task."
          action={<><Button onClick={() => openSheet({ kind: "quest", preset: { kind: "daily" } })}><Plus />Daily quest</Button><Button variant="secondary" onClick={() => openSheet({ kind: "quest", preset: { kind: "once" } })}>One-time quest</Button></>} />
        <div className="px-6 pb-8"><p className="mb-3 text-center text-[13px] text-muted-foreground">Or start from an idea</p><Ideas kind="daily" /></div>
      </Card>
    );
  }
  return (
    <div className="space-y-8">
      {due.length > 0 && <div><div className="eyebrow mb-2 px-1">Daily · {due.filter((h) => habitDone(s, me, h.id, t)).length} of {due.length} done</div><List>{due.map((h) => <HabitRow key={h.id} h={h} />)}</List></div>}
      {todos.length > 0 && <div><div className="eyebrow mb-2 px-1">One-time</div><List>{todos.map((x) => <TodoRow key={x.id} x={x} />)}</List></div>}
      {live.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1"><span className="eyebrow">Challenges you&apos;re in</span><Link href="/arena?tab=missions" className="text-[13px] text-primary hover:opacity-80">All missions</Link></div>
          <List>
            {live.map((c) => {
              const mine = challengeProgress(s, c.id, me);
              const value = c.scope === "squad" ? c.participants.reduce((a, p) => a + challengeProgress(s, c.id, p), 0) : mine;
              const done = c.completedBy.includes(me);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <QuestGlyph icon={c.icon} dim={c.dim} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-medium">{c.title}</span><span className="shrink-0 text-[12px] text-muted-foreground">{done ? "Complete" : timeLeft(c.endsOn)}</span></div>
                    <Progress value={(value / c.target) * 100} className="mt-1.5" color={DIM[c.dim].color} />
                    <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{value} of {c.target} {c.unit}{c.track === "quests" ? ` · counts completed ${DIM[c.dim].short} quests` : ""}</div>
                  </div>
                  {c.track === "manual" && !done && (
                    <div className="flex items-center gap-1">
                      {mine > 0 && <Button size="icon-sm" variant="secondary" aria-label="Take one back" onClick={() => act({ t: "chLog", id: c.id, amount: -1 })}><Minus /></Button>}
                      <Button size="icon-sm" aria-label={`Add one ${c.unit}`} onClick={() => act({ t: "chLog", id: c.id, amount: 1 })}><Plus /></Button>
                    </div>
                  )}
                </div>
              );
            })}
          </List>
        </div>
      )}
    </div>
  );
}

function Habits() {
  const { s, me, openSheet } = useGame();
  const [showRetired, setShowRetired] = useState(false);
  const t = today();
  const habits = habitsFor(s, me);
  // retired habits, and shared habits whose end date has passed
  const retired = s.habits.filter((h) => h.userId === me && (h.archivedOn || (h.endsOn && h.endsOn < t)));
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  if (!habits.length && !retired.length) {
    return (
      <Card>
        <EmptyState art={<ClearSkyArt />} title="No habits yet" body="Habits repeat on the days you choose. Pick something small enough that you'll actually do it."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "daily" } })}><Plus />New habit</Button>} />
        <div className="px-6 pb-8"><p className="mb-3 text-center text-[13px] text-muted-foreground">Or start from an idea</p><Ideas kind="daily" /></div>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {habits.length ? <List>{habits.map((h) => <HabitRow key={h.id} h={h} week={week} />)}</List> : <Card><EmptyState title="No active habits" body="Start a new one, or bring back a retired one below." /></Card>}
      <p className="px-1 text-[12px] text-muted-foreground">Retiring a habit stops it from today. Its history still counts toward your Life Balance, so nothing you did is lost.</p>
      {retired.length > 0 && (
        <div>
          <button onClick={() => setShowRetired(!showRetired)} className="mb-2 flex items-center gap-1 px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground" aria-expanded={showRetired}>
            Retired ({retired.length}) <ChevronDown className={cn("h-4 w-4 transition-transform", showRetired && "rotate-180")} />
          </button>
          {showRetired && (
            <List className="motion-safe:animate-fade-up">
              {retired.map((h) => (
                <div key={h.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
                  <QuestGlyph icon={h.icon} dim={h.dim} size={30} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[15px] text-muted-foreground">{h.title}</div><div className="text-[12px] text-muted-foreground">{h.archivedOn ? `Retired ${fmtShort(h.archivedOn)}` : `Finished ${fmtShort(h.endsOn!)}`}</div></div>
                  <Button size="sm" variant="ghost" onClick={() => openSheet({ kind: "quest", preset: { kind: "daily", title: h.title, dim: h.dim, icon: h.icon, xp: h.xp } })}><RotateCcw />Start again</Button>
                </div>
              ))}
            </List>
          )}
        </div>
      )}
    </div>
  );
}

function OneTime() {
  const { s, me, openSheet } = useGame();
  const [showDone, setShowDone] = useState(false);
  const mine = s.todos.filter((x) => x.userId === me);
  const open = mine.filter((x) => !x.done);
  const done = mine.filter((x) => x.done).reverse();
  if (!mine.length) {
    return (
      <Card>
        <EmptyState art={<ClearSkyArt />} title="Nothing on the list" body="One-time quests are things you do once: book the appointment, finish the course, set up the budget."
          action={<Button onClick={() => openSheet({ kind: "quest", preset: { kind: "once" } })}><Plus />New one-time quest</Button>} />
        <div className="px-6 pb-8"><p className="mb-3 text-center text-[13px] text-muted-foreground">Or start from an idea</p><Ideas kind="once" /></div>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {open.length ? <List>{open.map((x) => <TodoRow key={x.id} x={x} />)}</List> : <Card><EmptyState title="All done" body="Every one-time quest is checked off. Clear skies." /></Card>}
      <p className="px-1 text-[12px] text-muted-foreground">An open one-time quest counts as missed in Life Balance once it&apos;s been waiting a week. Delete ones you&apos;ve decided against.</p>
      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(!showDone)} className="mb-2 flex items-center gap-1 px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground" aria-expanded={showDone}>
            Completed ({done.length}) <ChevronDown className={cn("h-4 w-4 transition-transform", showDone && "rotate-180")} />
          </button>
          {showDone && <List className="motion-safe:animate-fade-up">{done.map((x) => <TodoRow key={x.id} x={x} />)}</List>}
        </div>
      )}
    </div>
  );
}

/* ---------- goals ---------- */
function Goals() {
  const { s, me, openSheet } = useGame();
  const mine = s.goals.filter((g) => g.userId === me);
  const active = mine.filter((g) => !g.done);
  const achieved = mine.filter((g) => g.done);
  const others = s.goals.filter((g) => g.userId !== me && !g.done).slice(0, 8);
  return (
    <div className="space-y-10">
      {active.length === 0 ? (
        <Card>
          <EmptyState art={<SummitArt />} title="What would you love to achieve?" body={achieved.length ? "Every goal is achieved. Time to dream a little bigger." : "Goals give your quests a direction. Link quests to a goal when you create them."}
            action={<Button onClick={() => openSheet({ kind: "goal" })}><Plus />Add a goal</Button>} />
          <div className="flex flex-wrap justify-center gap-2 px-6 pb-8">
            {GOAL_SUGGESTIONS.map((g) => <SuggestionChip key={g.title} onClick={() => openSheet({ kind: "goal", preset: g })}>{g.title}</SuggestionChip>)}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{active.map((g) => <GoalCard key={g.id} g={g} />)}</div>
      )}
      {achieved.length > 0 && (
        <Section title="Achieved">
          <List>{achieved.map((g) => <AchievedRow key={g.id} g={g} />)}</List>
        </Section>
      )}
      {others.length > 0 && (
        <Section title="Your cousins are working on">
          <List>{others.map((g) => <CousinGoal key={g.id} g={g} />)}</List>
        </Section>
      )}
    </div>
  );
}

function GoalCard({ g }: { g: Goal }) {
  const { s, act, openSheet } = useGame();
  const t = today();
  const linked = s.habits.filter((h) => h.goalId === g.id && !h.archivedOn).length + s.todos.filter((x) => x.goalId === g.id && !x.done).length;
  const step = g.unit === "₹" ? 1000 : (g.target ?? 0) >= 100 ? Math.round((g.target ?? 0) / 20) : 1;
  const color = DIM[g.dim].color;
  const left = g.due ? daysBetween(t, g.due) : null;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <AreaIcon dim={g.dim} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-display text-[17px] font-semibold leading-snug tracking-tight">{g.title}{g.private && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Private" />}</div>
          {g.why && <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{g.why}</p>}
        </div>
        <EditButton label={`Edit ${g.title}`} onClick={() => openSheet({ kind: "goal", preset: { edit: g.id } })} />
        <DeleteButton onConfirm={() => act({ t: "goalDel", id: g.id })} />
      </div>
      <div className="mt-5 flex-1">
        {g.target ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">{g.current.toLocaleString("en-IN")}</span>
              <span className="text-[15px] text-muted-foreground">of {g.target.toLocaleString("en-IN")} {g.unit}</span>
            </div>
            <Progress value={(g.current / g.target) * 100} className="mt-3 h-2" color={color} />
          </>
        ) : <p className="text-[14px] text-muted-foreground">Mark it achieved when you get there. Add quests to move it forward.</p>}
      </div>
      <div className="mt-5 flex items-center gap-2">
        {g.target ? (
          <>
            <Button variant="secondary" size="icon" aria-label={`Remove ${step}`} disabled={g.current <= 0} onClick={() => act({ t: "goalStep", id: g.id, amount: -step })}><Minus /></Button>
            <Button className="flex-1" onClick={() => act({ t: "goalStep", id: g.id, amount: step })}><Plus />{step.toLocaleString("en-IN")} {g.unit}</Button>
          </>
        ) : <Button variant="tinted" className="flex-1" onClick={() => act({ t: "goalToggle", id: g.id })}><Check />Mark achieved</Button>}
        <Button variant="ghost" size="icon" aria-label="Add a quest for this goal" title="Add a quest for this goal" onClick={() => openSheet({ kind: "quest", preset: { goalId: g.id, dim: g.dim } })}><Plus /></Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
        <AreaTag dim={g.dim} />
        {left !== null && <span>{left >= 0 ? `${plural(left, "day")} left` : `Was due ${fmtShort(g.due!)}`}</span>}
        <span>{linked ? `${linked} ${linked === 1 ? "quest" : "quests"} supporting it` : "No quests yet"}</span>
        {g.target && <span>Progress earns Aura only for new ground</span>}
      </div>
    </Card>
  );
}

function AchievedRow({ g }: { g: Goal }) {
  const { act } = useGame();
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/.5)]"><Check className="h-4 w-4" strokeWidth={3} /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px]">{g.title}</div>
        <div className="text-[12px] text-muted-foreground">{g.doneOn ? `Achieved ${fmtShort(g.doneOn)}` : "Achieved"}</div>
      </div>
      {!g.target && <Button variant="ghost" size="sm" onClick={() => act({ t: "goalToggle", id: g.id })}>Undo</Button>}
    </div>
  );
}

function CousinGoal({ g }: { g: Goal }) {
  const { s } = useGame();
  const m = s.members.find((x) => x.id === g.userId);
  if (!m) return null;
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
      <AvatarView member={m} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px]">{g.title}</div>
        <div className="text-[12px] text-muted-foreground">{m.name}{g.target ? ` · ${Math.round((g.current / g.target) * 100)}%` : ""}</div>
      </div>
      <AreaTag dim={g.dim} />
    </div>
  );
}
