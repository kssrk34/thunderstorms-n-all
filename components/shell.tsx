"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, Briefcase, ChevronRight, CloudSun, Compass, HeartHandshake, HeartPulse, ListChecks, LogOut, MoreHorizontal, Moon, PiggyBank,
  Plus, Settings, Target, TrendingUp, UserRound, Users, Zap, type LucideIcon,
} from "lucide-react";
import { ACTIVITIES } from "@/lib/catalog";
import { useGame, type Sheet } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { LightningFlash, LogoMark, Wordmark } from "./brand";
import { GoalForm, QuestForm } from "./forms";
import { Avatar, useLevel } from "./game";
import { ACTIVITY_ICON, BADGE_ICON, NOTIF_ICON } from "./icons";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { List } from "./ui/list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface NavItem { href: string; label: string; icon: LucideIcon }
const PRIMARY: NavItem[] = [
  { href: "/", label: "Today", icon: CloudSun },
  { href: "/quests", label: "Quests", icon: ListChecks },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/league", label: "Cousins", icon: Users },
];
const LIFE: NavItem[] = [
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/career", label: "Career", icon: Briefcase },
  { href: "/money", label: "Money", icon: PiggyBank },
  { href: "/reflect", label: "Reflect", icon: Moon },
  { href: "/life", label: "Life balance", icon: Compass },
  { href: "/bonding", label: "Together", icon: HeartHandshake },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined}
      className={cn("flex h-9 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
        active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")}>
      <item.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} strokeWidth={active ? 2.2 : 1.9} />
      {item.label}
    </Link>
  );
}

