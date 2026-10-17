"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Field } from "@/components/forms";
import { AvatarView, PageHeader, Ring, Section, Xp } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { DIM, LESSONS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import { cn, fmtShort, inr, monthStart, today } from "@/lib/utils";

const GOLD = DIM.money.color;
const SPLIT = [
  { label: "Needs", pct: 0.5, color: "#4C7DFF", desc: "Rent, groceries, EMIs, bills" },
  { label: "Wants", pct: 0.3, color: "#6D6AE8", desc: "Cafés, OTT, shopping, trips" },
  { label: "Save and invest", pct: 0.2, color: GOLD, desc: "SIP, RD, emergency fund" },
];

export default function Money() {
  const { s, me, act } = useGame();
  const ms = monthStart(today());
  const target = s.savingsTarget[me] ?? 10000;
  const mine = s.savings.filter((x) => x.userId === me);
  const month = mine.filter((x) => x.date >= ms).reduce((a, x) => a + x.amount, 0);
  const total = mine.reduce((a, x) => a + x.amount, 0);
  const learned = s.lessons[me] ?? [];
  const [amt, setAmt] = useState(500);
  const [note, setNote] = useState("");
  const [income, setIncome] = useState(60000);
  const [targetDraft, setTargetDraft] = useState(String(target));
  useEffect(() => setTargetDraft(String(target)), [target]);

  const race = s.members.map((m) => {
    const v = s.savings.filter((x) => x.userId === m.id && x.date >= ms).reduce((a, x) => a + x.amount, 0);
    return { m, pct: Math.round((v / (s.savingsTarget[m.id] ?? 10000)) * 100) };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-10">
      <PageHeader title="Money" subtitle="Small, boring, consistent moves. That's how freedom is built." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-5">
            <Ring value={month / target} size={104} stroke={11} color={GOLD}>
              <span className="text-[20px] font-semibold tabular-nums">{Math.round((month / target) * 100)}%</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-[13px] text-muted-foreground">Saved this month</div>
              <div className="text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{inr(month)}</div>
              <div className="text-[13px] text-muted-foreground">of {inr(target)} · {inr(total)} all time</div>
            </div>
          </div>
          <Field label="Monthly target">
            <input type="number" step={500} min={500} inputMode="numeric" className="field mt-1" value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={() => { const v = Math.max(500, +targetDraft || 0); if (v !== target) act({ t: "savingTarget", amount: v }); else setTargetDraft(String(target)); }} />
          </Field>
        </Card>

        <Card className="p-6">
          <div className="text-[17px] font-semibold tracking-tight">Log a save</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[200, 500, 1000, 2000, 5000].map((v) => (
              <button key={v} onClick={() => setAmt(v)} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-medium tabular-nums transition", amt === v ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70")}>{inr(v)}</button>
            ))}
          </div>
          <input type="number" min={1} inputMode="numeric" className="field mt-3" value={amt} onChange={(e) => setAmt(Math.max(1, +e.target.value || 1))} aria-label="Amount" />
          <input className="field mt-2" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="e.g. Cooked instead of ordering in" />
          <Button className="mt-3 w-full" onClick={() => { if (act({ t: "saving", amount: amt, note })) setNote(""); }}><Plus />Save {inr(amt)}</Button>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Savings race</CardTitle><CardDescription>Ranked by % of each person&apos;s own target, never by amount.</CardDescription></div></CardHeader>
          <div className="space-y-3.5 px-5 pb-5">
            {race.map(({ m, pct }) => (
              <div key={m.id} className="flex items-center gap-3">
                <AvatarView member={m} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[13px]"><span className="truncate">{m.id === me ? "You" : m.name}</span><span className="font-medium tabular-nums">{pct}%</span></div>
                  <Progress value={pct} className="mt-1" color={m.color} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>50 / 30 / 20 planner</CardTitle><CardDescription>A simple starting split for your take-home pay or stipend.</CardDescription></div></CardHeader>
          <div className="px-5 pb-5">
            <Field label="Monthly take-home"><input type="number" step={1000} inputMode="numeric" className="field" value={income} onChange={(e) => setIncome(Math.max(0, +e.target.value || 0))} /></Field>
            <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">{SPLIT.map((x) => <div key={x.label} style={{ width: `${x.pct * 100}%`, background: x.color }} />)}</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {SPLIT.map((x) => (
                <div key={x.label}>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: x.color }} />{x.label}</div>
                  <div className="mt-0.5 text-[17px] font-semibold tabular-nums">{inr(income * x.pct)}</div>
                  <div className="text-[11px] text-muted-foreground">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Money lessons</CardTitle><CardDescription>{learned.length} of {LESSONS.length} learned. 15 XP each.</CardDescription></div></CardHeader>
          <div className="divide-y divide-border/70 border-t border-border/70">
            {LESSONS.map((l) => {
              const done = learned.includes(l.id);
              return (
                <div key={l.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">{l.title}</div><div className="text-[13px] text-muted-foreground">{l.blurb}</div></div>
                  {done ? <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
                    : <Button size="sm" variant="tinted" onClick={() => act({ t: "lesson", id: l.id })}>Got it</Button>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Section title="Recent saves">
        {mine.length === 0 ? (
          <Card className="p-5 text-[15px] text-muted-foreground">No saves yet. Even ₹100 counts.</Card>
        ) : (
          <List>
            {mine.slice(0, 8).map((x) => (
              <div key={x.id} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><div className="truncate text-[15px]">{x.note || "Saved"}</div><div className="text-[12px] text-muted-foreground">{fmtShort(x.date)}</div></div>
                <span className="text-[15px] font-semibold tabular-nums">{inr(x.amount)}</span>
                <Xp value={Math.max(5, Math.min(30, Math.round(x.amount / 100)))} />
              </div>
            ))}
          </List>
        )}
      </Section>
    </div>
  );
}
