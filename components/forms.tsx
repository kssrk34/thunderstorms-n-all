"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Camera, Plus, X } from "lucide-react";
import {
  AVATAR_EMOJIS, CHALLENGE_SUGGESTIONS, CHALLENGE_XP, DIM, DIMS, GOAL_SUGGESTIONS, INTERESTS, MEMBER_COLORS, QUEST_EMOJIS, QUEST_SIZES,
  QUEST_SUGGESTIONS, type QuestKind,
} from "@/lib/catalog";
import { newId, useGame, type GoalPreset, type ProfilePatch, type QuestPreset } from "@/lib/store";
import type { Challenge, DimId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarView, SuggestionChip } from "./game";
import { AREA_ICON } from "./icons";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

/* ---------- small building blocks ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AreaPicker({ value, onChange }: { value: DimId; onChange: (d: DimId) => void }) {
  return (
    <div className="no-scrollbar fade-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6" role="radiogroup" aria-label="Life area">
      {DIMS.map((d) => {
        const Icon = AREA_ICON[d.id];
        const on = value === d.id;
        return (
          <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(d.id)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition", on ? "border-transparent text-white" : "border-border bg-card text-foreground hover:bg-secondary/60")}
            style={on ? { background: d.color } : undefined}>
            <Icon className="h-3.5 w-3.5" style={on ? undefined : { color: d.color }} />
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

function EmojiRow({ value, onChange, options }: { value: string; onChange: (e: string) => void; options: string[] }) {
  return (
    <div className="no-scrollbar fade-x -mx-5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      {options.map((e) => (
        <button key={e} type="button" onClick={() => onChange(e)} aria-label={`Icon ${e}`}
          className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px] transition", value === e ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/70")}>
          {e}
        </button>
      ))}
    </div>
  );
}

/* ---------- quests ---------- */
const KIND_COPY: Record<QuestKind, { label: string; placeholder: string; hint: string }> = {
  daily: { label: "Daily", placeholder: "e.g. Walk for 20 minutes", hint: "Repeats every day. Check it off each time you do it." },
  once: { label: "One-time", placeholder: "e.g. Sign up for a yoga class", hint: "Do it once, check it off, done." },
  challenge: { label: "Challenge", placeholder: "e.g. Move every day this week", hint: "A target to reach by a deadline, alone or with cousins." },
};

