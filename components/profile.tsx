"use client";

import { useState, type ReactNode } from "react";
import { Lock, Shield, Undo2 } from "lucide-react";
import { BADGES, consistency, lifetimeAura, rankOf, streakOf, userLogs } from "@/lib/engine";
import { CHARACTER, FRAMES, RANKS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { DailyGoal, LogEntry, Member } from "@/lib/types";
import { cn, dstr, fmtShort, plural, today, weekStart } from "@/lib/utils";
import { AreaTag, AuraChip, AvatarView, RankEmblem, Section, Stat, memberColor, pct, useLevel } from "./game";
import { BADGE_ICON } from "./icons";
import { Card } from "./ui/card";
import { List, ListRow } from "./ui/list";
import { Progress } from "./ui/progress";
import { Switch } from "./ui/switch";

const ROMAN = ["", "I", "II", "III"];

export function ProfileHero({ m, actions }: { m: Member; actions?: ReactNode }) {
  const { stats } = useGame();
  const L = useLevel(m.id);
  const rank = rankOf(stats(m.id)?.rankScore ?? 0);
  const next = RANKS[rank.tier + 1];
  const c = m.character ? CHARACTER[m.character] : undefined;
  const color = memberColor(m);
  const joined = new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return (
    <Card className="relative overflow-hidden p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 90% at 15% 0%, ${color}30, transparent 65%)` }} />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <AvatarView member={m} size={132} className="shrink-0 shadow-[0_20px_50px_-20px_rgba(0,0,0,.9)]" />
        <div className="min-w-0 flex-1">
          {c && !m.photo && <div className="eyebrow" style={{ color }}>{c.name} · {c.title}</div>}
          <h1 className="mt-1 font-display text-[32px] font-bold leading-tight tracking-tight">{m.name}</h1>
          <p className="text-[14px] text-muted-foreground">@{m.username} · Joined {joined}</p>
          {m.bio && <p className="mt-3 max-w-lg text-[15px]">{m.bio}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <RankEmblem tier={rank.tier} division={rank.division} size={46} />
              <div className="min-w-0">
                <div className="font-display text-[17px] font-semibold" style={{ color: rank.color }}>{rank.label}</div>
                <div className="text-[12px] text-muted-foreground">{!next ? "The top of the storm" : `${rank.toNext} ${rank.toNext === 1 ? "point" : "points"} to ${rank.division < 3 ? `${rank.name} ${ROMAN[rank.division + 1]}` : next.name === "Stormborn" ? next.name : `${next.name} I`}`}</div>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between text-[13px]"><span className="font-medium">Level {L.level} · {L.title}</span><span className="tabular-nums text-muted-foreground">{L.into}/{L.span}</span></div>
              <Progress value={L.pct * 100} className="mt-1.5 h-2" />
              <div className="mt-1 text-[11px] text-muted-foreground">{L.aura.toLocaleString("en-IN")} lifetime Aura Points</div>
            </div>
          </div>
        </div>
        {actions && <div className="flex shrink-0 gap-2 self-start">{actions}</div>}
      </div>
    </Card>
  );
}

export function ProfileStats({ id }: { id: string }) {
  const { s, stats } = useGame();
  const L = useLevel(id);
  const st = stats(id);
  const streak = streakOf(s, id);
  const done = userLogs(s, id).filter((l) => (l.kind === "habit" || l.kind === "todo" || l.kind === "activity") && l.xp > 0).length;
  const earned = Object.keys(s.badges[id] ?? {}).length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Stat label="Lifetime Aura" value={L.aura.toLocaleString("en-IN")} sub={`${Math.max(0, L.aura - lifetimeAura(userLogs(s, id).filter((l) => l.date < weekStart(today()))))} this week`} />
      <Stat label="Streak" value={<span className="inline-flex items-center gap-2">{streak.current}<span className="inline-flex items-center gap-0.5 text-[13px] font-normal text-ion" title="Streak shields"><Shield className="h-3.5 w-3.5" />{streak.shields}</span></span>} sub={`Best ${plural(streak.best, "day")}`} />
      <Stat label="Quests completed" value={done} />
      <Stat label="Life Vision" value={pct(st?.b30.vision)} sub="Last 30 days" />
      <Stat label="Consistency" value={`${st?.consistency ?? consistency(s, id, 30)}%`} sub="Days active, last 30" />
      <Stat label="Achievements" value={`${earned}/${BADGES.filter((b) => !b.legacy).length}`} />
    </div>
  );
}

export function AchievementGrid({ id }: { id: string }) {
  const { s } = useGame();
  const earned = s.badges[id] ?? {};
  const shown = BADGES.filter((b) => !b.legacy || earned[b.id]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {shown.map((b) => {
        const at = earned[b.id];
        const Icon = BADGE_ICON[b.id];
        return (
          <Card key={b.id} className={cn("flex flex-col items-center p-4 text-center", !at && "opacity-70 shadow-none", at && b.rare && "electric electric-gold")}>
            <span className={cn("relative grid h-16 w-16 place-items-center rounded-full", at ? "storm text-accent shadow-[0_0_24px_-6px_hsl(var(--accent)/.7)] ring-1 ring-accent/40" : "bg-secondary text-muted-foreground/50")}>
              <Icon className="h-7 w-7" strokeWidth={1.7} />
              {!at && <Lock className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card p-1 text-muted-foreground" />}
            </span>
            <div className={cn("mt-3 text-[14px] font-semibold", !at && "text-muted-foreground")}>{b.name}</div>
            <div className="text-[12px] text-muted-foreground">{at ? `Earned ${fmtShort(dstr(new Date(at)))}` : b.desc}</div>
            {b.rare && <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-accent/80">Rare</div>}
          </Card>
        );
      })}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  habit: "Daily quest", todo: "One-time quest", activity: "Logged activity", challenge: "Challenge", meetup: "Meetup", goal: "Goal",
  health: "Health log", career: "Career log", money: "Savings", reflect: "Reflection", penalty: "Slip-up", bonus: "Bonus",
};

/** The full Aura ledger: every point, where it came from, and when. */
export function AuraHistory() {
  const { s, me, act } = useGame();
  const [limit, setLimit] = useState(60);
  const t = today();
  const logs = [...userLogs(s, me)].sort((a, b) => b.ts - a.ts);
  const groups: { date: string; items: LogEntry[] }[] = [];
  for (const l of logs.slice(0, limit)) {
    const g = groups[groups.length - 1];
    if (g?.date === l.date) g.items.push(l);
    else groups.push({ date: l.date, items: [l] });
  }
  const total = lifetimeAura(logs);
  if (!logs.length) return <Card className="p-6 text-[15px] text-muted-foreground">No Aura Points yet. Complete a quest and it&apos;ll appear here, with exactly where it came from.</Card>;
  return (
    <div className="space-y-6">
      <p className="px-1 text-[13px] text-muted-foreground">{logs.length} entries · {total.toLocaleString("en-IN")} Aura Points in total. Each one is a single claim that can&apos;t be counted twice; undoing a quest removes its entry.</p>
      {groups.map((g) => (
        <div key={g.date}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="eyebrow">{g.date === t ? "Today" : new Date(`${g.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
            <span className="text-[12px] tabular-nums text-muted-foreground">+{g.items.reduce((a, l) => a + Math.max(0, l.xp), 0)}</span>
          </div>
          <List>
            {g.items.map((l) => (
              <ListRow key={l.id}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px]">{l.label}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                    <span>{KIND_LABEL[l.kind] ?? l.kind}</span>
                    {l.dim !== "vision" && <AreaTag dim={l.dim} dim2={l.dim2} />}
                    {l.private && <span>· private</span>}
                    <span>· {new Date(l.ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                </div>
                {l.kind === "activity" && l.date === t && (
                  <button type="button" onClick={() => act({ t: "logUndo", id: l.id })} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Undo ${l.label}`} title="Logged by mistake? Undo it today"><Undo2 className="h-4 w-4" /></button>
                )}
                <AuraChip value={l.xp} className={cn(l.xp < 0 && "text-muted-foreground")} />
              </ListRow>
            ))}
          </List>
        </div>
      ))}
      {logs.length > limit && <button className="w-full rounded-full bg-secondary py-2.5 text-[14px] font-medium text-muted-foreground hover:text-foreground" onClick={() => setLimit(limit + 100)}>Show older</button>}
    </div>
  );
}

