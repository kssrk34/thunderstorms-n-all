"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Download, LogOut, Plus, Share } from "lucide-react";
import { FormError, PasswordInput } from "@/components/auth";
import { Field } from "@/components/forms";
import { AvatarView, DeleteButton, PageHeader, Section } from "@/components/game";
import { useTheme, type ThemePref } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { List, ListRow } from "@/components/ui/list";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { DIMS } from "@/lib/catalog";
import { legacyBackup } from "@/lib/legacy";
import { useGame } from "@/lib/store";
import type { PenaltyDef } from "@/lib/types";
import { uid } from "@/lib/utils";

const RULES = [
  ["Positive first", "Almost all XP comes from doing good things. Slip-ups are optional, small and capped."],
  ["Habits that stick", "Daily quests are small and repeatable. Streaks reward consistency, and a weekly rest day protects them."],
  ["A little surprise", "The daily spark adds a small, unpredictable reward."],
  ["Fair competition", "Whoever is last this week earns 1.25× XP. Savings are ranked by % of your own target, never by amount."],
  ["Together over against", "Squad challenges and the squad charge mean everyone can win at once."],
  ["No guilt", "Honest slip-ups earn a bonus, your level never drops, and a daily limit on manual logs prevents burnout."],
];

interface InviteSummary { members: number; max: number; open: number; invites: { code: string; expiresAt: number; by: string; mine: boolean }[]; code?: string }

export default function SettingsPage() {
  const { profile, signOut } = useGame();
  return (
    <div className="space-y-10">
      <PageHeader title="Settings" />
      <Appearance />
      <Cousins />
      <SquadRules />
      <Section title="Account">
        <ChangePassword />
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={signOut}><LogOut />Sign out of {profile.username}</Button>
      </Section>
      <YourData />
      <Section title="How it works">
        <List>
          {RULES.map(([t, d]) => <div key={t} className="px-4 py-3.5"><div className="text-[15px] font-medium">{t}</div><p className="text-[14px] text-muted-foreground">{d}</p></div>)}
        </List>
      </Section>
    </div>
  );
}

function Appearance() {
  const { pref, set } = useTheme();
  return (
    <Section title="Appearance">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-[15px] font-medium">Theme</div><div className="text-[13px] text-muted-foreground">Saved on this device.</div></div>
        <Tabs value={pref} onValueChange={(v) => set(v as ThemePref)}>
          <TabsList className="flex w-full sm:w-auto"><TabsTrigger value="system">Automatic</TabsTrigger><TabsTrigger value="light">Light</TabsTrigger><TabsTrigger value="dark">Dark</TabsTrigger></TabsList>
        </Tabs>
      </Card>
    </Section>
  );
}