function Sidebar() {
  const path = usePathname();
  const { me, profile } = useGame();
  const L = useLevel(me);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-border/70 px-4 py-5 lg:flex">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
        <LogoMark size={30} />
        <Wordmark />
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {PRIMARY.map((n) => <NavLink key={n.href} item={n} active={path === n.href} />)}
        <div className="eyebrow mb-1.5 mt-6 px-3">Life</div>
        {LIFE.map((n) => <NavLink key={n.href} item={n} active={path === n.href} />)}
      </nav>
      <div className="space-y-0.5 border-t border-border/70 pt-3">
        <Link href="/profile" className={cn("flex items-center gap-3 rounded-[12px] p-2 transition hover:bg-secondary/60", path === "/profile" && "bg-secondary")}>
          <Avatar id={me} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{profile.name}</span>
            <span className="block truncate text-[12px] text-muted-foreground">Level {L.level} · {L.title}</span>
          </span>
        </Link>
        <NavLink item={{ href: "/settings", label: "Settings", icon: Settings }} active={path === "/settings"} />
      </div>
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

const popoverPanel = "absolute right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-[18px] border border-border/70 bg-popover shadow-float motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[.97]";

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
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
      </Button>
      {open && (
        <div className={cn(popoverPanel, "max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-2")}>
          <div className="px-3 pb-1 pt-2 text-[15px] font-semibold">Notifications</div>
          {s.notifs.length === 0 && <p className="px-3 pb-4 pt-1 text-[14px] text-muted-foreground">All calm. News from your cousins will show up here.</p>}
          {s.notifs.slice(0, 25).map((n) => {
            const Icon = NOTIF_ICON[n.icon] ?? Zap;
            return (
              <div key={n.id} className="flex gap-3 rounded-xl px-3 py-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="h-4 w-4" /></span>
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
    { label: "New quest", sub: "Daily, one-time or a challenge", sheet: { kind: "quest" }, icon: ListChecks },
    { label: "New goal", sub: "Something you'd love to achieve", sheet: { kind: "goal" }, icon: Target },
    { label: "Log an activity", sub: "A win that wasn't on the list", sheet: { kind: "log" }, icon: Zap },
  ];
  return (
    <div className="relative" ref={ref}>
      <Button size="icon" className="h-9 w-9" aria-label="Create" aria-expanded={open} onClick={() => setOpen(!open)}><Plus strokeWidth={2.4} /></Button>
      {open && (
        <div className={cn(popoverPanel, "w-[min(18rem,calc(100vw-2rem))] p-1.5")}>
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
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-3 px-4 sm:px-6 lg:justify-end lg:px-10">
        <Link href="/" className="flex items-center gap-2 lg:hidden"><LogoMark size={26} /><Wordmark className="text-[14px]" /></Link>
        <div className="flex items-center gap-1">
          <Notifications />
          <NewMenu />
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const { signOut } = useGame();
  const inMore = !PRIMARY.some((n) => n.href === path);
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2">
          {PRIMARY.map((n) => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                <n.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />{n.label}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={cn("flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium", inMore ? "text-primary" : "text-muted-foreground")}>
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={1.8} />More
          </button>
        </div>
      </nav>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent>
          <DialogHeader><DialogTitle>More</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <List>
              {LIFE.map((n) => <MoreRow key={n.href} item={n} onClick={() => setMore(false)} />)}
            </List>
            <List>
              <MoreRow item={{ href: "/profile", label: "Profile", icon: UserRound }} onClick={() => setMore(false)} />
              <MoreRow item={{ href: "/settings", label: "Settings", icon: Settings }} onClick={() => setMore(false)} />
            </List>
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={signOut}><LogOut /> Sign out</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function MoreRow({ item, onClick }: { item: NavItem; onClick: () => void }) {
  return (
    <Link href={item.href} onClick={onClick} className="flex min-h-[52px] items-center gap-3 px-4 transition hover:bg-secondary/50">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary/10 text-primary"><item.icon className="h-[18px] w-[18px]" /></span>
      <span className="flex-1 text-[16px]">{item.label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
    </Link>
  );
}

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn("flex max-w-md items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium shadow-float motion-safe:animate-toast-in",
          t.tone === "warn" ? "bg-popover text-foreground ring-1 ring-border" : "bg-foreground text-background")}>
          {t.tone === "xp" && <Zap className="h-4 w-4 shrink-0 fill-accent text-accent" strokeWidth={0} />}
          <span className="line-clamp-2">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Milestones get a quiet storm: a dark sky and one soft flash of light. */
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
    <div className="storm fixed inset-0 z-[70] grid place-items-center p-6 text-white motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500" role="dialog" aria-modal aria-labelledby="cel-title" onClick={dismissCelebration}>
      <LightningFlash />
      <div className="relative w-full max-w-sm text-center motion-safe:animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur">
          <Icon className="h-11 w-11 text-[#F5C451]" strokeWidth={1.8} />
        </div>
        <div className="mt-6 text-[13px] font-semibold uppercase tracking-[.14em] text-white/60">{c.kind === "level" ? "Level up" : "Achievement"}</div>
        <h2 id="cel-title" className="mt-2 text-[34px] font-bold tracking-tight">{c.title}</h2>
        <p className="mt-2 text-[17px] text-white/70">{c.body}</p>
        <Button size="lg" className="mt-8 w-full bg-white text-[#0B1222] hover:bg-white/90" onClick={dismissCelebration} autoFocus>Continue</Button>
      </div>
    </div>
  );
}

function LogSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { s, act } = useGame();
  const [actId, setActId] = useState(ACTIVITIES[0].id);
  const [mins, setMins] = useState(30);
  const [note, setNote] = useState("");
  const [penId, setPenId] = useState<string | null>(null);
  const [penNote, setPenNote] = useState("");
  useEffect(() => { if (open) { setNote(""); setMins(30); setPenId(null); setPenNote(""); } }, [open]);
  const a = ACTIVITIES.find((x) => x.id === actId)!;
  const xp = Math.round(a.xp * Math.min(2, Math.max(0.5, mins / 30)));
  const pens = s.penalties.filter((p) => p.on);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an activity</DialogTitle>
          <DialogDescription>For wins that weren&apos;t on today&apos;s list. Honest logs only.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="win">
          <TabsList className="flex w-full"><TabsTrigger value="win">Something good</TabsTrigger><TabsTrigger value="slip">A slip-up</TabsTrigger></TabsList>
          <TabsContent value="win" className="space-y-5">
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITIES.map((x) => {
                const Icon = ACTIVITY_ICON[x.id];
                const on = actId === x.id;
                return (
                  <button key={x.id} type="button" onClick={() => setActId(x.id)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[12px] font-medium transition", on ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70")}>
                    <Icon className="h-5 w-5" />{x.label}
                  </button>
                );
              })}
            </div>
            <input className="field" placeholder={a.hint} value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
            <div>
              <div className="mb-2 flex justify-between text-[13px] text-muted-foreground"><span>Duration</span><span className="tabular-nums text-foreground">{mins} min</span></div>
              <input type="range" min={10} max={120} step={5} value={mins} onChange={(e) => setMins(+e.target.value)} className="w-full" aria-label="Duration in minutes" />
            </div>
            <Button className="w-full" size="lg" onClick={() => { if (act({ t: "activity", activityId: actId, minutes: mins, note })) onOpenChange(false); }}>Log it · +{xp} XP</Button>
          </TabsContent>
          <TabsContent value="slip" className="space-y-4">
            {!s.settings.penaltiesOn || pens.length === 0 ? (
              <p className="py-8 text-center text-[15px] text-muted-foreground">Slip-ups are switched off for the squad. Be kind to yourself.</p>
            ) : (
              <>
                <p className="rounded-2xl bg-secondary/70 p-4 text-[14px] text-muted-foreground">
                  No guilt here. Logging honestly earns a +3 honesty bonus, losses are capped at {s.settings.penaltyCap} XP a day, and your level never drops.
                </p>
                <List>
                  {pens.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPenId(p.id)} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left text-[15px] transition hover:bg-secondary/50">
                      <span>{p.label}</span>
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]", penId === p.id ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                        {penId === p.id && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </button>
                  ))}
                </List>
                <input className="field" placeholder="What led to it? (optional, only you see this)" value={penNote} onChange={(e) => setPenNote(e.target.value)} maxLength={80} />
                <Button variant="secondary" size="lg" className="w-full" disabled={!penId} onClick={() => { if (penId && act({ t: "penalty", penaltyId: penId, note: penNote })) onOpenChange(false); }}>Log it honestly</Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GlobalSheets() {
  const { sheet, openSheet, toast } = useGame();
  const close = (v: boolean) => { if (!v) openSheet(null); };
  return (
    <>
      <Dialog open={sheet?.kind === "quest"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>New quest</DialogTitle><DialogDescription>Small, specific and doable beats big and vague.</DialogDescription></DialogHeader>
          {sheet?.kind === "quest" && <QuestForm preset={sheet.preset} onDone={(k) => { openSheet(null); toast(k === "challenge" ? "Challenge started" : "Quest added", "info"); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={sheet?.kind === "goal"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader><DialogTitle>New goal</DialogTitle><DialogDescription>Shared with your cousins, so they can cheer you on.</DialogDescription></DialogHeader>
          {sheet?.kind === "goal" && <GoalForm preset={sheet.preset} onDone={() => { openSheet(null); toast("Goal added", "info"); }} />}
        </DialogContent>
      </Dialog>
      <LogSheet open={sheet?.kind === "log"} onOpenChange={close} />
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="pb-tabbar mx-auto w-full max-w-[1080px] flex-1 px-4 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>
      <TabBar />
      <Toasts />
      <Celebration />
      <GlobalSheets />
    </div>
  );
}
