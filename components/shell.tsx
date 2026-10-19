"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Check, Compass, LayoutDashboard, ListChecks, Plus, Swords, Target, TrendingUp, UserRound, Zap, type LucideIcon } from "lucide-react";
import { ACTIVITIES, DIM, MEETUP_KINDS, MEMORY_ICONS, PLACES, PRIVATE_ACTIVITIES, RIVALRY_TEMPLATES } from "@/lib/catalog";
import { newId, useGame, type Sheet } from "@/lib/store";
import type { ActiveDim, Rivalry } from "@/lib/types";
import { cn, timeAgo, today } from "@/lib/utils";
import { AuraIcon, LightningFlash, LightningStreaks, LogoMark, StormBackdrop, Wordmark } from "./brand";
import { AreaPicker, Field, GoalForm, QuestForm, VisibilityRow } from "./forms";
import { AuraCounter, AvatarView, RankBadge, useLevel } from "./game";
import { BADGE_ICON, NOTIF_ICON, QUEST_ICON } from "./icons";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";

interface NavItem { href: string; label: string; short: string; icon: LucideIcon; match: (p: string) => boolean }
export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, match: (p) => p === "/" || p === "/recap" || p.startsWith("/u/") },
  { href: "/quests", label: "My Quests", short: "Quests", icon: ListChecks, match: (p) => p.startsWith("/quests") },
  { href: "/life", label: "Life Balance", short: "Balance", icon: Compass, match: (p) => p.startsWith("/life") },
  { href: "/arena", label: "Arena", short: "Arena", icon: Swords, match: (p) => p.startsWith("/arena") },
  { href: "/profile", label: "Profile", short: "Profile", icon: UserRound, match: (p) => p.startsWith("/profile") },
];

