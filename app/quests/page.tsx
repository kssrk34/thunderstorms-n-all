"use client";

import { useState } from "react";
import { Check, Plus, Sparkles, Users, User } from "lucide-react";
import { Avatar, DimChip, Empty, PageHeader } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COUSIN, COUSINS, DIMS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { Challenge, DimId } from "@/lib/types";
import { cn, daysBetween, today } from "@/lib/utils";

type Draft = Omit<Challenge, "id" | "progress" | "completedBy" | "createdBy" | "endsOn">;
const TEMPLATES: Draft[] = [
  { title: "Code Every Day", desc: "Push code or solve a problem every day this week.", emoji: "💻", period: "weekly", scope: "solo", dim: "career", xp: 100, target: 7, unit: "days", participants: [] },
  { title: "MBA Study Sprint", desc: "Clock 10 focused study hours this week.", emoji: "🎓", period: "weekly", scope: "solo", dim: "mind", xp: 100, target: 10, unit: "hours", participants: [] },
  { title: "10K Steps Club", desc: "Hit 10,000 steps on 20 days this month.", emoji: "👟", period: "monthly", scope: "solo", dim: "health", xp: 160, target: 20, unit: "days", participants: [] },
  { title: "No-Junk Weekend", desc: "Home food only, Saturday + Sunday. Treats with family allowed!", emoji: "🥗", period: "weekly", scope: "solo", dim: "health", xp: 60, target: 2, unit: "days", participants: [] },
  { title: "Squad Reading Marathon", desc: "Read 500 pages together this month.", emoji: "📚", period: "monthly", scope: "squad", dim: "mind", xp: 150, target: 500, unit: "pages", participants: [] },
  { title: "Call Grandparents Week", desc: "Every cousin calls Ammamma / Nannamma / Paati at least once.", emoji: "📞", period: "weekly", scope: "squad", dim: "family", xp: 60, target: 5, unit: "calls", participants: [] },
  { title: "Morning Surya Namaskar", desc: "12 rounds before 8am, every day.", emoji: "🌅", period: "daily", scope: "solo", dim: "health", xp: 25, target: 12, unit: "rounds", participants: [] },
  { title: "Squad Savings Pot", desc: "Save ₹25,000 collectively this month for the Goa/Gokarna trip.", emoji: "🏖️", period: "monthly", scope: "squad", dim: "money", xp: 200, target: 25000, unit: "₹", participants: [] },
];
const EMOJIS = ["⚡", "🧩", "🏃", "📚", "🥗", "💧", "🎓", "💻", "🧘", "🏸", "🪙", "🎨", "🏕️", "🤝", "🔥", "🌱"];

