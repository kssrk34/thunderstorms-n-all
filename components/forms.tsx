"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Camera, Check, Eye, EyeOff, Lock, Minus, Plus, RotateCcw, UserPlus, Users, X } from "lucide-react";
import {
  ACTIVE_DIMS, AURA_LIMITS, CHALLENGE_AURA, CHARACTERS, DIM, EFFORT, GOAL_SUGGESTIONS, MISSION_SUGGESTIONS, PRIVATE_BY_DEFAULT, QUEST_ICONS,
  QUEST_SUGGESTIONS, type QuestKind,
} from "@/lib/catalog";
import { newId, useGame, type GoalPreset, type QuestPreset } from "@/lib/store";
import type { ActiveDim, Challenge, Habit } from "@/lib/types";
import { cn, today } from "@/lib/utils";
import { CharacterArt } from "./avatars";
import { PhotoCropper } from "./cropper";
import { AreaTag, AvatarView, QuestGlyph, SuggestionChip } from "./game";
import { AREA_ICON, QUEST_ICON } from "./icons";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

/* ---------- small building blocks ---------- */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Pick one of the nine dimensions (Life Vision is calculated, so it isn't offered). */
export function AreaPicker({ value, onChange, exclude, allowNone }: { value?: ActiveDim; onChange: (d: ActiveDim | undefined) => void; exclude?: ActiveDim; allowNone?: boolean }) {
  return (
    <div className="no-scrollbar fade-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6" role="radiogroup">
      {allowNone && (
        <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(undefined)}
          className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition", !value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>
          Just one
        </button>
      )}
      {ACTIVE_DIMS.filter((d) => d !== exclude).map((id) => {
        const d = DIM[id];
        const Icon = AREA_ICON[id];
        const on = value === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition", on ? "border-transparent text-[#05070E]" : "border-border bg-card text-foreground hover:bg-secondary/60")}
            style={on ? { background: d.color, boxShadow: `0 0 16px ${d.color}66` } : undefined}>
            <Icon className="h-3.5 w-3.5" style={on ? undefined : { color: d.color }} />
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

function IconPicker({ value, onChange, dim }: { value: string; onChange: (i: string) => void; dim: ActiveDim }) {
  return (
    <div className="no-scrollbar fade-x -mx-5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-6 sm:px-6" role="radiogroup" aria-label="Icon">
      {QUEST_ICONS.map((k) => {
        const Icon = QUEST_ICON[k];
        const on = value === k;
        return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onChange(k)} aria-label={k}
            className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition", on ? "ring-2" : "bg-secondary text-muted-foreground hover:text-foreground")}
            style={on ? { background: `${DIM[dim].color}22`, color: DIM[dim].color, ["--tw-ring-color" as string]: DIM[dim].color } : undefined}>
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}

/** Aura Points by effort, with fine-tuning in steps of 5 inside the allowed range. */
function EffortPicker({ kind, value, onChange }: { kind: "daily" | "once"; value: number; onChange: (v: number) => void }) {
  const [min, max] = AURA_LIMITS[kind];
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {EFFORT[kind].map((e) => (
          <button key={e.label} type="button" onClick={() => onChange(e.xp)} aria-pressed={value === e.xp}
            className={cn("rounded-xl border px-1 py-2 text-center transition", value === e.xp ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50")}>
            <span className="block text-[13px] font-medium">{e.label}</span>
            <span className="block text-[11px] tabular-nums text-muted-foreground">{e.xp}</span>
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-secondary/60 px-2 py-1.5">
        <button type="button" aria-label="5 fewer Aura Points" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 5))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-card disabled:opacity-30"><Minus className="h-4 w-4" /></button>
        <span className="text-[14px]"><span className="font-display text-[18px] font-semibold tabular-nums text-primary">{value}</span> <span className="text-muted-foreground">Aura Points {kind === "daily" ? "each time" : ""}</span></span>
        <button type="button" aria-label="5 more Aura Points" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 5))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-card disabled:opacity-30"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const REMIND_HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function DaysPicker({ value, onChange }: { value?: number[]; onChange: (d?: number[]) => void }) {
  const on = (d: number) => !value || value.includes(d);
  const toggle = (d: number) => {
    const cur = value ?? [0, 1, 2, 3, 4, 5, 6];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort();
    onChange(next.length === 0 || next.length === 7 ? undefined : next);
  };
  return (
    <div className="flex gap-1.5" role="group" aria-label="Days of the week">
      {DAY_LETTERS.map((l, d) => (
        <button key={d} type="button" onClick={() => toggle(d)} aria-pressed={on(d)} aria-label={DAY_NAMES[d]}
          className={cn("h-9 flex-1 rounded-full text-[13px] font-medium transition", on(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function VisibilityRow({ value, onChange, what = "quest" }: { value: boolean; onChange: (v: boolean) => void; what?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
      <span className="flex items-start gap-2.5">
        {value ? <EyeOff className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <Eye className="mt-0.5 h-4 w-4 text-primary" />}
        <span>
          <span className="block text-[14px] font-medium">{value ? "Private" : "Visible to cousins"}</span>
          <span className="block text-[12px] text-muted-foreground">{value ? `Cousins see the Aura Points, not what this ${what} is.` : `Shows in the squad feed when you complete it.`}</span>
        </span>
      </span>
      <Switch checked={!value} onCheckedChange={(v) => onChange(!v)} aria-label="Visible to cousins" />
    </label>
  );
}

/* ---------- quests ---------- */
const KIND_COPY: Record<QuestKind, { label: string; placeholder: string; hint: string }> = {
  daily: { label: "Daily", placeholder: "e.g. Morning workout", hint: "Repeats on the days you choose. Check it off each time." },
  once: { label: "One-time", placeholder: "e.g. Set up a monthly budget", hint: "Do it once, check it off, done." },
  challenge: { label: "Mission", placeholder: "e.g. Three workouts each this week", hint: "A target with a deadline: solo, or with your cousins." },
};

type MissionDraft = Pick<Challenge, "period" | "scope" | "track" | "target" | "unit" | "desc" | "participants">;

/** What a submitted quest form made: its kind, and for a new habit or one-time quest, which one and whether to invite cousins next. */
export interface QuestDone { kind: QuestKind; created?: { type: "habit" | "todo"; id: string }; invite?: boolean }

export function QuestForm({ preset, onDone, allowChallenge = true, submitLabel, onInvite }: { preset?: QuestPreset; onDone: (r: QuestDone) => void; allowChallenge?: boolean; submitLabel?: string; onInvite?: (x: { source?: { type: "habit" | "todo"; id: string }; shareId?: string }) => void }) {
  const { s, me, act } = useGame();
  const editing = preset?.edit;
  const base = editing ? (editing.type === "habit" ? s.habits.find((h) => h.id === editing.id) : s.todos.find((x) => x.id === editing.id)) : undefined;
  const lockedAura = editing?.type === "todo" && !!(base as { done?: boolean } | undefined)?.done;
  // a shared copy: only the organiser changes the quest itself; everyone changes their own reminder, visibility and goal
  const share = base?.shareId ? s.shares.find((x) => x.id === base.shareId && !x.endedOn && (!x.endsOn || x.endsOn >= today()) && x.members[me]?.status === "accepted") : undefined;
  const guest = !!share && share.createdBy !== me;
  const [kind, setKind] = useState<QuestKind>(editing ? (editing.type === "habit" ? "daily" : "once") : preset?.kind ?? "daily");
  const [title, setTitle] = useState(base?.title ?? preset?.title ?? "");
  const [dim, setDim] = useState<ActiveDim>(base?.dim ?? preset?.dim ?? "health");
  const [dim2, setDim2] = useState<ActiveDim | undefined>(base?.dim2);
  const [icon, setIcon] = useState(base?.icon ?? preset?.icon ?? "bolt");
  const [xp, setXp] = useState<number>(base?.xp ?? preset?.xp ?? 20);
  const [days, setDays] = useState<number[] | undefined>((base as Habit | undefined)?.days);
  const [priv, setPriv] = useState<boolean>(base ? !!base.private : PRIVATE_BY_DEFAULT.includes(preset?.dim ?? "health"));
  const [privTouched, setPrivTouched] = useState(!!base);
  const [goalId, setGoalId] = useState(base?.goalId ?? preset?.goalId ?? "");
  const [remindAt, setRemindAt] = useState<number | null>((base as Habit | undefined)?.remindAt ?? null);
  const [invite, setInvite] = useState(!!preset?.invite);
  const [ch, setCh] = useState<MissionDraft>({ period: "weekly", scope: "team", track: "quests", target: 3, unit: "quests", desc: "", participants: [] });
  const goals = s.goals.filter((g) => g.userId === me && !g.done);
  const others = s.members.filter((m) => m.id !== me);
  const copy = KIND_COPY[kind];
  const pickDim = (d: ActiveDim) => {
    setDim(d);
    if (dim2 === d) setDim2(undefined);
    if (!privTouched) setPriv(PRIVATE_BY_DEFAULT.includes(d));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const q = { title: t, icon, dim, dim2, xp, goalId: goalId || undefined, private: priv };
    const id = newId();
    let ok: boolean;
    if (editing?.type === "habit") ok = act({ t: "habitEdit", id: editing.id, habit: { ...q, days, remindAt } });
    else if (editing?.type === "todo") ok = act({ t: "todoEdit", id: editing.id, todo: q });
    else if (kind === "daily") ok = act({ t: "habitAdd", id, habit: { ...q, days, remindAt } });
    else if (kind === "once") ok = act({ t: "todoAdd", id, todo: q });
    else ok = act({ t: "chCreate", id: newId(), ch: { title: t, icon, dim, ...ch, scope: ch.participants.length ? ch.scope : "solo", unit: ch.track === "quests" ? ch.unit || "quests" : ch.unit } });
    if (ok) onDone(!editing && kind !== "challenge" ? { kind, created: { type: kind === "daily" ? "habit" : "todo", id }, invite } : { kind });
  };

  const ideas = kind === "challenge" ? [] : QUEST_SUGGESTIONS.filter((x) => x.kind === kind);

  return (
    <form onSubmit={submit} className="space-y-5">
      {!editing && (
        <Tabs value={kind} onValueChange={(v) => { setKind(v as QuestKind); if (v === "once" && xp > AURA_LIMITS.once[1]) setXp(20); if (v === "daily" && xp > AURA_LIMITS.daily[1]) setXp(40); }}>
          <TabsList className="flex w-full">
            {(["daily", "once", ...(allowChallenge ? ["challenge" as const] : [])] as QuestKind[]).map((k) => <TabsTrigger key={k} value={k}>{KIND_COPY[k].label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {share && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary/[.06] px-4 py-3 text-[13px]">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{guest ? <><span className="font-medium">Shared by {s.members.find((m) => m.id === share.createdBy)?.name ?? "a cousin"}.</span> <span className="text-muted-foreground">Only they can change the quest itself. Your reminder, visibility and goal are yours.</span></> : <><span className="font-medium">Shared quest.</span> <span className="text-muted-foreground">Changes to the name, dimension, Aura and schedule apply to everyone in it.</span></>}</span>
        </div>
      )}

      {!guest && (
        <div>
          <input className="field h-12 text-[17px]" autoFocus={!editing} placeholder={copy.placeholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Name" />
          <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">{copy.hint}</p>
        </div>
      )}

      {!editing && (
        <div>
          <span className="label">Ideas</span>
          <div className="flex flex-wrap gap-2">
            {kind === "challenge"
              ? MISSION_SUGGESTIONS.map((x) => (
                <SuggestionChip key={x.title} active={title === x.title} onClick={() => { setTitle(x.title); setDim(x.dim); setIcon(x.icon); setCh({ ...ch, period: x.period, scope: x.scope, track: x.track, target: x.target, unit: x.unit, desc: x.desc, participants: x.scope === "solo" ? [] : ch.participants.length ? ch.participants : others.map((m) => m.id) }); }}>
                  {x.title}
                </SuggestionChip>
              ))
              : ideas.map((x) => (
                <SuggestionChip key={x.title} active={title === x.title} onClick={() => { setTitle(x.title); pickDim(x.dim); setIcon(x.icon); setXp(x.xp); }}>
                  {x.title}
                </SuggestionChip>
              ))}
          </div>
        </div>
      )}

      {!guest && <div>
        <span className="label">Life dimension</span>
        <AreaPicker value={dim} onChange={(d) => d && pickDim(d)} />
      </div>}
      {kind !== "challenge" && !lockedAura && !guest && (
        <div>
          <span className="label">Also counts toward (optional)</span>
          <AreaPicker value={dim2} onChange={setDim2} exclude={dim} allowNone />
          {dim2 && <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">Its Aura Points are split evenly: {Math.ceil(xp / 2)} to {DIM[dim].short}, {Math.floor(xp / 2)} to {DIM[dim2].short}.</p>}
        </div>
      )}
      {!guest && <div><span className="label">Icon</span><IconPicker value={icon} onChange={setIcon} dim={dim} /></div>}

      {kind !== "challenge" ? (
        <div className="space-y-5">
          {!lockedAura && !guest && <div><span className="label">Effort</span><EffortPicker kind={kind} value={xp} onChange={setXp} /></div>}
          {kind === "daily" && !guest && <div><span className="label">Due on</span><DaysPicker value={days} onChange={setDays} /></div>}
          {kind === "daily" && (
            <Field label="Personal reminder (optional)" hint="Only for you, only if it's still open, and only if habit reminders are on in Profile, Notifications.">
              <select className="field" value={remindAt ?? ""} onChange={(e) => setRemindAt(e.target.value === "" ? null : +e.target.value)}>
                <option value="">No reminder</option>
                {REMIND_HOURS.map((h) => <option key={h} value={h}>{new Date(2000, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric" })}</option>)}
              </select>
            </Field>
          )}
          {goals.length > 0 && !lockedAura && (
            <Field label="Supports a goal">
              <select className="field" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </Field>
          )}
          <VisibilityRow value={priv} onChange={(v) => { setPriv(v); setPrivTouched(true); }} />
          {!editing && others.length > 0 && onInvite && (
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
              <span className="flex items-start gap-2.5">
                <UserPlus className="mt-0.5 h-4 w-4 text-primary" />
                <span><span className="block text-[14px] font-medium">Invite cousins</span><span className="block text-[12px] text-muted-foreground">Pick who to invite next. It joins their quests only if they accept.</span></span>
              </span>
              <Switch checked={invite} onCheckedChange={setInvite} aria-label="Invite cousins after adding" />
            </label>
          )}
          {editing && base && onInvite && !lockedAura && (
            <Button type="button" variant="tinted" className="w-full" onClick={() => onInvite(share ? { shareId: share.id } : { source: { type: editing.type, id: editing.id } })}><UserPlus />{share ? "Invite more cousins" : "Invite cousins"}</Button>
          )}
        </div>
      ) : (
        <MissionFields ch={ch} setCh={setCh} dim={dim} others={others} />
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!title.trim()}>{submitLabel ?? (editing ? "Save changes" : kind === "challenge" ? "Start mission" : invite && onInvite ? "Add and invite" : "Add quest")}</Button>
    </form>
  );
}

function MissionFields({ ch, setCh, dim, others }: { ch: MissionDraft; setCh: (c: MissionDraft) => void; dim: ActiveDim; others: { id: string; name: string; color: string; photo?: string; character?: string; frame?: string }[] }) {
  const together = ch.participants.length > 0;
  return (
    <div className="space-y-5">
      <div>
        <span className="label">Deadline</span>
        <Tabs value={ch.period} onValueChange={(v) => setCh({ ...ch, period: v as Challenge["period"] })}>
          <TabsList className="flex w-full"><TabsTrigger value="daily">Today</TabsTrigger><TabsTrigger value="weekly">7 days</TabsTrigger><TabsTrigger value="monthly">30 days</TabsTrigger></TabsList>
        </Tabs>
      </div>
      {others.length > 0 && (
        <div>
          <span className="label">Invite cousins</span>
          <div className="flex flex-wrap gap-2">
            {others.map((m) => {
              const on = ch.participants.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => setCh({ ...ch, participants: on ? ch.participants.filter((x) => x !== m.id) : [...ch.participants, m.id] })}
                  className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[14px] transition", on ? "border-primary bg-primary/10" : "border-border bg-card")}>
                  <AvatarView member={m} size={26} frame={false} /> {m.name}{on && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
          {together && (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {([["team", "Team", "Everyone hits their own target"], ["squad", "Shared", "One total, together"], ["solo", "Race", "Each for themselves"]] as const).map(([id, label, sub]) => (
                <button key={id} type="button" onClick={() => setCh({ ...ch, scope: id })} aria-pressed={ch.scope === id}
                  className={cn("rounded-xl border px-2 py-2 text-left transition", ch.scope === id ? "border-primary bg-primary/10" : "border-border bg-card")}>
                  <span className="block text-[13px] font-medium">{label}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <span className="label">How progress counts</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" aria-pressed={ch.track === "quests"} onClick={() => setCh({ ...ch, track: "quests", unit: ch.unit || "quests" })}
            className={cn("rounded-xl border px-3 py-2.5 text-left transition", ch.track === "quests" ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <span className="block text-[13px] font-medium">Automatically</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">Each completed {DIM[dim].short} quest counts</span>
          </button>
          <button type="button" aria-pressed={ch.track === "manual"} onClick={() => setCh({ ...ch, track: "manual" })}
            className={cn("rounded-xl border px-3 py-2.5 text-left transition", ch.track === "manual" ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <span className="block text-[13px] font-medium">Log it yourself</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">Pages, km, calls: you add progress</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={ch.scope === "squad" && together ? "Shared target" : "Target each"}><input type="number" min={1} inputMode="numeric" className="field" value={ch.target} onChange={(e) => setCh({ ...ch, target: Math.max(1, +e.target.value || 1) })} /></Field>
        <Field label="Unit"><input className="field" value={ch.unit} maxLength={20} onChange={(e) => setCh({ ...ch, unit: e.target.value })} placeholder="quests, pages, km" /></Field>
      </div>
      <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-[13px] text-muted-foreground">
        Finishing earns <span className="font-semibold text-primary">{CHALLENGE_AURA[ch.period]} Aura Points</span>
        {together ? (ch.scope === "team" ? " each, once every cousin reaches the target." : ch.scope === "squad" ? " each, when the total is reached." : " for each cousin who reaches it.") : "."}
      </p>
    </div>
  );
}

/* ---------- goals ---------- */
export function GoalForm({ preset, onDone, submitLabel, showSuggestions = true, submitVariant = "default" }: { preset?: GoalPreset; onDone: (id: string) => void; submitLabel?: string; showSuggestions?: boolean; submitVariant?: "default" | "tinted" }) {
  const { s, me, act } = useGame();
  const base = preset?.edit ? s.goals.find((g) => g.id === preset.edit && g.userId === me) : undefined;
  const [title, setTitle] = useState(base?.title ?? preset?.title ?? "");
  const [dim, setDim] = useState<ActiveDim>(base?.dim ?? preset?.dim ?? "health");
  const [why, setWhy] = useState(base?.why ?? "");
  const [measurable, setMeasurable] = useState(!!base?.target);
  const [target, setTarget] = useState(base?.target ?? 12);
  const [unit, setUnit] = useState(base?.unit ?? "");
  const [due, setDue] = useState(base?.due ?? "");
  const [priv, setPriv] = useState<boolean>(base ? !!base.private : PRIVATE_BY_DEFAULT.includes(preset?.dim ?? "health"));
  const [privTouched, setPrivTouched] = useState(!!base);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (base) {
      if (act({ t: "goalEdit", id: base.id, g: { title: t, dim, why: why.trim(), due, private: priv, ...(base.target ? { target, unit: unit.trim() } : {}) } })) onDone(base.id);
      return;
    }
    const id = newId();
    const ok = act({ t: "goalAdd", id, g: { title: t, dim, why: why.trim() || undefined, due: due || undefined, private: priv, ...(measurable ? { target, unit: unit.trim() || "steps" } : {}) } });
    if (ok) {
      onDone(id);
      setTitle(""); setWhy(""); setMeasurable(false); setDue(""); setUnit("");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <input className="field h-12 text-[17px]" placeholder="What would you love to achieve?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} aria-label="Goal" />
      {showSuggestions && !base && (
        <div>
          <span className="label">Ideas</span>
          <div className="flex flex-wrap gap-2">
            {GOAL_SUGGESTIONS.map((g) => <SuggestionChip key={g.title} active={title === g.title} onClick={() => { setTitle(g.title); setDim(g.dim); if (!privTouched) setPriv(PRIVATE_BY_DEFAULT.includes(g.dim)); }}>{g.title}</SuggestionChip>)}
          </div>
        </div>
      )}
      <div><span className="label">Life dimension</span><AreaPicker value={dim} onChange={(d) => { if (d) { setDim(d); if (!privTouched) setPriv(PRIVATE_BY_DEFAULT.includes(d)); } }} /></div>
      <Field label="Why it matters (optional)"><input className="field" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} placeholder="A sentence future-you will thank you for" /></Field>

      {(!base || base.target) && (
        <div className="rounded-2xl bg-secondary/60 p-4">
          {!base && (
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[15px] font-medium">Track a number</span>
                <span className="block text-[13px] text-muted-foreground">Like 12 books, 50 km, or ₹50,000</span>
              </span>
              <Switch checked={measurable} onCheckedChange={setMeasurable} />
            </label>
          )}
          {measurable && (
            <div className={cn("grid grid-cols-2 gap-3 motion-safe:animate-fade-up", !base && "mt-4")}>
              <Field label="Target"><input type="number" min={1} inputMode="numeric" className="field bg-card" value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value || 1))} /></Field>
              <Field label="Unit"><input className="field bg-card" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="books, km, ₹" /></Field>
            </div>
          )}
          {measurable && unit.trim() === "₹" && <p className="mt-3 text-[12px] text-muted-foreground">Cousins only ever see the percentage, never the amounts.</p>}
        </div>
      )}

      <Field label="Target date (optional)"><input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <VisibilityRow value={priv} onChange={(v) => { setPriv(v); setPrivTouched(true); }} what="goal" />
      <Button type="submit" size="lg" variant={submitVariant} className="w-full" disabled={!title.trim()}>{submitLabel ?? (base ? "Save changes" : "Add goal")}</Button>
    </form>
  );
}

/* ---------- identity ---------- */
export function ProfileForm({ onSaved, submitLabel = "Save" }: { onSaved: () => void; submitLabel?: string }) {
  const { profile, updateProfile, toast } = useGame();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const err = await updateProfile({ name: name.trim(), bio: bio.trim() });
    setBusy(false);
    if (err) toast(err, "warn");
    else onSaved();
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></Field>
      <Field label="Username" hint="You sign in with this, so it can't change."><input className="field opacity-70" value={`@${profile.username}`} disabled /></Field>
      <Field label="Short bio (optional)"><textarea className="field min-h-[72px]" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Engineer by day, badminton by night." /></Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}

/**
 * Choose one of the five characters (each belongs to one cousin) or upload a
 * photo, which is cropped first. A photo shows instead of the character
 * until it's removed. Saves straight away.
 */
export function AvatarPicker({ compact }: { compact?: boolean }) {
  const { s, me, profile, updateProfile, toast } = useGame();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const holder = (id: string) => s.members.find((m) => m.id !== me && m.character === id);
  const save = async (patch: Parameters<typeof updateProfile>[0], key: string) => {
    setBusy(key);
    const err = await updateProfile(patch);
    setBusy(null);
    if (err) toast(err, "warn");
  };
  // back to a character: the one you had, or the first one nobody has claimed
  const resetToDefault = () => {
    const fallback = profile.character ?? CHARACTERS.find((c) => !holder(c.id))?.id;
    save({ photo: null, ...(fallback && !profile.character ? { character: fallback } : {}) }, "photo");
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <AvatarView member={profile} size={compact ? 72 : 88} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()}><Camera />{profile.photo ? "Change photo" : "Upload a photo"}</Button>
            {profile.photo && <Button type="button" size="sm" variant="ghost" disabled={busy === "photo"} onClick={resetToDefault}><RotateCcw />Reset to default avatar</Button>}
          </div>
          <p className="text-[12px] text-muted-foreground">{profile.photo ? "Your photo shows instead of your character. Resetting brings your character back; nothing else changes." : "Or pick one of the five characters below."}</p>
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setFile(f); }} />
      </div>
      <div className={cn("grid gap-2.5", compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-5")} role="radiogroup" aria-label="Characters">
        {CHARACTERS.map((c) => {
          const taken = holder(c.id);
          const mine = profile.character === c.id;
          return (
            <button key={c.id} type="button" role="radio" disabled={!!taken || busy !== null} aria-checked={mine} onClick={() => !mine && save({ character: c.id }, c.id)}
              className={cn("group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition disabled:cursor-not-allowed", mine ? "border-transparent ring-2" : "border-border hover:-translate-y-0.5 hover:shadow-card", taken && "opacity-50")}
              style={mine ? { ["--tw-ring-color" as string]: c.color, boxShadow: `0 10px 28px -12px ${c.color}` } : undefined}>
              <span className="relative block aspect-[4/5] overflow-hidden" style={{ background: c.deep }}>
                <CharacterArt id={c.id} kind="portrait" className="h-full w-full transition duration-500 group-hover:scale-[1.04]" />
                {mine && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-white shadow" style={{ background: c.color }}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                {taken && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><Lock className="h-3 w-3" /></span>}
              </span>
              <span className="block border-t-2 px-2.5 py-2" style={{ borderColor: c.color }}>
                <span className="block truncate font-display text-[13px] font-semibold">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{taken ? `${taken.name}'s character` : c.title}</span>
              </span>
            </button>
          );
        })}
      </div>
      <PhotoCropper file={file} onCancel={() => setFile(null)} onDone={async (url) => { setFile(null); await save({ photo: url }, "photo"); }} />
    </div>
  );
}

/** A compact list of something just added, with an undo-style remove. */
export function AddedRow({ children, onRemove, icon, dim }: { children: ReactNode; onRemove: () => void; icon?: string; dim?: ActiveDim }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-3 py-2.5 motion-safe:animate-fade-up">
      {dim && <QuestGlyph icon={icon} dim={dim} size={30} />}
      <div className="min-w-0 flex-1 text-[15px]">{children}</div>
      <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Remove"><X className="h-4 w-4" /></button>
    </div>
  );
}

export { AreaTag };