export function QuestForm({ preset, onDone, allowChallenge = true, submitLabel }: { preset?: QuestPreset; onDone: (kind: QuestKind) => void; allowChallenge?: boolean; submitLabel?: string }) {
  const { s, me, act } = useGame();
  const [kind, setKind] = useState<QuestKind>(preset?.kind ?? "daily");
  const [title, setTitle] = useState(preset?.title ?? "");
  const [dim, setDim] = useState<DimId>(preset?.dim ?? "health");
  const [emoji, setEmoji] = useState(preset?.emoji ?? "✨");
  const [xp, setXp] = useState<number>(QUEST_SIZES[1].xp);
  const [goalId, setGoalId] = useState(preset?.goalId ?? "");
  const [ch, setCh] = useState<Pick<Challenge, "period" | "scope" | "target" | "unit" | "desc" | "participants">>({ period: "weekly", scope: "solo", target: 7, unit: "days", desc: "", participants: [] });
  const goals = s.goals.filter((g) => g.userId === me && !g.done);
  const others = s.members.filter((m) => m.id !== me);
  const copy = KIND_COPY[kind];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const ok = kind === "daily"
      ? act({ t: "habitAdd", id: newId(), habit: { title: t, emoji, dim, xp, goalId: goalId || undefined } })
      : kind === "once"
        ? act({ t: "todoAdd", id: newId(), title: t, emoji, dim, xp, goalId: goalId || undefined })
        : act({ t: "chCreate", id: newId(), ch: { title: t, emoji, dim, ...ch } });
    if (ok) onDone(kind);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Tabs value={kind} onValueChange={(v) => setKind(v as QuestKind)}>
        <TabsList className="flex w-full">
          {(["daily", "once", ...(allowChallenge ? ["challenge" as const] : [])] as QuestKind[]).map((k) => <TabsTrigger key={k} value={k}>{KIND_COPY[k].label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div>
        <input className="field h-12 text-[17px]" autoFocus placeholder={copy.placeholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Quest name" />
        <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">{copy.hint}</p>
      </div>

      <div>
        <span className="label">Ideas</span>
        <div className="flex flex-wrap gap-2">
          {kind === "challenge"
            ? CHALLENGE_SUGGESTIONS.map((x) => (
              <SuggestionChip key={x.title} active={title === x.title} onClick={() => { setTitle(x.title); setDim(x.dim); setEmoji(x.emoji); setCh({ ...ch, period: x.period, scope: x.scope, target: x.target, unit: x.unit, desc: x.desc }); }}>
                <span aria-hidden>{x.emoji}</span>{x.title}
              </SuggestionChip>
            ))
            : QUEST_SUGGESTIONS.filter((x) => x.kind === kind).map((x) => (
              <SuggestionChip key={x.title} active={title === x.title} onClick={() => { setTitle(x.title); setDim(x.dim); setEmoji(x.emoji); }}>
                <span aria-hidden>{x.emoji}</span>{x.title}
              </SuggestionChip>
            ))}
        </div>
      </div>

      <div><span className="label">Life area</span><AreaPicker value={dim} onChange={setDim} /></div>
      <div><span className="label">Icon</span><EmojiRow value={emoji} onChange={setEmoji} options={QUEST_EMOJIS} /></div>

      {kind !== "challenge" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label">Size</span>
            <Tabs value={String(xp)} onValueChange={(v) => setXp(+v)}>
              <TabsList className="flex w-full">{QUEST_SIZES.map((z) => <TabsTrigger key={z.id} value={String(z.xp)}>{z.label}</TabsTrigger>)}</TabsList>
            </Tabs>
            <p className="mt-1.5 px-1 text-[12px] text-muted-foreground">Earns {xp} XP each time</p>
          </div>
          {goals.length > 0 && (
            <Field label="Supports a goal">
              <select className="field" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </Field>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="label">Deadline</span>
            <Tabs value={ch.period} onValueChange={(v) => setCh({ ...ch, period: v as Challenge["period"] })}>
              <TabsList className="flex w-full">
                <TabsTrigger value="daily">Today</TabsTrigger><TabsTrigger value="weekly">This week</TabsTrigger><TabsTrigger value="monthly">30 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target"><input type="number" min={1} inputMode="numeric" className="field" value={ch.target} onChange={(e) => setCh({ ...ch, target: Math.max(1, +e.target.value || 1) })} /></Field>
            <Field label="Unit"><input className="field" value={ch.unit} maxLength={20} onChange={(e) => setCh({ ...ch, unit: e.target.value })} placeholder="days, pages, km" /></Field>
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
                      <AvatarView member={m} size={26} /> {m.name}
                    </button>
                  );
                })}
              </div>
              {ch.participants.length > 0 && (
                <div className="mt-3">
                  <Tabs value={ch.scope} onValueChange={(v) => setCh({ ...ch, scope: v as Challenge["scope"] })}>
                    <TabsList className="flex w-full"><TabsTrigger value="solo">Everyone hits the target</TabsTrigger><TabsTrigger value="squad">One shared target</TabsTrigger></TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          )}
          <p className="px-1 text-[12px] text-muted-foreground">Finishing earns {CHALLENGE_XP[ch.period]} XP{ch.participants.length ? " for each cousin who completes it" : ""}.</p>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!title.trim()}>{submitLabel ?? (kind === "challenge" ? "Start challenge" : "Add quest")}</Button>
    </form>
  );
}

/* ---------- goals ---------- */
export function GoalForm({ preset, onDone, submitLabel = "Add goal", showSuggestions = true, submitVariant = "default" }: { preset?: GoalPreset; onDone: (id: string) => void; submitLabel?: string; showSuggestions?: boolean; submitVariant?: "default" | "tinted" }) {
  const { act } = useGame();
  const [title, setTitle] = useState(preset?.title ?? "");
  const [dim, setDim] = useState<DimId>(preset?.dim ?? "health");
  const [why, setWhy] = useState("");
  const [measurable, setMeasurable] = useState(false);
  const [target, setTarget] = useState(12);
  const [unit, setUnit] = useState("");
  const [due, setDue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const id = newId();
    const ok = act({ t: "goalAdd", id, g: { title: t, dim, why: why.trim() || undefined, due: due || undefined, ...(measurable ? { target, unit: unit.trim() || "steps" } : {}) } });
    if (ok) {
      onDone(id);
      setTitle(""); setWhy(""); setMeasurable(false); setDue(""); setUnit("");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <input className="field h-12 text-[17px]" placeholder="What would you love to achieve?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} aria-label="Goal" />
      {showSuggestions && (
        <div>
          <span className="label">Ideas</span>
          <div className="flex flex-wrap gap-2">
            {GOAL_SUGGESTIONS.map((g) => <SuggestionChip key={g.title} active={title === g.title} onClick={() => { setTitle(g.title); setDim(g.dim); }}>{g.title}</SuggestionChip>)}
          </div>
        </div>
      )}
      <div><span className="label">Life area</span><AreaPicker value={dim} onChange={setDim} /></div>
      <Field label="Why it matters (optional)"><input className="field" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} placeholder="A sentence future-you will thank you for" /></Field>

      <div className="rounded-2xl bg-secondary/60 p-4">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] font-medium">Track a number</span>
            <span className="block text-[13px] text-muted-foreground">Like 12 books, 50 km, or ₹50,000</span>
          </span>
          <Switch checked={measurable} onCheckedChange={setMeasurable} />
        </label>
        {measurable && (
          <div className="mt-4 grid grid-cols-2 gap-3 motion-safe:animate-fade-up">
            <Field label="Target"><input type="number" min={1} inputMode="numeric" className="field bg-card" value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value || 1))} /></Field>
            <Field label="Unit"><input className="field bg-card" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="books, km, ₹" /></Field>
          </div>
        )}
      </div>

      <Field label="Target date (optional)"><input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <Button type="submit" size="lg" variant={submitVariant} className="w-full" disabled={!title.trim()}>{submitLabel}</Button>
    </form>
  );
}

