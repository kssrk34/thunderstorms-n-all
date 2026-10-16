"use client";

import { useState } from "react";
import { Lock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Avatar, PageHeader, useLevel } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AURAS, AVATARS, COUSIN, COUSINS, DIMS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { DimId } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const RULES = [
  ["⚡", "Positive reinforcement first", "Most XP comes from doing good things. Penalties are optional, small and capped."],
  ["🔁", "Habit formation", "Daily quests are small and repeatable. Streaks reward consistency, and a weekly rest day protects them."],
  ["🎁", "Variable rewards", "The daily Surprise Bolt adds a little dopamine-friendly unpredictability."],
  ["🌪️", "Balanced competition", "Underdog Surge gives whoever is last 1.25× XP. Savings are ranked by % of your own target, never by income."],
  ["🤝", "Cooperation over comparison", "Squad missions and the Thunder Meter make everyone win together."],
  ["💙", "No guilt", "Slip-ups earn an honesty bonus, your level never drops, and there's a daily cap on logs to prevent burnout."],
];

export default function SettingsPage() {
  const { s, me, act } = useGame();
  const L = useLevel(me);
  const av = s.avatars[me];
  const [newPen, setNewPen] = useState({ label: "", xp: 5, dim: "health" as DimId });
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader emoji="⚙️" title="Settings & Rules" subtitle="Tune the game so it feels motivating, never punishing." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Your avatar</CardTitle><CardDescription>Unlock new looks as you level up (you&apos;re Lv {L.level})</CardDescription></div><Avatar id={me} size={56} className="animate-float" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => {
                const locked = L.level < a.level;
                return (
                  <button key={a.emoji} disabled={locked} onClick={() => act({ t: "avatar", emoji: a.emoji, aura: av.aura })} title={locked ? `Unlocks at level ${a.level}` : ""}
                    className={cn("relative grid aspect-square place-items-center rounded-xl text-2xl transition", av.emoji === a.emoji ? "bg-yellow-400/15 ring-2 ring-volt" : "bg-white/5 hover:bg-white/10", locked && "opacity-30")}>
                    {a.emoji}
                    {locked && <span className="absolute bottom-0.5 right-0.5 flex items-center text-[9px] text-muted-foreground"><Lock className="h-2.5 w-2.5" />{a.level}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {AURAS.map((a) => {
                const locked = L.level < a.level;
                return (
                  <button key={a.id} disabled={locked} onClick={() => act({ t: "avatar", emoji: av.emoji, aura: a.id })}
                    className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs", av.aura === a.id ? "border-volt" : "border-white/10", locked && "opacity-30")}>
                    <span className="h-5 w-5 rounded-full" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} />
                    {a.name}{locked && ` · Lv ${a.level}`}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Slip-ups (penalties)</CardTitle><CardDescription>Optional accountability, designed to be gentle</CardDescription></div>
            <Switch checked={s.settings.penaltiesOn} onCheckedChange={(v) => act({ t: "settings", patch: { penaltiesOn: v } })} aria-label="Enable penalties" />
          </CardHeader>
          <CardContent className={cn("space-y-3", !s.settings.penaltiesOn && "pointer-events-none opacity-40")}>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Max XP you can lose per day</span><span>{s.settings.penaltyCap} XP</span></div>
              <input type="range" min={5} max={50} step={5} value={s.settings.penaltyCap} onChange={(e) => act({ t: "settings", patch: { penaltyCap: +e.target.value } })} className="w-full" />
            </div>
            {s.penalties.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-3 py-2">
                <Switch checked={p.on} onCheckedChange={(v) => act({ t: "penaltyDefs", defs: s.penalties.map((x) => (x.id === p.id ? { ...x, on: v } : x)) })} className="scale-75" />
                <span className="flex-1 text-sm">{p.label}</span>
                <input type="number" min={1} max={25} value={p.xp} onChange={(e) => act({ t: "penaltyDefs", defs: s.penalties.map((x) => (x.id === p.id ? { ...x, xp: Math.min(25, Math.max(1, +e.target.value)) } : x)) })} className="input-base w-16 py-1 text-center" aria-label="XP lost" />
                <button onClick={() => act({ t: "penaltyDefs", defs: s.penalties.filter((x) => x.id !== p.id) })} className="text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input-base" placeholder="Custom slip-up, e.g. Skipped Ammamma's call" value={newPen.label} onChange={(e) => setNewPen({ ...newPen, label: e.target.value })} />
              <select className="input-base w-28" value={newPen.dim} onChange={(e) => setNewPen({ ...newPen, dim: e.target.value as DimId })}>{DIMS.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name.split(" ")[0]}</option>)}</select>
              <Button size="icon" className="h-10 w-10 shrink-0" disabled={!newPen.label.trim()} onClick={() => { act({ t: "penaltyDefs", defs: [...s.penalties, { ...newPen, id: uid(), on: true }] }); setNewPen({ ...newPen, label: "" }); }} aria-label="Add"><Plus /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>The cousins</CardTitle><CardDescription>Tap a profile to play as that cousin (demo mode, no login)</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COUSINS.map((c) => (
            <button key={c.id} onClick={() => act({ t: "active", id: c.id })} className={cn("rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", me === c.id ? "border-volt/60 bg-yellow-400/5" : "border-white/10 bg-white/[.03]")}>
              <Avatar id={c.id} size={48} />
              <div className="mt-2 font-semibold">{c.name}</div>
              <div className="text-xs" style={{ color: c.color }}>{c.role}</div>
              <div className="text-[11px] text-muted-foreground">📍 {c.area}, {c.city}</div>
              <p className="mt-2 text-xs text-muted-foreground">{c.bio}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>House rules: the science bit 🧠</CardTitle><CardDescription>How Thunderstorms &apos;n&apos; All is designed to build lasting habits</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RULES.map(([i, t, d]) => (
            <div key={t} className="rounded-xl bg-white/[.03] p-4">
              <div className="text-sm font-semibold">{i} {t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="font-semibold">Live cousin simulation</div>
          <p className="text-xs text-muted-foreground">For the demo, other cousins log activities every ~25 seconds so you can watch the league move.</p>
        </div>
        <Switch checked={s.settings.liveSim} onCheckedChange={(v) => act({ t: "settings", patch: { liveSim: v } })} aria-label="Live simulation" />
      </Card>

      <Card className="flex flex-col gap-4 border-red-500/20 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="font-semibold">Reset demo data</div>
          <p className="text-xs text-muted-foreground">Restores the sample data for all five cousins. Data is stored only in this browser.</p>
        </div>
        {confirm ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { act({ t: "reset" }); setConfirm(false); }}><RotateCcw /> Yes, reset</Button>
          </div>
        ) : <Button variant="outline" onClick={() => setConfirm(true)}><RotateCcw /> Reset</Button>}
      </Card>
      <p className="text-center text-xs text-muted-foreground">Currently playing as {COUSIN[me].name}. Made with ⚡ for the cousins.</p>
    </div>
  );
}