export default function Quests() {
  const { s, me, act } = useGame();
  const t = today();
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(TEMPLATES[0]);

  const list = s.challenges.filter((c) => {
    if (tab === "mine") return c.participants.includes(me);
    if (tab === "squad") return c.scope === "squad";
    if (["daily", "weekly", "monthly"].includes(tab)) return c.period === tab;
    return true;
  });

  const startFrom = (tpl: Draft) => { setDraft({ ...tpl, participants: [] }); setOpen(true); };

  return (
    <div>
      <PageHeader emoji="⚔️" title="Challenges & Quests" subtitle="Solo quests for personal glory, squad missions to win together."
        action={<Button onClick={() => startFrom({ ...TEMPLATES[0], title: "", desc: "" })}><Plus /> New challenge</Button>} />

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-volt" /> Quick-start templates</div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {TEMPLATES.map((tp) => (
            <button key={tp.title} onClick={() => startFrom(tp)} className="glass flex w-48 shrink-0 flex-col gap-1 rounded-2xl p-3 text-left transition hover:-translate-y-0.5 hover:border-sky-400/40">
              <span className="text-2xl">{tp.emoji}</span>
              <span className="text-sm font-semibold">{tp.title}</span>
              <span className="text-[11px] text-muted-foreground">{tp.scope === "squad" ? "🤝 Squad" : "👤 Solo"} · {tp.period} · +{tp.xp} XP</span>
            </button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {["all", "mine", "daily", "weekly", "monthly", "squad"].map((x) => <TabsTrigger key={x} value={x} className="capitalize">{x === "mine" ? "Joined" : x}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {list.length === 0 && <Empty emoji="🌤️" text="No quests here yet. Start one from a template!" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => <ChallengeCard key={c.id} c={c} me={me} t={t} act={act} />)}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a challenge</DialogTitle>
            <DialogDescription>Make it specific, achievable and a little bit fun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setDraft({ ...draft, emoji: e })} className={cn("grid h-9 w-9 place-items-center rounded-lg text-lg", draft.emoji === e ? "bg-yellow-400/20 ring-1 ring-volt" : "bg-white/5")}>{e}</button>
              ))}
            </div>
            <input className="input-base" placeholder="Title, e.g. Weekend Trek Prep" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea className="input-base min-h-[70px]" placeholder="What counts? Keep it clear." value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Type
                <select className="input-base mt-1" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as Draft["scope"] })}>
                  <option value="solo">👤 Solo (everyone races)</option><option value="squad">🤝 Squad (shared total)</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">Duration
                <select className="input-base mt-1" value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value as Draft["period"] })}>
                  <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">Target
                <input type="number" min={1} className="input-base mt-1" value={draft.target} onChange={(e) => setDraft({ ...draft, target: Math.max(1, +e.target.value) })} />
              </label>
              <label className="text-xs text-muted-foreground">Unit
                <input className="input-base mt-1" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Life area
                <select className="input-base mt-1" value={draft.dim} onChange={(e) => setDraft({ ...draft, dim: e.target.value as DimId })}>
                  {DIMS.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">Reward (XP)
                <input type="number" min={10} max={300} className="input-base mt-1" value={draft.xp} onChange={(e) => setDraft({ ...draft, xp: Math.min(300, Math.max(10, +e.target.value)) })} />
              </label>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">Invite cousins</div>
              <div className="flex flex-wrap gap-2">
                {COUSINS.filter((c) => c.id !== me).map((c) => {
                  const on = draft.participants.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setDraft({ ...draft, participants: on ? draft.participants.filter((x) => x !== c.id) : [...draft.participants, c.id] })}
                      className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs", on ? "border-sky-400/60 bg-sky-500/15" : "border-white/10 bg-white/5")}>
                      <Avatar id={c.id} size={22} ring={false} /> {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button className="w-full" disabled={!draft.title.trim()} onClick={() => { act({ t: "chCreate", ch: draft }); setOpen(false); setTab("mine"); }}>
              <Sparkles /> Launch challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChallengeCard({ c, me, t, act }: { c: Challenge; me: string; t: string; act: ReturnType<typeof useGame>["act"] }) {
  const { toast } = useGame();
  const joined = c.participants.includes(me);
  const total = Object.values(c.progress).reduce((a, b) => a + b, 0);
  const mine = c.progress[me] ?? 0;
  const done = c.completedBy.includes(me);
  const ended = c.endsOn < t;
  const left = daysBetween(t, c.endsOn);
  const big = c.target >= 100;
  const step = big ? Math.max(1, Math.round(c.target / 50)) : 1;
  const [amt, setAmt] = useState(step);
  return (
    <Card className={cn("flex flex-col p-5", done && "border-emerald-400/30")}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-2xl ring-1 ring-white/10">{c.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold leading-tight">{c.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={cn("chip", c.scope === "squad" ? "text-pink-300" : "text-sky-300")}>{c.scope === "squad" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}{c.scope}</span>
            <span className="chip capitalize text-muted-foreground">{c.period}</span>
            <DimChip dim={c.dim} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-volt">+{c.xp}</div>
          <div className="text-[10px] text-muted-foreground">{ended ? "ended" : left === 0 ? "ends today" : `${left}d left`}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{c.desc}</p>

      <div className="mt-4 flex-1">
        {c.scope === "squad" ? (
          <>
            <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Squad progress</span><span className="font-semibold">{total.toLocaleString("en-IN")} / {c.target.toLocaleString("en-IN")} {c.unit}</span></div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
              {c.participants.map((p) => <div key={p} title={`${COUSIN[p].name}: ${c.progress[p] ?? 0}`} style={{ width: `${Math.min(100, ((c.progress[p] ?? 0) / c.target) * 100)}%`, background: COUSIN[p].color }} className="transition-all duration-700" />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {c.participants.map((p) => <span key={p} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COUSIN[p].color }} />{COUSIN[p].name} {c.progress[p] ?? 0}</span>)}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            {c.participants.map((p) => {
              const v = c.progress[p] ?? 0;
              return (
                <div key={p} className="flex items-center gap-2">
                  <Avatar id={p} size={22} ring={false} />
                  <Progress value={(v / c.target) * 100} className="h-2 flex-1" color={p === me ? undefined : COUSIN[p].color + "aa"} />
                  <span className={cn("w-12 text-right text-[11px] tabular-nums", p === me && "font-bold")}>{c.completedBy.includes(p) ? "✅" : `${v}/${c.target}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!joined ? (
          <Button variant="outline" className="w-full" disabled={ended} onClick={() => act({ t: "chJoin", id: c.id })}><Plus /> Join challenge</Button>
        ) : done && c.scope === "solo" ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400/10 py-2 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" /> Completed! +{c.xp} XP earned</div>
        ) : c.scope === "squad" && c.completedBy.length > 0 ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400/10 py-2 text-sm font-semibold text-emerald-300">🤝 Squad mission complete!</div>
        ) : (
          <>
            {big && <input type="number" min={1} className="input-base w-24" value={amt} onChange={(e) => setAmt(Math.max(1, +e.target.value))} />}
            <Button className="flex-1" disabled={ended} onClick={() => {
              const n = big ? amt : 1;
              act({ t: "chLog", id: c.id, amount: n });
              const now = c.scope === "solo" ? mine + n : total + n;
              if (now < c.target) toast(c.emoji, `${c.title}: ${now.toLocaleString("en-IN")}/${c.target.toLocaleString("en-IN")} ${c.unit}. Keep going!`, "info");
            }}>
              Log +{big ? amt.toLocaleString("en-IN") : 1} {c.unit}
            </Button>
            {mine > 0 && !big && <Button variant="ghost" size="sm" onClick={() => act({ t: "chLog", id: c.id, amount: -1 })}>Undo</Button>}
          </>
        )}
      </div>
    </Card>
  );
}
