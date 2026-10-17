"use client";

import { Check, Minus, Plus } from "lucide-react";
import { SummitArt } from "@/components/brand";
import { AreaIcon, AreaTag, AvatarView, DeleteButton, EmptyState, PageHeader, Section, SuggestionChip } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { DIM, GOAL_SUGGESTIONS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { daysBetween, fmtShort, plural, today } from "@/lib/utils";

export default function Goals() {
  const { s, me, openSheet } = useGame();
  const mine = s.goals.filter((g) => g.userId === me);
  const active = mine.filter((g) => !g.done);
  const achieved = mine.filter((g) => g.done);
  const others = s.goals.filter((g) => g.userId !== me && !g.done).slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHeader title="Goals" subtitle="The bigger picture your quests build toward. Your cousins can see them, so they can cheer you on."
        action={<Button size="sm" onClick={() => openSheet({ kind: "goal" })}><Plus />New</Button>} />

      {active.length === 0 ? (
        <Card>
          <EmptyState art={<SummitArt />} title="What would you love to achieve?" body={achieved.length ? "Every goal is achieved. Time to dream a little bigger." : "Start with one thing that would make this year feel extraordinary."}
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
          <List>
            {achieved.map((g) => <AchievedRow key={g.id} g={g} />)}
          </List>
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
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const linked = s.habits.filter((h) => h.goalId === g.id).length + s.todos.filter((x) => x.goalId === g.id && !x.done).length;
  const step = g.unit === "₹" ? 1000 : (g.target ?? 0) >= 100 ? Math.round((g.target ?? 0) / 20) : 1;
  const color = DIM[g.dim].color;
  const left = g.due ? daysBetween(t, g.due) : null;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <AreaIcon dim={g.dim} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold leading-snug tracking-tight">{g.title}</div>
          {g.why && <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{g.why}</p>}
        </div>
        <DeleteButton onConfirm={() => act({ t: "goalDel", id: g.id })} />
      </div>

      <div className="mt-5 flex-1">
        {g.target ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{g.current.toLocaleString("en-IN")}</span>
              <span className="text-[15px] text-muted-foreground">of {g.target.toLocaleString("en-IN")} {g.unit}</span>
            </div>
            <Progress value={(g.current / g.target) * 100} className="mt-3 h-2" color={color} />
          </>
        ) : (
          <p className="text-[14px] text-muted-foreground">Mark it achieved when you get there. Add quests to move it forward.</p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {g.target ? (
          <>
            <Button variant="secondary" size="icon" aria-label={`Remove ${step}`} disabled={g.current <= 0} onClick={() => act({ t: "goalStep", id: g.id, amount: -step })}><Minus /></Button>
            <Button className="flex-1" onClick={() => act({ t: "goalStep", id: g.id, amount: step })}><Plus />{step.toLocaleString("en-IN")} {g.unit}</Button>
          </>
        ) : (
          <Button variant="tinted" className="flex-1" onClick={() => act({ t: "goalToggle", id: g.id })}><Check />Mark achieved</Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Add a quest for this goal" title="Add a quest for this goal" onClick={() => openSheet({ kind: "quest", preset: { goalId: g.id, dim: g.dim } })}><Plus /></Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
        <AreaTag dim={g.dim} />
        {left !== null && <span>{left >= 0 ? `${plural(left, "day")} left` : `Was due ${fmtShort(g.due!)}`}</span>}
        <span>{linked ? `${linked} ${linked === 1 ? "quest" : "quests"} supporting it` : "No quests yet"}</span>
      </div>
    </Card>
  );
}

function AchievedRow({ g }: { g: Goal }) {
  const { act } = useGame();
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px]">{g.title}</div>
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
