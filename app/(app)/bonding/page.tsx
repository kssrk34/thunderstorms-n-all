"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, MapPin, Plus } from "lucide-react";
import { SquadArt } from "@/components/brand";
import { Field } from "@/components/forms";
import { Avatar, AvatarView, EmptyState, PageHeader, Section, Stat, Xp } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List } from "@/components/ui/list";
import { HANGOUT_IDEAS, MEETUP_KINDS, PLACES } from "@/lib/catalog";
import { newId, useGame, useMember } from "@/lib/store";
import { cn, daysBetween, fmtShort, monthStart, today } from "@/lib/utils";

const MEM_EMOJIS = ["📸", "🎉", "🍛", "🌄", "🪔", "🎂", "🏏", "🎶", "🚗", "😂"];

export default function Together() {
  const { s, me, act } = useGame();
  const t = today();
  const sorted = [...s.meetups].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const thisMonth = s.meetups.filter((m) => m.date >= monthStart(t)).length;
  const [open, setOpen] = useState(false);
  const blank = { date: t, place: "", kind: MEETUP_KINDS[0], attendees: [me] as string[], note: "", memEmoji: "📸", caption: "" };
  const [f, setF] = useState(blank);
  const n = f.attendees.length;
  const full = n === s.members.length && n >= 3;
  const xpEach = n < 2 ? 0 : 30 + (n - 2) * 10 + (full ? 50 : 0);
  const solo = s.members.length < 2;

  return (
    <div className="space-y-10">
      <PageHeader title="Together" subtitle="The real leaderboard is the memories. Meet up, show up, celebrate each other."
        action={!solo && <Button size="sm" onClick={() => { setF(blank); setOpen(true); }}><Plus />Meetup</Button>} />

      {solo ? (
        <Card>
          <EmptyState art={<SquadArt />} title="Better together" body="Once your cousins join, record meetups here. Everyone who shows up earns XP."
            action={<Button asChild><Link href="/settings#cousins">Invite your cousins</Link></Button>} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Meetups" value={s.meetups.length} sub="since you started" />
            <Stat label="Days since last" value={last ? daysBetween(last.date, t) : "–"} sub={last ? last.place : "Plan one"} />
            <Stat label="This month" value={thisMonth} sub="Two a month is a good rhythm" />
          </div>

          {s.meetups.length === 0 ? (
            <Card>
              <EmptyState title="No meetups yet" body="When you get together, record it here. Bring the whole squad for a bonus." action={<Button onClick={() => { setF(blank); setOpen(true); }}><Plus />Record a meetup</Button>} />
              <div className="px-5 pb-6">
                <div className="mb-2 px-1 text-[13px] font-medium text-muted-foreground">Ideas for next time</div>
                <List>{HANGOUT_IDEAS.map((i) => <div key={i.title} className="px-4 py-3"><div className="text-[15px]">{i.title}</div><div className="text-[13px] text-muted-foreground">{i.desc}</div></div>)}</List>
              </div>
            </Card>
          ) : (
            <>
              {s.memories.length > 0 && (
                <Section title="Memories">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {s.memories.map((m) => <MemoryCard key={m.id} id={m.id} />)}
                  </div>
                </Section>
              )}
              <Section title="Timeline">
                <List>
                  {sorted.map((m) => (
                    <div key={m.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[16px] font-medium">{m.kind}</div>
                          <div className="flex items-center gap-1 text-[13px] text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{m.place} · {fmtShort(m.date)}</div>
                        </div>
                        <Xp value={m.xpEach} />
                      </div>
                      <div className="mt-2 flex -space-x-1.5">{m.attendees.map((a) => <Avatar key={a} id={a} size={26} className="ring-2 ring-card" />)}</div>
                      {m.note && <p className="mt-2 text-[14px] text-muted-foreground">&ldquo;{m.note}&rdquo;</p>}
                    </div>
                  ))}
                </List>
              </Section>
            </>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a meetup</DialogTitle><DialogDescription>Everyone who came earns XP. The whole squad together earns a bonus.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div>
              <span className="label">Who was there?</span>
              <div className="flex flex-wrap gap-2">
                {s.members.map((m) => {
                  const on = f.attendees.includes(m.id);
                  return (
                    <button key={m.id} type="button" disabled={m.id === me} onClick={() => setF({ ...f, attendees: on ? f.attendees.filter((x) => x !== m.id) : [...f.attendees, m.id] })}
                      className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[14px] transition disabled:cursor-default", on ? "border-primary bg-primary/10" : "border-border bg-card")}>
                      <AvatarView member={m} size={26} />{m.id === me ? "You" : m.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="When"><input type="date" className="field" value={f.date} max={t} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="What"><select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{MEETUP_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
            </div>
            <Field label="Where">
              <input className="field" list="places" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="e.g. Home, Sunday lunch" maxLength={80} />
              <datalist id="places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="Note (optional)"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={200} placeholder="Inside jokes welcome" /></Field>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <span className="label">Save a memory (optional)</span>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {MEM_EMOJIS.map((e) => <button key={e} type="button" onClick={() => setF({ ...f, memEmoji: e })} className={cn("grid h-9 w-9 place-items-center rounded-xl text-[18px]", f.memEmoji === e ? "bg-card ring-2 ring-primary" : "bg-card/60")}>{e}</button>)}
              </div>
              <input className="field bg-card" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} maxLength={280} placeholder="The moment you want to remember" />
            </div>
            <Button size="lg" className="w-full" disabled={n < 2 || !f.place.trim()} onClick={() => {
              if (act({ t: "meetup", id: newId(), m: { date: f.date, place: f.place.trim(), kind: f.kind, attendees: f.attendees, note: f.note }, memory: { emoji: f.memEmoji, caption: f.caption } })) setOpen(false);
            }}>
              {n < 2 ? "Pick who was there" : `Save · +${xpEach} XP each`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemoryCard({ id }: { id: string }) {
  const { s, me, act } = useGame();
  const m = s.memories.find((x) => x.id === id)!;
  const by = useMember(m.by);
  const cheered = m.cheers.includes(me);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className="text-[32px]" aria-hidden>{m.emoji}</span>
        <span className="text-[12px] text-muted-foreground">{fmtShort(m.date)}</span>
      </div>
      <div className="mt-3 text-[16px] font-semibold tracking-tight">{m.title}</div>
      <p className="mt-1 flex-1 text-[14px] text-muted-foreground">{m.caption}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><AvatarView member={by} size={20} />{by.name}</span>
        <button onClick={() => act({ t: "cheer", id: m.id })} aria-pressed={cheered} aria-label="Cheer"
          className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] transition", cheered ? "bg-[#E06C7A]/15 text-[#E06C7A]" : "bg-secondary text-muted-foreground hover:text-[#E06C7A]")}>
          <Heart className={cn("h-3.5 w-3.5", cheered && "fill-current")} />{m.cheers.length}
        </button>
      </div>
    </Card>
  );
}