/* ---------- profile ---------- */
async function squarePhoto(file: File, px = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, px, px);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileForm({ onSaved, submitLabel = "Save", showName = true }: { onSaved: () => void; submitLabel?: string; showName?: boolean }) {
  const { profile, updateProfile, toast } = useGame();
  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [color, setColor] = useState(profile.color);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined); // undefined = unchanged
  const [bio, setBio] = useState(profile.bio ?? "");
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const shownPhoto = photo === undefined ? profile.photo : photo ?? undefined;
  const toggle = (x: string) => setInterests((l) => (l.includes(x) ? l.filter((y) => y !== x) : l.length >= 12 ? l : [...l, x]));
  const all = Array.from(new Set([...INTERESTS, ...interests]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const patch: ProfilePatch = { name: name.trim(), emoji, color, bio: bio.trim(), interests };
    if (photo !== undefined) patch.photo = photo;
    const err = await updateProfile(patch);
    setBusy(false);
    if (err) toast(err, "warn");
    else onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <AvatarView member={{ name, emoji, color, photo: shownPhoto }} size={104} />
          <button type="button" onClick={() => file.current?.click()} aria-label="Choose a profile photo"
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-[3px] border-popover bg-primary text-primary-foreground shadow-sm transition active:scale-95">
            <Camera className="h-4 w-4" />
          </button>
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try { setPhoto(await squarePhoto(f)); } catch { toast("That image couldn't be opened. Try a JPEG or PNG.", "warn"); }
          }} />
        </div>
        {shownPhoto && <button type="button" className="text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setPhoto(null)}>Use an avatar instead</button>}
      </div>

      {!shownPhoto && (
        <div className="space-y-3">
          <span className="label text-center">Or pick an avatar</span>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATAR_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={`Avatar ${e}`}
                className={cn("grid aspect-square place-items-center rounded-xl text-[20px] transition", emoji === e ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/70")}>{e}</button>
            ))}
          </div>
          <div className="flex justify-center gap-2.5">
            {MEMBER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label="Colour" className={cn("h-7 w-7 rounded-full transition", color === c ? "ring-2 ring-offset-2 ring-offset-popover" : "opacity-80 hover:opacity-100")} style={{ background: c, ["--tw-ring-color" as string]: c }} />
            ))}
          </div>
        </div>
      )}

      {showName && <Field label="Name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></Field>}
      <Field label="Short bio (optional)"><textarea className="field min-h-[72px]" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Engineer by day, badminton by night." /></Field>

      <div>
        <span className="label">Interests (optional)</span>
        <div className="flex flex-wrap gap-2">
          {all.map((x) => <SuggestionChip key={x} active={interests.includes(x)} onClick={() => toggle(x)}>{x}</SuggestionChip>)}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="field" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={24} placeholder="Add your own"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (custom.trim()) { toggle(custom.trim()); setCustom(""); } } }} />
          <Button type="button" variant="secondary" size="icon" className="h-11 w-11 shrink-0" aria-label="Add interest" disabled={!custom.trim()} onClick={() => { toggle(custom.trim()); setCustom(""); }}><Plus /></Button>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}

/** A compact list of something just added, with an undo-style remove. */
export function AddedRow({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-3 motion-safe:animate-fade-up">
      <div className="min-w-0 flex-1 text-[15px]">{children}</div>
      <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Remove"><X className="h-4 w-4" /></button>
    </div>
  );
}
