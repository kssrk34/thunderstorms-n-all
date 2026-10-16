"use client";

import { useState } from "react";
import { Heart, MapPin, Plus } from "lucide-react";
import { Avatar, PageHeader, Stat } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUSIN, COUSINS, MEETUP_KINDS, PLACES } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import { cn, daysBetween, fmtShort, monthStart, today } from "@/lib/utils";

const IDEAS = [
  { emoji: "🎲", title: "Pallanguzhi / Ludo night", desc: "Old-school board games at Ammamma's" },
  { emoji: "🍳", title: "Cook-off: millet edition", desc: "Teams of 2 vs 3, judges are the parents" },
  { emoji: "🏸", title: "Squad badminton doubles", desc: "Losers buy the filter coffee" },
  { emoji: "🚂", title: "Bangalore weekend raid", desc: "Visit Ananya: Lalbagh, MTR, Church Street" },
  { emoji: "🎬", title: "Telugu/Tamil classic movie marathon", desc: "Each cousin picks one film" },
  { emoji: "📸", title: "Golconda sound & light show", desc: "Plus Irani chai on the way back" },
];
const MEM_EMOJIS = ["📸", "🎉", "🍛", "🌄", "🪔", "🎂", "🏏", "🎶", "🚗", "😂"];

export default function Bonding() {
  const { s, me, act } = useGame();
  const t = today();
  const sorted = [...s.meetups].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const thisMonth = s.meetups.filter((m) => m.date >= monthStart(t)).length;
  const full = s.meetups.filter((m) => m.attendees.length === COUSINS.length).length;

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: t, place: PLACES[0], kind: MEETUP_KINDS[0], attendees: [me] as string[], note: "", memEmoji: "📸", caption: "" });
  const n = f.attendees.length;
  const xpEach = n < 2 ? 0 : 30 + (n - 2) * 10 + (n === COUSINS.length ? 50 : 0);

  const pair = (a: string, b: string) => s.meetups.filter((m) => m.attendees.includes(a) && m.attendees.includes(b)).length;
  const maxPair = Math.max(1, ...COUSINS.flatMap((a) => COUSINS.filter((b) => b.id !== a.id).map((b) => pair(a.id, b.id))));

  return (
    <div className="space-y-6">
      <PageHeader emoji="🏡" title="Family Bonding" subtitle="The real leaderboard is the memories. Meet up, show up, celebrate each other."
        action={<Button variant="volt" onClick={() => { setF({ ...f, attendees: [me], date: t, note: "", caption: "" }); setOpen(true); }}><Plus /> Record a meetup</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="🤝" label="Total meetups" value={s.meetups.length} sub="since we started" accent="#f472b6" />
        <Stat icon="⏳" label="Days since last" value={last ? daysBetween(last.date, t) : "-"} sub={last ? last.place : "Plan one!"} accent="#38bdf8" />
        <Stat icon="📅" label="This month" value={`${thisMonth}/2`} sub="Goal: 2 meetups a month" accent="#facc15" />
        <Stat icon="🌩️" label="Full-squad meetups" value={full} sub="All five together (+50 XP bonus)" accent="#8b5cf6" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><div><CardTitle>Memory wall 📸</CardTitle><CardDescription>Shared moments. Cheer the ones you love.</CardDescription></div></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {s.memories.map((m, i) => (
              <div key={m.id} className={cn("relative overflow-hidden rounded-2xl border border-white/10 p-4", i % 3 === 0 ? "bg-gradient-to-br from-violet-500/15 to-transparent" : i % 3 === 1 ? "bg-gradient-to-br from-sky-500/15 to-transparent" : "bg-gradient-to-br from-yellow-400/10 to-transparent")}>
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{m.emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{fmtShort(m.date)}</span>
                </div>
                <div className="mt-2 font-display font-semibold">{m.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{m.caption}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Avatar id={m.by} size={20} ring={false} /> {COUSIN[m.by].name}</span>
                  <button onClick={() => act({ t: "cheer", id: m.id })} className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs transition", m.cheers.includes(me) ? "bg-pink-500/20 text-pink-300" : "bg-white/5 text-muted-foreground hover:text-pink-300")}>
                    <Heart className={cn("h-3.5 w-3.5", m.cheers.includes(me) && "fill-pink-400")} /> {m.cheers.length}
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><div><CardTitle>Cousin connection web</CardTitle><CardDescription>Meetups shared by each pair. Who haven&apos;t you seen lately?</CardDescription></div></CardHeader>
            <CardContent>
              <div className="grid gap-1" style={{ gridTemplateColumns: `36px repeat(${COUSINS.length}, 1fr)` }}>
                <div />
                {COUSINS.map((c) => <div key={c.id} className="grid place-items-center"><Avatar id={c.id} size={26} ring={false} /></div>)}
                {COUSINS.map((a) => (
                  <div key={a.id} className="contents">
                    <div className="grid place-items-center"><Avatar id={a.id} size={26} ring={false} /></div>
                    {COUSINS.map((b) => {
                      const v = a.id === b.id ? -1 : pair(a.id, b.id);
                      return (
                        <div key={b.id} title={v >= 0 ? `${a.name} & ${b.name}: ${v}` : a.name} className="grid aspect-square place-items-center rounded-lg text-xs font-bold"
                          style={{ background: v < 0 ? "transparent" : `rgba(244,114,182,${0.08 + (v / maxPair) * 0.6})` }}>
                          {v < 0 ? "·" : v}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>💡 Next hangout ideas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {IDEAS.map((i) => (
                <div key={i.title} className="flex items-center gap-3 rounded-xl bg-white/[.03] p-2.5">
                  <span className="text-2xl">{i.emoji}</span>
                  <div><div className="text-sm font-medium">{i.title}</div><div className="text-[11px] text-muted-foreground">{i.desc}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Meetup timeline</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative space-y-5 border-l border-white/10 pl-6">
            {sorted.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 ring-4 ring-[#0b1024]" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{m.kind}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {m.place}</span>
                  <span className="chip text-volt">+{m.xpEach} XP each</span>
                  {m.attendees.length === COUSINS.length && <span className="chip text-violet-300">🌩️ Full squad</span>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{fmtShort(m.date)}</div>
                <div className="mt-2 flex -space-x-2">{m.attendees.map((a) => <Avatar key={a} id={a} size={28} />)}</div>
                {m.note && <p className="mt-2 text-sm text-muted-foreground">“{m.note}”</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a cousin meetup 🏡</DialogTitle>
            <DialogDescription>Everyone who came earns XP. Bring all five for the Full Squad bonus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">Who showed up?</div>
              <div className="flex flex-wrap gap-2">
                {COUSINS.map((c) => {
                  const on = f.attendees.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setF({ ...f, attendees: on ? f.attendees.filter((x) => x !== c.id) : [...f.attendees, c.id] })}
                      className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs transition", on ? "border-pink-400/60 bg-pink-500/15" : "border-white/10 bg-white/5 opacity-70")}>
                      <Avatar id={c.id} size={24} ring={false} /> {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input-base" value={f.date} max={t} onChange={(e) => setF({ ...f, date: e.target.value })} />
              <select className="input-base" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{MEETUP_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            </div>
            <input className="input-base" list="places" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="Where?" />
            <datalist id="places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
            <input className="input-base" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Quick note (inside jokes welcome)" />
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <div className="mb-2 text-xs text-muted-foreground">Save a memory (optional)</div>
              <div className="mb-2 flex flex-wrap gap-1">{MEM_EMOJIS.map((e) => <button key={e} onClick={() => setF({ ...f, memEmoji: e })} className={cn("h-8 w-8 rounded-lg", f.memEmoji === e ? "bg-yellow-400/20 ring-1 ring-volt" : "bg-white/5")}>{e}</button>)}</div>
              <input className="input-base" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} placeholder="The moment you want to remember…" />
            </div>
            <Button className="w-full" size="lg" disabled={n < 2 || !f.place.trim()} onClick={() => {
              if (act({ t: "meetup", m: { date: f.date, place: f.place.trim(), kind: f.kind, attendees: f.attendees, note: f.note }, memory: { emoji: f.memEmoji, caption: f.caption } })) setOpen(false);
            }}>
              {n < 2 ? "Pick at least 2 cousins" : `Log meetup · +${xpEach} XP each${n === COUSINS.length ? " 🌩️" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
