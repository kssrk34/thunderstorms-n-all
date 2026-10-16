"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell, Brain, Coins, Dumbbell, Flame, Home, LayoutGrid, ListChecks, MoreHorizontal, Plus, Settings, Swords, Trophy, Users, Zap, Briefcase,
} from "lucide-react";
import { ACTIVITIES, COUSIN, COUSINS } from "@/lib/catalog";
import { streakOf } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, LevelPill, useLevel } from "./game";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/quests", label: "Quests", icon: Swords },
  { href: "/league", label: "Cousin League", icon: Trophy },
  { href: "/habits", label: "Habits & Goals", icon: ListChecks },
  { href: "/life", label: "12 Life Areas", icon: LayoutGrid },
  { href: "/bonding", label: "Family Bonding", icon: Users },
  { href: "/health", label: "Health", icon: Dumbbell },
  { href: "/career", label: "Career & Skills", icon: Briefcase },
  { href: "/money", label: "Money", icon: Coins },
  { href: "/reflect", label: "Reflect", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];
const MOBILE = ["/", "/quests", "/league", "/bonding"];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 glow-blue">
        <Zap className="h-5 w-5 fill-yellow-300 text-yellow-300 animate-flicker" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold">Thunderstorms</div>
        <div className="text-[11px] font-semibold tracking-[.2em] text-volt">&apos;N&apos; ALL</div>
      </div>
    </Link>
  );
}

