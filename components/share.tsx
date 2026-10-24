"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, Check, ChevronRight, Crown, Flame, LogOut, Pencil, Repeat, Sparkles, Target, TrendingUp, UserPlus, Users, X, Zap } from "lucide-react";
import { DIM, teamBonusFor } from "@/lib/catalog";
import { timeLeft } from "@/lib/engine";
import { contributorIds, highlights, isLive, participantIds, pendingInvites, shareProgress, type MemberProgress } from "@/lib/shared";
import { newId, useGame, useMember } from "@/lib/store";
import type { Habit, SharedQuest, ShareMember, Todo } from "@/lib/types";
import { addDays, cn, daysBetween, fmtShort, plural, timeAgo, today } from "@/lib/utils";
import { memberColor as memberTone } from "./avatars";
import { AreaTag, AuraChip, AvatarView, EmptyState, QuestGlyph } from "./game";
import { REACTIONS } from "./icons";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Switch } from "./ui/switch";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const scheduleLabel = (days?: number[]) =>
  !days || !days.length ? "Every day" : days.length === 5 && days.every((d) => d < 5) ? "Weekdays" : days.length === 2 && days[0] === 5 ? "Weekends" : days.map((d) => DAY_SHORT[d]).join(", ");

const STATUS_LABEL: Record<ShareMember["status"], string> = { pending: "Invited", accepted: "Joined", declined: "Declined", left: "Left" };
const STATUS_TONE: Record<ShareMember["status"], string> = {
  pending: "bg-arc/12 text-arc", accepted: "bg-success/12 text-success", declined: "bg-secondary text-muted-foreground", left: "bg-secondary text-muted-foreground",
};
export function StatusChip({ status }: { status: ShareMember["status"] }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

/** The rules of a shared quest in one sentence. */
export function rulesOf(sq: Pick<SharedQuest, "mode" | "kind" | "target" | "bonus" | "xp">) {
  if (sq.mode === "team") return `Team goal: every completion by anyone counts toward ${sq.target} together. Each completion earns its own ${sq.xp} Aura${sq.bonus ? `, and everyone who contributed earns +${sq.bonus} when the target is met` : ""}.`;
  return sq.kind === "habit"
    ? `Together: everyone completes it on their own days, with their own streak, Aura (${sq.xp} each time) and Life Balance.`
    : `Together: everyone completes it independently and earns their own ${sq.xp} Aura.`;
}

/* ------------------------------------------------------------------ */
/* Invite cousins                                                      */
/* ------------------------------------------------------------------ */
/**
 * Invite cousins to one of your quests or habits (which becomes a shared
 * one) or to a shared quest you're already in. Nothing reaches their quests
 * until they accept.
 */
export function InviteSheet({ open, onOpenChange, source, shareId }: { open: boolean; onOpenChange: (v: boolean) => void; source?: { type: "habit" | "todo"; id: string }; shareId?: string }) {
  const { s, me, act, toast } = useGame();
  const t = today();
  const sq = shareId ? s.shares.find((x) => x.id === shareId) : undefined;
  const src: Habit | Todo | undefined = source ? (source.type === "habit" ? s.habits.find((h) => h.id === source.id && h.userId === me) : s.todos.find((x) => x.id === source.id && x.userId === me)) : undefined;
  const others = s.members.filter((m) => m.id !== me);
  const statusOf = (id: string) => sq?.members[id]?.status;
  const canPick = (id: string) => !["pending", "accepted"].includes(statusOf(id) ?? "");
  const pickable = others.filter((m) => canPick(m.id)).map((m) => m.id);
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<SharedQuest["mode"]>("together");
  const [hasEnd, setHasEnd] = useState(false);
  const [endsOn, setEndsOn] = useState(addDays(t, 29));
  const [target, setTarget] = useState(20);
  const [bonus, setBonus] = useState(true);
  const [desc, setDesc] = useState("");
  useEffect(() => {
    if (!open) return;
    setPicked([]); setMode("together"); setHasEnd(false); setEndsOn(addDays(t, 29)); setTarget(20); setBonus(true); setDesc("");
  }, [open, t]);

  const kind = sq?.kind ?? source?.type ?? "habit";
  const q = sq ?? src;
  const days = sq ? sq.days : (src as Habit | undefined)?.days;
  const end = sq ? sq.endsOn : mode === "team" || hasEnd ? endsOn : undefined;
  const length = end ? daysBetween(t, end) + 1 : 0;
  const draft = sq ?? (q ? { mode, kind, target, bonus: mode === "team" && bonus ? teamBonusFor(length) : undefined, xp: q.xp } : undefined);
  const all = pickable.length > 0 && pickable.every((id) => picked.includes(id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = () => {
    if (!picked.length) return;
    const ok = sq
      ? act({ t: "shareInvite", id: sq.id, invite: picked })
      : source && act({ t: "shareCreate", id: newId(), source, mode, endsOn: end, target, bonus: mode === "team" && bonus, desc: desc.trim() || undefined, invite: picked });
    if (ok) { toast(picked.length === 1 ? "Invite sent" : `${picked.length} invites sent`, "info"); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invite cousins</DialogTitle>
          <DialogDescription>{sq ? "Ask more cousins to join. It shows up in their quests only once they accept." : "Do it together. It shows up in their quests only once they accept."}</DialogDescription>
        </DialogHeader>
        {!q ? (
          <p className="py-6 text-center text-[15px] text-muted-foreground">This quest isn&apos;t available any more.</p>
        ) : others.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-muted-foreground">Invitations need at least one other cousin. Invite them to the squad from Profile → Settings.</p>
        ) : (
          <div className="space-y-5">
            {/* preview */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-start gap-3 p-4" style={{ background: `linear-gradient(135deg, ${DIM[q.dim].color}14, transparent 60%)` }}>
                <QuestGlyph icon={q.icon} dim={q.dim} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] font-semibold leading-snug">{q.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                    <AreaTag dim={q.dim} dim2={q.dim2} />
                    <span>· {kind === "habit" ? `Habit · ${scheduleLabel(days)}` : "One-time quest"}</span>
                    <AuraChip value={q.xp} />
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3 text-[13px]">
                <Detail label="Starts">{sq ? fmtShort(sq.startsOn) : "Today"}</Detail>
                <Detail label="Ends">{end ? `${fmtShort(end)} · ${plural(length, "day")}` : "No end date"}</Detail>
                {kind === "habit" && <Detail label="Frequency">{scheduleLabel(days)}</Detail>}
                <Detail label="Reward">+{q.xp} Aura {kind === "habit" ? "each time" : "on completion"}</Detail>
              </dl>
              {draft && <p className="border-t border-border/70 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">{rulesOf(draft)}</p>}
              {sq?.desc && <p className="border-t border-border/70 px-4 py-3 text-[13px]">{sq.desc}</p>}
            </div>

            {!sq && (
              <>
                <div>
                  <span className="label">How it works</span>
                  <div className="grid grid-cols-2 gap-2">
                    <ModeButton on={mode === "together"} onClick={() => setMode("together")} icon={<Users className="h-4 w-4" />} title="Together" sub="Everyone does it, each with their own streak and Aura" />
                    <ModeButton on={mode === "team"} onClick={() => { setMode("team"); if (!hasEnd) setEndsOn(addDays(t, 29)); }} icon={<Target className="h-4 w-4" />} title="Team goal" sub="Everyone's completions add up to one target" />
                  </div>
                </div>
                {mode === "team" ? (
                  <div className="space-y-3 rounded-2xl bg-secondary/60 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block"><span className="label">Completions needed</span><input type="number" min={2} max={1000} inputMode="numeric" className="field bg-card" value={target} onChange={(e) => setTarget(Math.max(2, Math.min(1000, +e.target.value || 2)))} /></label>
                      <label className="block"><span className="label">Deadline</span><input type="date" className="field bg-card" min={t} max={addDays(t, 365)} value={endsOn} onChange={(e) => e.target.value && setEndsOn(e.target.value)} /></label>
                    </div>
                    <label className="flex items-center justify-between gap-3">
                      <span><span className="block text-[14px] font-medium">Team bonus</span><span className="block text-[12px] text-muted-foreground">+{teamBonusFor(length)} Aura for each cousin who contributed, once, when the target is met.</span></span>
                      <Switch checked={bonus} onCheckedChange={setBonus} aria-label="Team bonus" />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <label className="flex items-center justify-between gap-3">
                      <span><span className="block text-[14px] font-medium">End date</span><span className="block text-[12px] text-muted-foreground">Like a 30-day reading habit. Off means it keeps going.</span></span>
                      <Switch checked={hasEnd} onCheckedChange={setHasEnd} aria-label="Has an end date" />
                    </label>
                    {hasEnd && <input type="date" className="field mt-3 bg-card" min={t} max={addDays(t, 365)} value={endsOn} onChange={(e) => e.target.value && setEndsOn(e.target.value)} aria-label="Ends on" />}
                  </div>
                )}
                <label className="block"><span className="label">Note for your cousins (optional)</span><input className="field" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={240} placeholder="e.g. 20 minutes, any book you like" /></label>
              </>
            )}

            {/* cousins */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label mb-0">Cousins</span>
                {pickable.length > 1 && <button type="button" className="text-[13px] font-medium text-primary hover:opacity-80" onClick={() => setPicked(all ? [] : pickable)}>{all ? "Clear" : "Select all"}</button>}
              </div>
              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
                {others.map((m) => {
                  const st = statusOf(m.id);
                  const ok = canPick(m.id);
                  const on = picked.includes(m.id);
                  return (
                    <button key={m.id} type="button" disabled={!ok} role="checkbox" aria-checked={on} onClick={() => toggle(m.id)}
                      className={cn("flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition disabled:cursor-default", ok && "hover:bg-secondary/50")}>
                      <AvatarView member={m} size={38} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{m.name}</span><span className="block truncate text-[12px] text-muted-foreground">@{m.username}</span></span>
                      {st && <StatusChip status={st} />}
                      {ok && (
                        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md border-[1.5px] transition", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                          {on && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button size="lg" className="w-full" disabled={!picked.length} onClick={send}>
              <UserPlus />{picked.length ? `Send ${picked.length === 1 ? "invite" : `${picked.length} invites`}` : "Send invites"}
            </Button>
            <p className="-mt-2 text-center text-[12px] text-muted-foreground">Inviting, accepting and declining never award Aura. Completions do.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="truncate font-medium">{children}</dd></div>;
}

function ModeButton({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-2xl border p-3 text-left transition", on ? "border-primary bg-primary/[.07] shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border bg-card hover:bg-secondary/50")}>
      <span className={cn("flex items-center gap-1.5 text-[14px] font-semibold", on && "text-primary")}>{icon}{title}</span>
      <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{sub}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* A shared quest, opened                                              */
/* ------------------------------------------------------------------ */
export function ShareSheet({ open, onOpenChange, id }: { open: boolean; onOpenChange: (v: boolean) => void; id?: string }) {
  const { s } = useGame();
  const sq = id ? s.shares.find((x) => x.id === id) : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {sq ? <SharePanel sq={sq} onClose={() => onOpenChange(false)} /> : (
          <>
            <DialogHeader><DialogTitle>Shared quest</DialogTitle><DialogDescription>This shared quest isn&apos;t available.</DialogDescription></DialogHeader>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const pctOf = (m: MemberProgress) => (m.scheduled ? Math.round((100 * m.done) / m.scheduled) : 0);

/** Participants side by side: their own progress, streaks and Aura, plus the team total and friendly highlights. */
export function SharePanel({ sq, onClose }: { sq: SharedQuest; onClose?: () => void }) {
  const { s, me, act, openSheet } = useGame();
  const t = today();
  const p = shareProgress(s, sq, t);
  const hl = highlights(p);
  const live = isLive(sq, t);
  const mine = sq.members[me];
  const organiser = sq.createdBy === me;
  const myCopy = mine?.copyId ? (sq.kind === "habit" ? s.habits.find((h) => h.id === mine.copyId && h.userId === me) : s.todos.find((x) => x.id === mine.copyId && x.userId === me)) : undefined;
  const pending = Object.keys(sq.members).filter((id) => sq.members[id].status === "pending");
  const color = DIM[sq.dim].color;
  const rows = [...p.members].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : (a.status === "accepted" ? 0 : 1) - (b.status === "accepted" ? 0 : 1)));
  const respond = (accept: boolean) => act({ t: "shareRespond", id: sq.id, accept, copyId: newId() });
  const recent = p.members.flatMap((m) => m.dates.slice(0, 6).map((d) => ({ id: m.id, d, copy: sq.members[m.id].copyId! }))).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8);
  const status = sq.endedOn ? `Ended ${fmtShort(sq.endedOn)}` : sq.endsOn ? (sq.endsOn < t ? `Ended ${fmtShort(sq.endsOn)}` : timeLeft(sq.endsOn, t)) : "Ongoing";

  return (
    <div className="space-y-5">
      <div className="-mx-5 -mt-3 overflow-hidden px-5 pb-1 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6" style={{ background: `linear-gradient(160deg, ${color}1f, transparent 70%)` }}>
        <div className="flex items-start gap-3 pr-10">
          <QuestGlyph icon={sq.icon} dim={sq.dim} size={46} />
          <div className="min-w-0 flex-1">
            <div className="eyebrow" style={{ color }}>{sq.mode === "team" ? "Team quest" : sq.kind === "habit" ? "Shared habit" : "Shared quest"}</div>
            <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight">{sq.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
              <AreaTag dim={sq.dim} dim2={sq.dim2} />
              {sq.kind === "habit" && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{scheduleLabel(sq.days)}</span>}
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{status}</span>
              <AuraChip value={sq.xp} />
            </div>
          </div>
        </div>
        {sq.desc && <p className="mt-3 text-[14px]">{sq.desc}</p>}
        <p className="mt-2 text-[12px] text-muted-foreground">{rulesOf(sq)} Organised by {sq.createdBy === me ? "you" : s.members.find((m) => m.id === sq.createdBy)?.name ?? "a cousin"}.</p>
      </div>

      {mine?.status === "pending" && live && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-arc/30 bg-arc/[.08] p-4">
          <span className="min-w-0 flex-1 text-[14px]"><span className="font-semibold">You&apos;re invited.</span> <span className="text-muted-foreground">Accept and it joins your quests.</span></span>
          <Button size="sm" variant="secondary" onClick={() => respond(false)}>Decline</Button>
          <Button size="sm" onClick={() => respond(true)}><Check />Accept</Button>
        </div>
      )}

      {p.allDoneToday && live && <GroupBanner title={sq.title} ids={p.members.filter((m) => m.doneToday).map((m) => m.id)} />}

      {sq.mode === "team" && sq.target && (
        <div className="panel p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div><div className="eyebrow">Team progress</div><div className="mt-1 font-display text-[26px] font-bold tabular-nums leading-none">{Math.min(p.total, sq.target)}<span className="text-[15px] font-medium text-muted-foreground"> / {sq.target}</span></div></div>
            <div className="text-right text-[13px]"><div className="font-semibold tabular-nums">{Math.min(100, Math.round((100 * p.total) / sq.target))}%</div><div className="text-muted-foreground">{status}</div></div>
          </div>
          <TeamBar p={p} target={sq.target} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            {p.members.filter((m) => m.done > 0).map((m) => <ContributionKey key={m.id} id={m.id} n={m.dates.filter((d) => d >= sq.startsOn && (!sq.endsOn || d <= sq.endsOn)).length} />)}
            {!p.total && <span>No completions yet. The first one gets the team moving.</span>}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between px-1"><span className="eyebrow">Participants</span><Highlights hl={hl} team={sq.mode === "team"} /></div>
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((m) => <ParticipantRow key={m.id} m={m} kind={sq.kind} me={me} hl={hl} />)}
          {pending.map((id) => <PendingRow key={id} id={id} />)}
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <div className="eyebrow mb-2 px-1">Recent completions</div>
          <div className="space-y-1">{recent.map((r) => <Completion key={`${r.id}:${r.d}`} userId={r.id} date={r.d} refKey={sq.kind === "habit" ? `h:${r.copy}:${r.d}` : `todo:${r.copy}`} />)}</div>
        </div>
      )}

      {mine?.status === "accepted" && live && sq.kind === "habit" && myCopy && <ReminderRow habit={myCopy as Habit} />}

      <div className="flex flex-wrap gap-2 pt-1">
        {mine?.status === "accepted" && live && <Button variant="tinted" onClick={() => { onClose?.(); openSheet({ kind: "invite", shareId: sq.id }); }}><UserPlus />Invite cousins</Button>}
        {organiser && live && myCopy && <Button variant="secondary" onClick={() => { onClose?.(); openSheet({ kind: "quest", preset: { edit: { type: sq.kind, id: myCopy.id } } }); }}><Pencil />Edit for everyone</Button>}
        <span className="flex-1" />
        {mine?.status === "accepted" && live && !organiser && <ConfirmButton icon={<LogOut />} label="Leave" confirm="Leave · your progress stays" onConfirm={() => act({ t: "shareLeave", id: sq.id })} />}
        {organiser && !sq.endedOn && <ConfirmButton icon={<X />} label="End for everyone" confirm="End it · everyone keeps theirs" onConfirm={() => act({ t: "shareEnd", id: sq.id })} />}
      </div>
    </div>
  );
}

function ConfirmButton({ icon, label, confirm, onConfirm }: { icon: ReactNode; label: string; confirm: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(id); }, [armed]);
  return armed
    ? <Button variant="destructive" onClick={() => { setArmed(false); onConfirm(); }}>{confirm}</Button>
    : <Button variant="ghost" className="text-muted-foreground" onClick={() => setArmed(true)}>{icon}{label}</Button>;
}

function TeamBar({ p, target }: { p: ReturnType<typeof shareProgress>; target: number }) {
  const { s } = useGame();
  let used = 0;
  return (
    <div className="relative mt-3 flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${p.total} of ${target}`}>
      {p.members.map((m) => {
        const n = m.done;
        if (!n || used >= target) return null;
        const w = Math.min(n, target - used);
        used += w;
        const member = s.members.find((x) => x.id === m.id);
        const c = member ? memberTone(member) : "hsl(var(--primary))";
        return <span key={m.id} className="h-full transition-[width] duration-700" style={{ width: `${(100 * w) / target}%`, background: c }} />;
      })}
    </div>
  );
}


function ContributionKey({ id, n }: { id: string; n: number }) {
  const m = useMember(id);
  const { me } = useGame();
  return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: memberTone(m) }} />{id === me ? "You" : m.name} · {n}</span>;
}

function Highlights({ hl, team }: { hl: ReturnType<typeof highlights>; team: boolean }) {
  const { s, me } = useGame();
  const name = (ids: string[]) => ids.map((id) => (id === me ? "You" : s.members.find((m) => m.id === id)?.name ?? "")).join(" & ");
  const chips = [
    hl.consistent.length ? { icon: Crown, text: `Most consistent: ${name(hl.consistent)}` } : null,
    hl.streak.length ? { icon: Flame, text: `Longest streak: ${name(hl.streak)}` } : null,
    hl.improved.length ? { icon: TrendingUp, text: `Most improved: ${name(hl.improved)}` } : null,
    team && hl.contributions.length ? { icon: Target, text: `Most contributions: ${name(hl.contributions)}` } : null,
  ].filter(Boolean) as { icon: typeof Crown; text: string }[];
  if (!chips.length) return null;
  return (
    <div className="no-scrollbar flex max-w-[70%] gap-1.5 overflow-x-auto">
      {chips.map((c) => <span key={c.text} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-medium text-accent"><c.icon className="h-3 w-3" />{c.text}</span>)}
    </div>
  );
}

function ParticipantRow({ m, kind, me, hl }: { m: MemberProgress; kind: SharedQuest["kind"]; me: string; hl: ReturnType<typeof highlights> }) {
  const member = useMember(m.id);
  const you = m.id === me;
  const tone = memberTone(member);
  const crown = hl.consistent.includes(m.id) || hl.contributions.includes(m.id);
  return (
    <div className={cn("flex items-center gap-3 px-3.5 py-3", m.status !== "accepted" && "opacity-60")}>
      <div className="relative">
        <AvatarView member={member} size={40} />
        {m.doneToday && <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-success text-white ring-2 ring-card"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold">{you ? "You" : member.name}</span>
          {crown && <Crown className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Highlighted" />}
          {m.status === "left" && <StatusChip status="left" />}
        </div>
        {kind === "habit" ? (
          <>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pctOf(m)}%`, background: tone }} /></div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] tabular-nums text-muted-foreground">
              <span>{m.done}/{m.scheduled} done</span>
              <span>· {m.consistency === null ? "—" : `${m.consistency}%`}</span>
              <span className="inline-flex items-center gap-0.5">· <Flame className={cn("h-3 w-3", m.streak ? "text-[#FF8A4C]" : "")} />{m.streak}</span>
              {m.dueToday && !m.doneToday && m.status === "accepted" && <span>· due today</span>}
            </div>
          </>
        ) : (
          <div className="mt-0.5 text-[12px] text-muted-foreground">{m.done ? `Done ${fmtShort(m.dates[0])}` : "Not done yet"}</div>
        )}
      </div>
      <AuraChip value={m.aura} />
    </div>
  );
}

function PendingRow({ id }: { id: string }) {
  const member = useMember(id);
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 opacity-70">
      <AvatarView member={member} size={40} />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{member.name}</span>
      <StatusChip status="pending" />
    </div>
  );
}

/** One completion, with positive reactions from the others (never Aura). */
function Completion({ userId, date, refKey }: { userId: string; date: string; refKey: string }) {
  const { s, me, act } = useGame();
  const member = useMember(userId);
  const ev = s.feed.find((e) => e.userId === userId && e.ref === refKey);
  const t = today();
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
      <AvatarView member={member} size={28} frame={false} />
      <span className="min-w-0 flex-1 truncate text-[13px]"><span className="font-medium">{userId === me ? "You" : member.name}</span> <span className="text-muted-foreground">completed it · {date === t ? "today" : date === addDays(t, -1) ? "yesterday" : fmtShort(date)}</span></span>
      {ev && (
        <div className="flex shrink-0 items-center gap-1">
          {REACTIONS.map((r) => {
            const n = Object.values(ev.reactions).filter((k) => k === r.id).length;
            const on = ev.reactions[me] === r.id;
            if (userId === me && !n) return null;
            return (
              <button key={r.id} type="button" disabled={userId === me} onClick={() => act({ t: "react", id: ev.id, kind: on ? null : r.id })} aria-pressed={on} title={r.label} aria-label={userId === me ? `${n} ${r.label}` : `${on ? "Remove" : "React"}: ${r.label}`}
                className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] transition disabled:cursor-default", on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <r.icon className={cn("h-3.5 w-3.5", on && "fill-current")} />{n > 0 && <span className="tabular-nums">{n}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric" });

/** Your own reminder time for a habit; nobody else's schedule changes. */
function ReminderRow({ habit }: { habit: Habit }) {
  const { act } = useGame();
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
      <span className="flex items-start gap-2.5">
        <Bell className="mt-0.5 h-4 w-4 text-primary" />
        <span><span className="block text-[14px] font-medium">My reminder</span><span className="block text-[12px] text-muted-foreground">Just for you. Sent only if it&apos;s still open, and only if you turned on habit reminders.</span></span>
      </span>
      <select className="field h-10 w-auto min-w-[110px]" value={habit.remindAt ?? ""} onChange={(e) => act({ t: "habitEdit", id: habit.id, habit: { remindAt: e.target.value === "" ? null : +e.target.value } })} aria-label="Reminder time">
        <option value="">None</option>
        {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
      </select>
    </label>
  );
}

/** "Everyone completed today's …": lightning, and the faces who did it. */
export function GroupBanner({ title, ids, compact }: { title: string; ids: string[]; compact?: boolean }) {
  const { s } = useGame();
  return (
    <div className={cn("electric relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,hsl(var(--primary)/.14),hsl(var(--arc)/.12))]", compact ? "p-3" : "p-4")}>
      <svg aria-hidden viewBox="0 0 24 24" className="fx h-8 w-8 shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))] motion-safe:animate-breathe fx-anim"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" /></svg>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">Everyone completed today&apos;s {title}!</div>
        <div className="mt-1 flex -space-x-1.5">{ids.map((id) => { const m = s.members.find((x) => x.id === id); return m ? <AvatarView key={id} member={m} size={24} frame={false} className="ring-2 ring-card rounded-full" /> : null; })}</div>
      </div>
      <Sparkles className="h-5 w-5 shrink-0 text-accent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Invitations and shared quests in My Quests                          */
/* ------------------------------------------------------------------ */
export function InvitationCard({ sq }: { sq: SharedQuest }) {
  const { act, openSheet } = useGame();
  const { me } = useGame();
  const m = sq.members[me];
  const from = useMember(m.invitedBy);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4">
        <AvatarView member={from} size={36} />
        <div className="min-w-0 flex-1 text-[14px]"><span className="font-semibold">{from.name}</span> <span className="text-muted-foreground">invited you · {timeAgo(m.invitedAt)}</span></div>
      </div>
      <button type="button" onClick={() => openSheet({ kind: "share", id: sq.id })} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-secondary/60 p-3 text-left transition hover:bg-secondary">
        <QuestGlyph icon={sq.icon} dim={sq.dim} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{sq.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            <AreaTag dim={sq.dim} />
            <span>· {sq.mode === "team" ? `Team goal of ${sq.target}` : sq.kind === "habit" ? scheduleLabel(sq.days) : "One-time"}</span>
            {sq.endsOn && <span>· until {fmtShort(sq.endsOn)}</span>}
            <AuraChip value={sq.xp} />
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 p-4">
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{participantIds(sq).length} {participantIds(sq).length === 1 ? "cousin" : "cousins"} in so far</span>
        <Button size="sm" variant="secondary" onClick={() => act({ t: "shareRespond", id: sq.id, accept: false })}>Decline</Button>
        <Button size="sm" onClick={() => act({ t: "shareRespond", id: sq.id, accept: true, copyId: newId() })}><Check />Accept</Button>
      </div>
    </Card>
  );
}

/** Received and sent invitations, and every shared quest you're in. */
export function SharedHub({ focus }: { focus?: string | null }) {
  const { s, me, openSheet } = useGame();
  const t = today();
  const received = pendingInvites(s, me);
  const answered = s.shares.filter((sq) => sq.members[me] && sq.members[me].invitedBy !== me && sq.members[me].status !== "pending").slice(0, 6);
  const mine = s.shares.filter((sq) => sq.members[me]?.status === "accepted");
  const active = mine.filter((sq) => isLive(sq, t));
  const past = s.shares.filter((sq) => sq.members[me]?.copyId && !isLive(sq, t));
  const sent = s.shares.filter((sq) => Object.entries(sq.members).some(([id, m]) => id !== me && m.invitedBy === me));
  const [tab, setTab] = useState<"received" | "sent">("received");
  useEffect(() => { if (focus) openSheet({ kind: "share", id: focus }); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-10">
      <section id="invites" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="font-display text-[20px] font-semibold tracking-tight">Invitations</h2>
          <div className="inline-flex rounded-full bg-secondary p-1 text-[13px] font-medium">
            {(["received", "sent"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("rounded-full px-3.5 py-1.5 capitalize transition", tab === k ? "bg-card text-foreground shadow-card" : "text-muted-foreground")}>
                {k}{k === "received" && received.length > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{received.length}</span>}
              </button>
            ))}
          </div>
        </div>
        {tab === "received" ? (
          <div className="space-y-3">
            {received.length === 0 && <Card><EmptyState title="No invitations waiting" body="When a cousin invites you to a quest or habit, it lands here. Nothing joins your quests until you accept." /></Card>}
            <div className="grid gap-3 md:grid-cols-2">{received.map((sq) => <InvitationCard key={sq.id} sq={sq} />)}</div>
            {answered.length > 0 && (
              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
                {answered.map((sq) => <AnsweredRow key={sq.id} sq={sq} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sent.length === 0 && <Card><EmptyState title="Nothing sent yet" body="Open any quest or habit and tap the cousins icon to invite them. You'll see who joined, who declined and who hasn't answered yet." /></Card>}
            {sent.map((sq) => <SentCard key={sq.id} sq={sq} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 px-1 font-display text-[20px] font-semibold tracking-tight">Shared quests and habits</h2>
        {active.length === 0 ? (
          <Card><EmptyState title="Nothing shared yet" body="Invite cousins to any quest or habit. Everyone keeps their own progress, and you can see each other's side by side." /></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{active.map((sq) => <SharedCard key={sq.id} sq={sq} />)}</div>
        )}
        {past.length > 0 && (
          <div className="mt-6">
            <div className="eyebrow mb-2 px-1">Finished or left</div>
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
              {past.map((sq) => (
                <button key={sq.id} type="button" onClick={() => openSheet({ kind: "share", id: sq.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                  <QuestGlyph icon={sq.icon} dim={sq.dim} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{sq.title}</span>
                  <span className="text-[12px] text-muted-foreground">{sq.endedOn ? `Ended ${fmtShort(sq.endedOn)}` : sq.endsOn ? `Ended ${fmtShort(sq.endsOn)}` : "Left"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AnsweredRow({ sq }: { sq: SharedQuest }) {
  const { me, openSheet } = useGame();
  const m = sq.members[me];
  const from = useMember(m.invitedBy);
  return (
    <button type="button" onClick={() => openSheet({ kind: "share", id: sq.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
      <AvatarView member={from} size={28} frame={false} />
      <span className="min-w-0 flex-1 truncate text-[14px]"><span className="font-medium">{sq.title}</span> <span className="text-muted-foreground">from {from.name}</span></span>
      <StatusChip status={m.status} />
    </button>
  );
}

function SentCard({ sq }: { sq: SharedQuest }) {
  const { s, me, openSheet } = useGame();
  const invited = Object.entries(sq.members).filter(([id, m]) => id !== me && m.invitedBy === me);
  const counts = { accepted: 0, pending: 0, declined: 0, left: 0 } as Record<ShareMember["status"], number>;
  for (const [, m] of invited) counts[m.status]++;
  return (
    <Card className="p-4">
      <button type="button" onClick={() => openSheet({ kind: "share", id: sq.id })} className="flex w-full items-center gap-3 text-left">
        <QuestGlyph icon={sq.icon} dim={sq.dim} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{sq.title}</span>
          <span className="block text-[12px] text-muted-foreground">{[counts.accepted && `${counts.accepted} joined`, counts.pending && `${counts.pending} waiting`, counts.declined && `${counts.declined} declined`, counts.left && `${counts.left} left`].filter(Boolean).join(" · ")}{!isLive(sq) && " · ended"}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {invited.map(([id, m]) => {
          const member = s.members.find((x) => x.id === id);
          if (!member) return null;
          return <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-1.5 text-[12px]"><AvatarView member={member} size={22} frame={false} />{member.name}<StatusChip status={m.status} /></span>;
        })}
      </div>
    </Card>
  );
}

/** A shared quest at a glance: faces, today's state and the team total. Opens the full panel. */
export function SharedCard({ sq }: { sq: SharedQuest }) {
  const { s, me, openSheet } = useGame();
  const t = today();
  const p = shareProgress(s, sq, t);
  const ids = contributorIds(sq).filter((id) => sq.members[id].status === "accepted");
  const doneToday = p.members.filter((m) => m.doneToday && m.status === "accepted").length;
  const dueToday = p.members.filter((m) => m.dueToday && m.status === "accepted").length;
  const color = DIM[sq.dim].color;
  return (
    <button type="button" onClick={() => openSheet({ kind: "share", id: sq.id })} className="panel group flex w-full flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-start gap-3">
        <QuestGlyph icon={sq.icon} dim={sq.dim} size={40} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow" style={{ color }}>{sq.mode === "team" ? "Team quest" : sq.kind === "habit" ? "Shared habit" : "Shared quest"}</div>
          <div className="truncate text-[15px] font-semibold">{sq.title}</div>
          <div className="text-[12px] text-muted-foreground">{sq.endsOn ? timeLeft(sq.endsOn, t) : sq.kind === "habit" ? scheduleLabel(sq.days) : "One-time"}{sq.createdBy === me ? " · you organise" : ""}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
      {sq.mode === "team" && sq.target ? (
        <div>
          <Progress value={(100 * p.total) / sq.target} color={color} className="h-2" />
          <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{Math.min(p.total, sq.target)} of {sq.target} together</div>
        </div>
      ) : sq.kind === "habit" && dueToday > 0 ? (
        <div className="text-[12px] text-muted-foreground"><Zap className="mr-1 inline h-3.5 w-3.5 text-primary" />{doneToday} of {dueToday} done today</div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">{ids.map((id) => { const m = s.members.find((x) => x.id === id); return m ? <AvatarView key={id} member={m} size={28} frame={false} className="rounded-full ring-2 ring-card" /> : null; })}</div>
        {p.allDoneToday && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" />Everyone done today</span>}
      </div>
    </button>
  );
}

/** The row button that opens a quest's sharing: invite cousins, or its shared panel if it's already shared. */
export function ShareButton({ type, item }: { type: "habit" | "todo"; item: Habit | Todo }) {
  const { s, me, openSheet } = useGame();
  const sq = item.shareId ? s.shares.find((x) => x.id === item.shareId) : undefined;
  const shared = !!sq && sq.members[me]?.status === "accepted";
  const n = sq ? participantIds(sq).length : 0;
  if (!shared && ((item as Habit).archivedOn || (item as Todo).done)) return null;
  return (
    <button type="button" onClick={() => openSheet(shared ? { kind: "share", id: sq!.id } : { kind: "invite", source: { type, id: item.id } })}
      aria-label={shared ? `Shared with ${n - 1} ${n - 1 === 1 ? "cousin" : "cousins"}: open` : `Invite cousins to ${item.title}`} title={shared ? "Shared: see everyone's progress" : "Invite cousins"}
      className={cn("relative grid h-8 shrink-0 place-items-center rounded-full transition", shared ? "gap-1 bg-primary/10 px-2 text-primary hover:bg-primary/15" : "w-8 text-muted-foreground/70 hover:bg-secondary hover:text-foreground")}>
      {shared ? <span className="flex items-center gap-1 text-[12px] font-semibold"><Users className="h-3.5 w-3.5" />{n}</span> : <UserPlus className="h-4 w-4" />}
    </button>
  );
}