function Sidebar() {
  const path = usePathname();
  const { me, profile } = useGame();
  const L = useLevel(me);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col border-r border-border/70 bg-background/40 px-4 py-5 backdrop-blur-xl lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <LogoMark size={32} />
        <Wordmark />
      </Link>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV.map((n) => {
          const active = n.match(path);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
              className={cn("relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                active ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")}>
              {active && <span className="absolute left-0 top-2 h-6 w-[3px] rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
              <n.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} strokeWidth={active ? 2.2 : 1.9} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/profile" className="panel block p-3.5 transition hover:border-primary/40">
        <div className="flex items-center gap-3">
          <AvatarView member={profile} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{profile.name}</div>
            <RankBadge id={me} size={16} className="mt-0.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">Level {L.level} · {L.title}</span>
          <span className="tabular-nums text-muted-foreground">{L.span - L.into} to go</span>
        </div>
        <Progress value={L.pct * 100} className="mt-1.5 h-1.5" />
      </Link>
    </aside>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return { open, setOpen, ref };
}

const popoverPanel = "absolute right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-[18px] border border-border bg-popover shadow-float motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[.97]";

function Notifications() {
  const { s, me, act } = useGame();
  const { open, setOpen, ref } = usePopover();
  const seen = s.notifsSeen[me] ?? 0;
  const unread = s.notifs.filter((n) => n.ts > seen).length;
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-expanded={open}
        onClick={() => { setOpen(!open); if (!open && unread) setTimeout(() => act({ t: "notifsRead" }), 1200); }}>
        <Bell />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] ring-2 ring-background" />}
      </Button>
      {open && (
        <div className={cn(popoverPanel, "max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-2")}>
          <div className="flex items-center justify-between px-3 pb-1 pt-2">
            <span className="font-display text-[15px] font-semibold">Notifications</span>
            <Link href="/profile?tab=alerts" onClick={() => setOpen(false)} className="text-[12px] text-primary hover:opacity-80">Settings</Link>
          </div>
          {s.notifs.length === 0 && <p className="px-3 pb-4 pt-1 text-[14px] text-muted-foreground">All calm. Invitations, reactions and rivalries will show up here.</p>}
          {s.notifs.slice(0, 25).map((n) => {
            const Icon = NOTIF_ICON[n.icon] ?? Zap;
            return (
              <div key={n.id} className="flex gap-3 rounded-xl px-3 py-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium leading-snug">{n.title}</div>
                  {n.body && <div className="text-[13px] text-muted-foreground">{n.body}</div>}
                  <div className="mt-0.5 text-[11px] text-muted-foreground/80">{timeAgo(n.ts)}</div>
                </div>
                {n.ts > seen && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewMenu() {
  const { openSheet } = useGame();
  const { open, setOpen, ref } = usePopover();
  const items: { label: string; sub: string; sheet: Sheet; icon: LucideIcon }[] = [
    { label: "New quest", sub: "Daily, one-time or a mission", sheet: { kind: "quest" }, icon: ListChecks },
    { label: "New goal", sub: "Something you'd love to achieve", sheet: { kind: "goal" }, icon: Target },
    { label: "Log an activity", sub: "A win that wasn't on the list", sheet: { kind: "log" }, icon: Zap },
    { label: "Start a rivalry", sub: "A friendly weekly face-off", sheet: { kind: "rivalry" }, icon: Swords },
  ];
  return (
    <div className="relative" ref={ref}>
      <Button size="icon" className="h-9 w-9" aria-label="Create" aria-expanded={open} onClick={() => setOpen(!open)}><Plus strokeWidth={2.4} /></Button>
      {open && (
        <div className={cn(popoverPanel, "w-[min(18.5rem,calc(100vw-2rem))] p-1.5")}>
          {items.map((it) => (
            <button key={it.label} onClick={() => { setOpen(false); openSheet(it.sheet); }} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition hover:bg-secondary">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"><it.icon className="h-[18px] w-[18px]" /></span>
              <span><span className="block text-[15px] font-medium">{it.label}</span><span className="block text-[12px] text-muted-foreground">{it.sub}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { me } = useGame();
  const L = useLevel(me);
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:justify-end lg:px-10">
        <Link href="/" className="flex items-center gap-2 lg:hidden"><LogoMark size={28} /><Wordmark className="hidden text-[14px] min-[380px]:inline" /></Link>
        <div className="flex items-center gap-1.5">
          <Link href="/profile?tab=history" className="mr-1 flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[.07] px-3 py-1.5 text-[14px] font-semibold text-foreground transition hover:border-primary/50" aria-label="Your Aura Points">
            <AuraCounter value={L.aura} className="font-display" />
            <span className="hidden text-[12px] font-normal text-muted-foreground sm:inline">Aura</span>
          </Link>
          <Notifications />
          <NewMenu />
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden" aria-label="Main">
      <div className="mx-auto grid max-w-md grid-cols-5 px-1">
        {NAV.map((n) => {
          const active = n.match(path);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
              className={cn("relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
              {active && <span className="absolute top-0 h-[2px] w-8 rounded-b-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
              <n.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />{n.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn("flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] font-medium shadow-float motion-safe:animate-toast-in",
          t.tone === "warn" ? "border border-border bg-popover text-foreground" : t.tone === "aura" ? "border border-primary/40 bg-[hsl(228_44%_9%)] text-white shadow-[0_0_28px_-6px_hsl(var(--primary)/.8)]" : "bg-foreground text-background")}>
          {t.tone === "aura" && (
            <span className="flex shrink-0 items-center gap-1 font-display font-semibold text-[hsl(var(--ion))]">
              <AuraIcon glow className="h-4 w-4" />+{t.aura} Aura Points
            </span>
          )}
          <span className="line-clamp-2">{t.tone === "aura" ? <span className="font-normal text-white/70">{t.text}</span> : t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Milestones: a dark sky, a flash, and for level-ups, lightning drawing itself across the screen. */
function Celebration() {
  const { celebration: c, dismissCelebration } = useGame();
  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") dismissCelebration(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c, dismissCelebration]);
  if (!c) return null;
  const Icon = c.kind === "level" ? TrendingUp : BADGE_ICON[c.badgeId ?? ""] ?? Zap;
  return (
    <div className="storm fixed inset-0 z-[70] grid place-items-center overflow-hidden p-6 text-white motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500" role="dialog" aria-modal aria-labelledby="cel-title" onClick={dismissCelebration}>
      <LightningFlash />
      {c.kind === "level" && <LightningStreaks />}
      <div className="relative w-full max-w-sm text-center motion-safe:animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className={cn("electric mx-auto grid h-28 w-28 place-items-center rounded-full bg-white/[.06]", c.kind === "badge" && "electric-gold")}>
          <Icon className={cn("h-12 w-12", c.kind === "level" ? "text-[hsl(var(--ion))]" : "text-accent")} strokeWidth={1.7} />
        </div>
        <div className="eyebrow mt-7 text-white/60">{c.kind === "level" ? "Level up" : "Achievement unlocked"}</div>
        <h2 id="cel-title" className="mt-2 font-display text-[36px] font-bold tracking-tight">{c.title}</h2>
        <p className="mt-2 text-[17px] text-white/70">{c.body}</p>
        <Button size="lg" className="mt-9 w-full bg-white text-[#05070E] hover:bg-white/90" onClick={dismissCelebration} autoFocus>Continue</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Global sheets                                                       */
/* ------------------------------------------------------------------ */
function LogSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { act } = useGame();
  const [actId, setActId] = useState(ACTIVITIES[0].id);
  const [mins, setMins] = useState(30);
  const [note, setNote] = useState("");
  const [priv, setPriv] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setNote(""); setMins(30); setTouched(false); setPriv(PRIVATE_ACTIVITIES.has(actId)); } }, [open, actId]);
  const a = ACTIVITIES.find((x) => x.id === actId)!;
  const aura = Math.round(a.xp * Math.min(2, Math.max(0.5, mins / 30)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an activity</DialogTitle>
          <DialogDescription>For real wins that weren&apos;t on today&apos;s list. Up to eight a day.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITIES.map((x) => {
              const Icon = QUEST_ICON[x.icon];
              const on = actId === x.id;
              const color = DIM[x.dim].color;
              return (
                <button key={x.id} type="button" onClick={() => { setActId(x.id); if (!touched) setPriv(PRIVATE_ACTIVITIES.has(x.id)); }} aria-pressed={on}
                  className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 text-[12px] font-medium transition", on ? "border-transparent" : "border-border bg-card hover:bg-secondary/60")}
                  style={on ? { background: `${color}22`, boxShadow: `inset 0 0 0 1.5px ${color}`, color } : undefined}>
                  <Icon className="h-5 w-5" style={on ? undefined : { color }} />{x.label}
                </button>
              );
            })}
          </div>
          <input className="field" placeholder={a.hint} value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} aria-label="Note (optional)" />
          <div>
            <div className="mb-2 flex justify-between text-[13px] text-muted-foreground"><span>Duration</span><span className="tabular-nums text-foreground">{mins} min</span></div>
            <div className="grid grid-cols-6 gap-1.5">
              {[10, 15, 30, 45, 60, 90].map((m) => (
                <button key={m} type="button" onClick={() => setMins(m)} aria-pressed={mins === m}
                  className={cn("h-9 rounded-full text-[13px] font-medium tabular-nums transition", mins === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>{m}</button>
              ))}
            </div>
          </div>
          <VisibilityRow value={priv} onChange={(v) => { setPriv(v); setTouched(true); }} what="activity" />
          <Button className="w-full" size="lg" onClick={() => { if (act({ t: "activity", id: newId(), activityId: actId, minutes: mins, note, private: priv })) onOpenChange(false); }}>
            Log it · <AuraIcon className="h-4 w-4" />+{aura} Aura Points
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RivalrySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { s, me, act } = useGame();
  const others = s.members.filter((m) => m.id !== me);
  const blank = { title: RIVALRY_TEMPLATES[0].title, metric: RIVALRY_TEMPLATES[0].metric as Rivalry["metric"], dim: undefined as ActiveDim | undefined, participants: others.map((m) => m.id), stake: "" };
  const [r, setR] = useState(blank);
  useEffect(() => { if (open) setR(blank); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a rivalry</DialogTitle><DialogDescription>A friendly race that runs until Sunday. Winning earns a trophy, not extra Aura.</DialogDescription></DialogHeader>
        {others.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-muted-foreground">Rivalries need at least one other cousin. Invite them from Profile → Settings.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {RIVALRY_TEMPLATES.map((x) => (
                <button key={x.title} type="button" onClick={() => setR({ ...r, title: x.title, metric: x.metric, dim: x.dim as ActiveDim | undefined })}
                  className={cn("rounded-full border px-3.5 py-2 text-[14px] transition", r.title === x.title ? "border-primary bg-primary/10 text-primary" : "border-border bg-card")}>{x.title}</button>
              ))}
            </div>
            <Field label="Name"><input className="field" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} maxLength={60} /></Field>
            <div>
              <span className="label">Scored by</span>
              <div className="grid grid-cols-3 gap-1.5">
                {([["aura", "Aura Points"], ["days", "Active days"], ["dim", "One dimension"]] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={r.metric === id} onClick={() => setR({ ...r, metric: id, dim: id === "dim" ? r.dim ?? "health" : undefined })}
                    className={cn("rounded-xl border px-2 py-2.5 text-[13px] font-medium transition", r.metric === id ? "border-primary bg-primary/10" : "border-border bg-card")}>{label}</button>
                ))}
              </div>
              {r.metric === "dim" && <div className="mt-3"><AreaPicker value={r.dim} onChange={(d) => setR({ ...r, dim: d })} /></div>}
            </div>
            <div>
              <span className="label">Who&apos;s in</span>
              <div className="flex flex-wrap gap-2">
                {others.map((m) => {
                  const on = r.participants.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => setR({ ...r, participants: on ? r.participants.filter((x) => x !== m.id) : [...r.participants, m.id] })}
                      className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[14px] transition", on ? "border-primary bg-primary/10" : "border-border bg-card")}>
                      <AvatarView member={m} size={26} frame={false} />{m.name}{on && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">Anyone can still join until it ends.</p>
            </div>
            <Field label="Stakes (optional)"><input className="field" value={r.stake} onChange={(e) => setR({ ...r, stake: e.target.value })} maxLength={100} placeholder="e.g. Loser buys the filter coffee" /></Field>
            <Button size="lg" className="w-full" disabled={!r.title.trim()} onClick={() => { if (act({ t: "rivalCreate", id: newId(), r: { title: r.title.trim(), metric: r.metric, dim: r.dim, participants: r.participants, stake: r.stake } })) onOpenChange(false); }}>Start rivalry</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MeetupSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { s, me, act } = useGame();
  const t = today();
  const blank = { date: t, place: "", kind: MEETUP_KINDS[0], attendees: [me] as string[], note: "", icon: "sun", caption: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = f.attendees.length;
  const full = n === s.members.length && n >= 3;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record a meetup</DialogTitle><DialogDescription>Everyone who came earns 75 Aura Points; 100 when the whole squad is there.</DialogDescription></DialogHeader>
        <div className="space-y-5">
          <div>
            <span className="label">Who was there?</span>
            <div className="flex flex-wrap gap-2">
              {s.members.map((m) => {
                const on = f.attendees.includes(m.id);
                return (
                  <button key={m.id} type="button" disabled={m.id === me} onClick={() => setF({ ...f, attendees: on ? f.attendees.filter((x) => x !== m.id) : [...f.attendees, m.id] })}
                    className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[14px] transition disabled:cursor-default", on ? "border-primary bg-primary/10" : "border-border bg-card")}>
                    <AvatarView member={m} size={26} frame={false} />{m.id === me ? "You" : m.name}
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
              {MEMORY_ICONS.map((k) => {
                const Icon = QUEST_ICON[k];
                return <button key={k} type="button" onClick={() => setF({ ...f, icon: k })} aria-pressed={f.icon === k} aria-label={k} className={cn("grid h-9 w-9 place-items-center rounded-xl", f.icon === k ? "bg-card text-primary ring-2 ring-primary" : "bg-card/60 text-muted-foreground")}><Icon className="h-4 w-4" /></button>;
              })}
            </div>
            <input className="field bg-card" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} maxLength={280} placeholder="The moment you want to remember" />
          </div>
          <Button size="lg" className="w-full" disabled={n < 2 || !f.place.trim()} onClick={() => {
            if (act({ t: "meetup", id: newId(), m: { date: f.date, place: f.place.trim(), kind: f.kind, attendees: f.attendees, note: f.note }, memory: { icon: f.icon, caption: f.caption } })) onOpenChange(false);
          }}>
            {n < 2 ? "Pick who was there" : `Save · +${full ? 100 : 75} Aura Points each`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GlobalSheets() {
  const { sheet, openSheet, toast } = useGame();
  const close = (v: boolean) => { if (!v) openSheet(null); };
  const editing = sheet?.kind === "quest" && sheet.preset?.edit;
  const editingGoal = sheet?.kind === "goal" && sheet.preset?.edit;
  return (
    <>
      <Dialog open={sheet?.kind === "quest"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit quest" : "New quest"}</DialogTitle>
            <DialogDescription>{editing ? "Changes apply from now on. Aura already earned stays as it was." : "Small, specific and doable beats big and vague."}</DialogDescription>
          </DialogHeader>
          {sheet?.kind === "quest" && <QuestForm key={JSON.stringify(sheet.preset ?? {})} preset={sheet.preset} onDone={(k) => { openSheet(null); toast(editing ? "Saved" : k === "challenge" ? "Mission started" : "Quest added", "info"); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={sheet?.kind === "goal"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGoal ? "Edit goal" : "New goal"}</DialogTitle><DialogDescription>The bigger picture your quests build toward.</DialogDescription></DialogHeader>
          {sheet?.kind === "goal" && <GoalForm preset={sheet.preset} onDone={() => { openSheet(null); toast(editingGoal ? "Saved" : "Goal added", "info"); }} />}
        </DialogContent>
      </Dialog>
      <LogSheet open={sheet?.kind === "log"} onOpenChange={close} />
      <RivalrySheet open={sheet?.kind === "rivalry"} onOpenChange={close} />
      <MeetupSheet open={sheet?.kind === "meetup"} onOpenChange={close} />
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <StormBackdrop />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="pb-tabbar mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">{children}</main>
      </div>
      <TabBar />
      <Toasts />
      <Celebration />
      <GlobalSheets />
    </div>
  );
}