export function FramePicker() {
  const { s, me, profile, updateProfile, toast } = useGame();
  const earned = s.badges[me] ?? {};
  const current = profile.frame ?? "classic";
  return (
    <Section title="Avatar frames" eyebrow="Cosmetics">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {FRAMES.map((f) => {
          const unlocked = !f.badge || !!earned[f.badge];
          const on = current === f.id;
          return (
            <button key={f.id} type="button" disabled={!unlocked} aria-pressed={on}
              onClick={async () => { if (on) return; const err = await updateProfile({ frame: f.id }); if (err) toast(err, "warn"); }}
              className={cn("panel flex flex-col items-center gap-2 p-3 text-center transition", on && "border-primary", !unlocked && "opacity-55")}>
              <AvatarView member={{ ...profile, frame: f.id === "classic" ? undefined : f.id }} size={52} />
              <span className="text-[13px] font-medium">{f.name}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">{!unlocked && <Lock className="h-3 w-3" />}{unlocked ? (on ? "Wearing" : "Unlocked") : f.hint}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

const GOALS: { v: DailyGoal; label: string }[] = [{ v: "auto", label: "Auto" }, { v: 50, label: "50" }, { v: 100, label: "100" }, { v: 150, label: "150" }, { v: 200, label: "200" }];

export function Preferences() {
  const { profile, updateProfile, toast } = useGame();
  const save = async (p: Parameters<typeof updateProfile>[0]) => { const err = await updateProfile(p); if (err) toast(err, "warn"); };
  return (
    <Section title="Daily rhythm and sharing">
      <List>
        <ListRow className="flex-col items-stretch gap-3 py-3.5 sm:flex-row sm:items-center">
          <div className="flex-1"><div className="text-[15px]">Daily objective</div><div className="text-[13px] text-muted-foreground">Auto sets an achievable target from the quests due each day.</div></div>
          <div className="flex gap-1.5">
            {GOALS.map((g) => (
              <button key={String(g.v)} type="button" onClick={() => save({ dailyGoal: g.v })} aria-pressed={profile.dailyGoal === g.v}
                className={cn("h-9 rounded-full px-3 text-[13px] font-medium tabular-nums transition", profile.dailyGoal === g.v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{g.label}</button>
            ))}
          </div>
        </ListRow>
        <ListRow>
          <div className="flex-1"><div className="text-[15px]">Share my activity</div><div className="text-[13px] text-muted-foreground">When off, cousins see your totals and scores but not what you completed, and nothing goes to the feed.</div></div>
          <Switch checked={profile.shareActivity} onCheckedChange={(v) => save({ shareActivity: v })} aria-label="Share my activity" />
        </ListRow>
      </List>
    </Section>
  );
}