function Cousins() {
  const { s, me, profile, toast } = useGame();
  const [inv, setInv] = useState<InviteSummary | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const admin = profile.role === "admin";

  useEffect(() => { api<InviteSummary>("/api/invites").then((r) => r.ok && setInv(r.data)); }, []);
  const link = (code: string) => `${window.location.origin}/signup?code=${code}`;
  const create = async () => {
    setBusy(true);
    const r = await api<InviteSummary>("/api/invites", { body: {} });
    setBusy(false);
    if (!r.ok) return toast(r.error, "warn");
    setInv(r.data);
    setFresh(r.data.code ?? null);
    setCopied(false);
  };
  const cancel = async (code: string) => {
    const r = await api<InviteSummary>(`/api/invites?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "warn");
    setInv(r.data);
    if (fresh === code) setFresh(null);
  };
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(link(code)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast("Couldn't copy. Select the link and copy it instead.", "warn"); }
  };
  const share = async (code: string) => {
    try { await navigator.share({ title: "Join Thunderstorms 'n' All", text: "Five cousins. Five journeys. One extraordinary life. Here's your invite:", url: link(code) }); } catch { /* dismissed */ }
  };

  return (
    <div id="cousins" className="scroll-mt-20">
    <Section title="Cousins">
      <List>
        {s.members.map((m) => (
          <ListRow key={m.id}>
            <AvatarView member={m} size={36} />
            <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-medium">{m.name}{m.id === me && <span className="font-normal text-muted-foreground"> (you)</span>}</div><div className="text-[13px] text-muted-foreground">@{m.username}</div></div>
          </ListRow>
        ))}
      </List>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium">Invite a cousin</div>
            <div className="text-[13px] text-muted-foreground">{inv ? `${inv.members} of ${inv.max} spots filled. Each link works once and expires in 7 days.` : "Loading…"}</div>
          </div>
          {inv && inv.open > 0 && <Button size="sm" onClick={create} disabled={busy}><Plus />Invite</Button>}
        </div>
        {fresh && (
          <div className="mt-4 rounded-2xl bg-secondary/70 p-4 motion-safe:animate-fade-up">
            <div className="text-[13px] text-muted-foreground">Send this link to your cousin</div>
            <div className="mt-1 break-all font-mono text-[14px]">{link(fresh)}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">Code: <span className="font-mono tracking-wider text-foreground">{fresh}</span></div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="tinted" onClick={() => copy(fresh)}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy link"}</Button>
              {typeof navigator !== "undefined" && "share" in navigator && <Button size="sm" variant="secondary" onClick={() => share(fresh)}><Share />Share</Button>}
            </div>
          </div>
        )}
        {inv && inv.invites.filter((i) => i.code !== fresh).length > 0 && (
          <div className="mt-4 divide-y divide-border/70 border-t border-border/70">
            {inv.invites.filter((i) => i.code !== fresh).map((i) => (
              <div key={i.code} className="flex items-center gap-3 py-2.5">
                <span className="font-mono text-[14px] tracking-wider">{i.code}</span>
                <span className="flex-1 text-[12px] text-muted-foreground">{i.mine ? "" : `from ${i.by} · `}expires {new Date(i.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(i.code)}><Copy /></Button>
                {(i.mine || admin) && <DeleteButton onConfirm={() => cancel(i.code)} label="Cancel" />}
              </div>
            ))}
          </div>
        )}
        {inv && inv.open === 0 && inv.members < inv.max && <p className="mt-3 text-[13px] text-muted-foreground">Every remaining spot has an invitation waiting.</p>}
      </Card>
    </Section>
    </div>
  );
}

function SquadRules() {
  const { s, profile, act } = useGame();
  const admin = profile.role === "admin";
  const organiser = s.members[0];
  const [cap, setCap] = useState(s.settings.penaltyCap);
  const [draft, setDraft] = useState({ label: "", xp: 5, dim: DIMS[0].id });
  useEffect(() => setCap(s.settings.penaltyCap), [s.settings.penaltyCap]);
  const setDefs = (defs: PenaltyDef[]) => act({ t: "penaltyDefs", defs });

  return (
    <Section title="Squad rules">
      <p className="-mt-1 px-1 text-[13px] text-muted-foreground">{admin ? "You're the organiser, so these apply to everyone." : `Set by ${organiser?.name ?? "the organiser"} for the whole squad.`}</p>
      <List>
        <ListRow>
          <div className="flex-1"><div className="text-[15px]">Slip-ups</div><div className="text-[13px] text-muted-foreground">Optional, gentle accountability</div></div>
          <Switch checked={s.settings.penaltiesOn} disabled={!admin} onCheckedChange={(v) => act({ t: "settings", patch: { penaltiesOn: v } })} aria-label="Slip-ups" />
        </ListRow>
        {s.settings.penaltiesOn && (
          <ListRow className="flex-col items-stretch gap-2 py-3.5">
            <div className="flex justify-between text-[15px]"><span>Most XP you can lose a day</span><span className="tabular-nums text-muted-foreground">{cap} XP</span></div>
            <input type="range" min={5} max={50} step={5} value={cap} disabled={!admin} aria-label="Daily slip-up limit"
              onChange={(e) => setCap(+e.target.value)} onPointerUp={() => cap !== s.settings.penaltyCap && act({ t: "settings", patch: { penaltyCap: cap } })}
              onKeyUp={() => cap !== s.settings.penaltyCap && act({ t: "settings", patch: { penaltyCap: cap } })} />
          </ListRow>
        )}
      </List>
      {s.settings.penaltiesOn && (
        <List>
          {s.penalties.map((p) => (
            <ListRow key={p.id}>
              <Switch checked={p.on} disabled={!admin} onCheckedChange={(v) => setDefs(s.penalties.map((x) => (x.id === p.id ? { ...x, on: v } : x)))} aria-label={p.label} />
              <span className="min-w-0 flex-1 text-[15px]">{p.label}</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">−{p.xp}</span>
              {admin && <DeleteButton onConfirm={() => setDefs(s.penalties.filter((x) => x.id !== p.id))} />}
            </ListRow>
          ))}
          {admin && (
            <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (draft.label.trim()) { setDefs([...s.penalties, { ...draft, label: draft.label.trim(), id: uid(), on: true }]); setDraft({ ...draft, label: "" }); } }}>
              <input className="field" placeholder="Add a slip-up" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} maxLength={80} />
              <select className="field w-24 shrink-0" value={draft.xp} onChange={(e) => setDraft({ ...draft, xp: +e.target.value })} aria-label="XP lost">{[3, 5, 8, 10, 15].map((v) => <option key={v} value={v}>−{v}</option>)}</select>
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!draft.label.trim()} aria-label="Add"><Plus /></Button>
            </form>
          )}
        </List>
      )}
    </Section>
  );
}

function ChangePassword() {
  const { toast } = useGame();
  const [f, setF] = useState({ current: "", next: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await api("/api/profile/password", { body: f });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setF({ current: "", next: "" });
    toast("Password changed. Other devices have been signed out.", "info");
  };
  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="text-[15px] font-medium">Change password</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Current password"><PasswordInput value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" required /></Field>
          <Field label="New password"><PasswordInput value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" minLength={8} required /></Field>
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" variant="secondary" disabled={busy || !f.current || f.next.length < 8}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </Card>
  );
}

function YourData() {
  const [legacy, setLegacy] = useState<string | null>(null);
  useEffect(() => setLegacy(legacyBackup()), []);
  const download = () => {
    if (!legacy) return;
    const url = URL.createObjectURL(new Blob([legacy], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "thunderstorms-old-demo-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Section title="Your data">
      <List>
        <div className="px-4 py-3.5">
          <div className="text-[15px]">Stored on your squad&apos;s server</div>
          <p className="text-[13px] text-muted-foreground">Your quests, goals and progress belong to your account and sync across your devices. The server keeps a daily backup. Personal things like health, mood, reviews and one-time quests are visible only to you.</p>
        </div>
        {legacy && (
          <ListRow>
            <div className="min-w-0 flex-1"><div className="text-[15px]">Old demo data on this device</div><div className="text-[13px] text-muted-foreground">The previous version kept sample data in this browser. It was backed up and removed.</div></div>
            <Button size="sm" variant="secondary" onClick={download}><Download />Download</Button>
          </ListRow>
        )}
      </List>
    </Section>
  );
}