function PlayerSwitcher({ compact }: { compact?: boolean }) {
  const { s, act } = useGame();
  return (
    <div className={cn("flex gap-1.5", compact ? "" : "flex-wrap")}>
      {COUSINS.map((c) => (
        <button key={c.id} onClick={() => act({ t: "active", id: c.id })} title={`Play as ${c.name}`}
          className={cn("rounded-full transition", s.activeId === c.id ? "scale-110 ring-2 ring-volt ring-offset-2 ring-offset-[#0b1024]" : "opacity-60 hover:opacity-100")}>
          <Avatar id={c.id} size={compact ? 30 : 34} ring={false} />
        </button>
      ))}
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  const { me, s } = useGame();
  const L = useLevel(me);
  const streak = streakOf(s, me).current;
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-5 border-r border-white/5 bg-[#080c1d]/70 p-4 backdrop-blur-xl lg:flex">
      <Logo />
      <div className="glass rounded-2xl p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Playing as</div>
        <PlayerSwitcher />
        <div className="mt-3 flex items-center gap-2">
          <Avatar id={me} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold">{COUSIN[me].name} <LevelPill id={me} /></div>
            <div className="truncate text-[11px] text-muted-foreground">{L.title} · 🔥 {streak}d</div>
          </div>
        </div>
        <Progress value={L.pct * 100} className="mt-2 h-1.5" />
        <div className="mt-1 text-right text-[10px] text-muted-foreground">{L.into}/{L.span} XP</div>
      </div>
      <nav className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href}
              className={cn("group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active ? "bg-gradient-to-r from-sky-500/20 to-violet-500/10 text-foreground ring-1 ring-white/10" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>
              <n.icon className={cn("h-4 w-4", active && "text-volt")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Notifications() {
  const { s, act } = useGame();
  const [open, setOpen] = useState(false);
  const unread = s.notifs.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => { setOpen(!open); if (!open) setTimeout(() => act({ t: "notifsRead" }), 1500); }} aria-label="Notifications">
        <Bell className="!h-5 !w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-volt px-1 text-[10px] font-bold text-slate-950">{unread}</span>}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1430]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
            <div className="px-3 py-2 font-display text-sm font-semibold">Notifications</div>
            {s.notifs.length === 0 && <p className="px-3 pb-3 text-sm text-muted-foreground">All quiet. Calm before the storm.</p>}
            {s.notifs.slice(0, 25).map((n) => (
              <div key={n.id} className={cn("flex gap-3 rounded-xl px-3 py-2.5", !n.read && "bg-sky-500/10")}>
                <span className="text-xl">{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">{timeAgo(n.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopBar() {
  const { me, s, setLogOpen } = useGame();
  const streak = streakOf(s, me).current;
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-[#070b1a]/70 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="lg:hidden"><Logo /></div>
      <div className="hidden text-sm text-muted-foreground lg:block">
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {COUSIN[me].city} ⛅
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:block lg:hidden"><PlayerSwitcher compact /></div>
        <span className="chip border-orange-400/30 bg-orange-500/10 text-orange-300"><Flame className="h-3.5 w-3.5" /> {streak}</span>
        <Notifications />
        <Button size="sm" variant="volt" onClick={() => setLogOpen(true)} className="hidden sm:inline-flex"><Plus /> Log activity</Button>
        <div className="sm:hidden"><Avatar id={me} size={32} /></div>
      </div>
    </header>
  );
}

function MobileNav() {
  const path = usePathname();
  const { setLogOpen } = useGame();
  const [more, setMore] = useState(false);
  const items = NAV.filter((n) => MOBILE.includes(n.href));
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080c1d]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
          {items.slice(0, 2).map((n) => <MobItem key={n.href} {...n} active={path === n.href} />)}
          <button onClick={() => setLogOpen(true)} className="-mt-6 mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 shadow-lg shadow-yellow-500/30 active:scale-95" aria-label="Log activity">
            <Plus className="h-7 w-7" />
          </button>
          {items.slice(2, 3).map((n) => <MobItem key={n.href} {...n} active={path === n.href} />)}
          <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground">
            <MoreHorizontal className="h-5 w-5" /> More
          </button>
        </div>
      </nav>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent className="top-auto bottom-4 translate-y-0">
          <DialogHeader><DialogTitle>Explore</DialogTitle></DialogHeader>
          <div className="mb-4"><div className="mb-2 text-xs text-muted-foreground">Playing as</div><PlayerSwitcher /></div>
          <div className="grid grid-cols-3 gap-2">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMore(false)}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-[11px] font-medium", path === n.href && "border-sky-400/50 bg-sky-500/10")}>
                <n.icon className="h-5 w-5 text-sky-300" /> {n.label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function MobItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium", active ? "text-volt" : "text-muted-foreground")}>
      <Icon className="h-5 w-5" /> {label.split(" ").pop()}
    </Link>
  );
}

function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed bottom-24 right-3 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2 lg:bottom-6 lg:right-6">
      {toasts.map((t) => (
        <div key={t.id} className={cn("glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm animate-slide-in",
          t.tone === "xp" && "border-yellow-400/40 glow-volt", t.tone === "warn" && "border-sky-400/40", t.tone === "minus" && "border-violet-400/40")}>
          <span className="text-lg">{t.icon}</span>
          <span className={cn("flex-1", t.tone === "xp" && "font-semibold text-yellow-100")}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

const CONFETTI = ["#38bdf8", "#8b5cf6", "#facc15", "#f472b6", "#34d399"];
function Celebration() {
  const { celebration: c, dismissCelebration, me } = useGame();
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.8, color: CONFETTI[i % 5], size: 6 + Math.random() * 8, round: Math.random() > 0.5,
  })), [c]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/75 p-6 backdrop-blur-sm" onClick={dismissCelebration}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-200/60 via-violet-300/20 to-transparent animate-flash" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {bits.map((b, i) => (
          <span key={i} className="absolute top-0 animate-confetti" style={{ left: `${b.left}%`, width: b.size, height: b.size * (b.round ? 1 : 0.45), background: b.color, borderRadius: b.round ? 999 : 2, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
        ))}
      </div>
      <svg className="pointer-events-none absolute left-[12%] top-0 h-1/2 w-24 animate-flash opacity-80" viewBox="0 0 40 200" fill="none">
        <path d="M24 0 L10 80 L22 82 L6 200 L34 70 L20 68 L32 0Z" fill="#fde047" />
      </svg>
      <div className="relative w-full max-w-sm rounded-3xl border border-yellow-300/30 bg-[#11173a]/95 p-8 text-center shadow-2xl glow-volt animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-bold uppercase tracking-[.3em] text-volt">{c.kind === "level" ? "Level up!" : "Achievement unlocked"}</div>
        <div className="my-5 text-7xl animate-float">{c.emoji}</div>
        <div className="font-display text-2xl font-bold text-grad">{c.title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
        {c.kind === "level" && <div className="mt-4 flex justify-center"><Avatar id={me} size={56} /></div>}
        <Button variant="volt" className="mt-6 w-full" onClick={dismissCelebration}>Let&apos;s gooo ⚡</Button>
      </div>
    </div>
  );
}

export function LogDialog() {
  const { s, act, logOpen, setLogOpen } = useGame();
  const [actId, setActId] = useState(ACTIVITIES[0].id);
  const [mins, setMins] = useState(30);
  const [note, setNote] = useState("");
  const [penId, setPenId] = useState<string | null>(null);
  const [penNote, setPenNote] = useState("");
  useEffect(() => { if (logOpen) { setNote(""); setMins(30); setPenId(null); setPenNote(""); } }, [logOpen]);
  const a = ACTIVITIES.find((x) => x.id === actId)!;
  const xp = Math.round(a.xp * Math.min(2, Math.max(0.5, mins / 30)));
  const pens = s.penalties.filter((p) => p.on);
  return (
    <Dialog open={logOpen} onOpenChange={setLogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log to the storm ⚡</DialogTitle>
          <DialogDescription>Every honest log counts, wins and slip-ups alike.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="win">
          <TabsList className="w-full">
            <TabsTrigger value="win" className="flex-1">✨ Something good</TabsTrigger>
            <TabsTrigger value="slip" className="flex-1">🌧️ A slip-up</TabsTrigger>
          </TabsList>
          <TabsContent value="win">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {ACTIVITIES.map((x) => (
                <button key={x.id} onClick={() => setActId(x.id)}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] font-medium transition",
                    actId === x.id ? "border-volt/60 bg-yellow-400/10 text-foreground" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10")}>
                  <span className="text-xl">{x.emoji}</span>{x.label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <input className="input-base" placeholder={a.hint} value={note} onChange={(e) => setNote(e.target.value)} />
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Duration</span><span>{mins} min</span></div>
                <input type="range" min={10} max={120} step={5} value={mins} onChange={(e) => setMins(+e.target.value)} className="w-full" />
              </div>
              <Button className="w-full" size="lg" onClick={() => { if (act({ t: "activity", activityId: actId, minutes: mins, note })) setLogOpen(false); }}>
                <Zap /> Claim +{xp} XP
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Up to 8 manual logs a day. Rest counts as progress too.</p>
            </div>
          </TabsContent>
          <TabsContent value="slip">
            {!s.settings.penaltiesOn || pens.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Slip-ups are turned off in Settings. Self-compassion mode is on 💙</p>
            ) : (
              <>
                <p className="mb-3 rounded-xl bg-violet-500/10 p-3 text-xs text-violet-200">
                  No guilt trips here. Logging honestly earns a <b>+3 Honesty bonus</b>, and losses are capped at {s.settings.penaltyCap} XP a day. Your level never drops.
                </p>
                <div className="space-y-2">
                  {pens.map((p) => (
                    <button key={p.id} onClick={() => setPenId(p.id)}
                      className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition", penId === p.id ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                      {p.label}<span className="text-xs font-semibold text-violet-300">−{p.xp}</span>
                    </button>
                  ))}
                </div>
                <input className="input-base mt-3" placeholder="What triggered it? (optional, helps you spot patterns)" value={penNote} onChange={(e) => setPenNote(e.target.value)} />
                <Button variant="secondary" className="mt-3 w-full" disabled={!penId} onClick={() => { if (penId && act({ t: "penalty", penaltyId: penId, note: penNote })) setLogOpen(false); }}>
                  Log it honestly
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pad-safe sm:px-6 lg:pb-10">{children}</main>
      </div>
      <MobileNav />
      <Toasts />
      <Celebration />
      <LogDialog />
    </div>
  );
}
