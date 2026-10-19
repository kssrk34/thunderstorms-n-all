"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Check, Copy, Download, KeyRound, LogOut, Plus, Share, Smartphone, Sparkles, Volume2, VolumeX } from "lucide-react";
import { FormError, PasswordInput } from "./auth";
import { Field } from "./forms";
import { AvatarView, DeleteButton, Section } from "./game";
import { useInstallPrompt } from "./runtime";
import { useTheme, type ThemePref } from "./theme";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { List, ListRow } from "./ui/list";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { api } from "@/lib/api";
import { useDevicePrefs } from "@/lib/device";
import { legacyBackup } from "@/lib/legacy";
import { playZap } from "@/lib/sound";
import { useGame } from "@/lib/store";

const RULES = [
  ["Real actions only", "Aura Points come from completing quests, habits, challenges, logged activities, meetups and goal progress. Nothing is random and nothing is free."],
  ["Every point is recorded", "Each award is a line in your Aura history with a unique claim, so nothing can be counted twice. Undo removes exactly that line."],
  ["Life Balance is calculated", "Scores come from what you planned and what you completed. Nobody can type in a score, and very easy tasks can't max out an area."],
  ["Kind streaks", "A rest day a week keeps your streak safe, and every seven days in a row earns a shield that covers one missed day."],
  ["Together over against", "Team missions pay out when everyone hits their target. Rivalries are optional and win trophies, not extra Aura."],
  ["Your data is yours", "Only you can change your quests, goals and profile; the server checks every action. Private quests show cousins the Aura, not the details."],
];

interface InviteSummary { members: number; max: number; open: number; invites: { code: string; expiresAt: number; by: string; mine: boolean }[]; code?: string }
interface PendingReset { userId: string; expiresAt: number }

export function Appearance() {
  const { pref, set } = useTheme();
  const [device, setDevice] = useDevicePrefs();
  return (
    <Section title="Appearance and feel">
      <List>
        <ListRow className="flex-col items-stretch gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-[15px] font-medium">Theme</div><div className="text-[13px] text-muted-foreground">Dark is the full storm. Saved on this device.</div></div>
          <Tabs value={pref} onValueChange={(v) => set(v as ThemePref)}>
            <TabsList className="flex w-full sm:w-auto"><TabsTrigger value="dark">Dark</TabsTrigger><TabsTrigger value="light">Light</TabsTrigger><TabsTrigger value="system">Automatic</TabsTrigger></TabsList>
          </Tabs>
        </ListRow>
        <ListRow>
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1"><div className="text-[15px]">Storm effects</div><div className="text-[13px] text-muted-foreground">Background lightning, glows and celebrations. Off when your device asks for reduced motion.</div></div>
          <Switch checked={device.effects} onCheckedChange={(v) => setDevice({ effects: v })} aria-label="Storm effects" />
        </ListRow>
        <ListRow>
          {device.sound ? <Volume2 className="h-5 w-5 shrink-0 text-primary" /> : <VolumeX className="h-5 w-5 shrink-0 text-muted-foreground" />}
          <div className="flex-1"><div className="text-[15px]">Sound effects</div><div className="text-[13px] text-muted-foreground">A soft zap when Aura Points land.</div></div>
          <Switch checked={device.sound} onCheckedChange={(v) => { setDevice({ sound: v }); if (v) setTimeout(playZap, 50); }} aria-label="Sound effects" />
        </ListRow>
      </List>
    </Section>
  );
}

export function InstallApp() {
  const { canPrompt, prompt, installed, ios } = useInstallPrompt();
  if (installed) return null;
  return (
    <Card className="flex items-start gap-4 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">Install the app</div>
        <div className="text-[13px] text-muted-foreground">{ios ? "In Safari, tap Share, then “Add to Home Screen”. It opens full screen, like an app." : canPrompt ? "Add Thunderstorms 'n' All to your home screen for one-tap access and notifications." : "Use your browser's menu to install or add to home screen."}</div>
      </div>
      {canPrompt && <Button size="sm" onClick={prompt}>Install</Button>}
    </Card>
  );
}

export function Cousins() {
  const { s, me, profile, toast } = useGame();
  const [inv, setInv] = useState<InviteSummary | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [resets, setResets] = useState<PendingReset[]>([]);
  const [freshReset, setFreshReset] = useState<{ userId: string; token: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = profile.role === "admin";

  useEffect(() => { api<InviteSummary>("/api/invites").then((r) => r.ok && setInv(r.data)); }, []);
  useEffect(() => { if (admin) api<{ pending: PendingReset[] }>("/api/resets").then((r) => r.ok && setResets(r.data.pending)); }, [admin]);
  const link = (code: string) => `${window.location.origin}/signup?code=${code}`;
  // the token goes after the #, so it never appears in server logs
  const resetLink = (token: string) => `${window.location.origin}/reset#${token}`;
  const create = async () => {
    setBusy(true);
    const r = await api<InviteSummary>("/api/invites", { body: {} });
    setBusy(false);
    if (!r.ok) return toast(r.error, "warn");
    setInv(r.data);
    setFresh(r.data.code ?? null);
  };
  const cancel = async (code: string) => {
    const r = await api<InviteSummary>(`/api/invites?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "warn");
    setInv(r.data);
    if (fresh === code) setFresh(null);
  };
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(link(code)); toast("Link copied", "info"); } catch { toast("Couldn't copy. Select the link and copy it instead.", "warn"); }
  };
  const createReset = async (userId: string) => {
    setBusy(true);
    const r = await api<{ token: string; pending: PendingReset[] }>("/api/resets", { body: { userId } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "warn");
    setResets(r.data.pending);
    setFreshReset({ userId, token: r.data.token });
  };
  const cancelReset = async (userId: string) => {
    const r = await api<{ pending: PendingReset[] }>(`/api/resets?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "warn");
    setResets(r.data.pending);
    if (freshReset?.userId === userId) setFreshReset(null);
  };
  const resetFor = freshReset && s.members.find((m) => m.id === freshReset.userId);

  return (
    <Section title="Cousins" id="cousins">
      <List>
        {s.members.map((m) => {
          const pending = resets.find((r) => r.userId === m.id);
          return (
            <ListRow key={m.id}>
              <AvatarView member={m} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{m.name}{m.id === me && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                <div className="truncate text-[13px] text-muted-foreground">@{m.username}</div>
                {pending && (
                  <div className="text-[12px] text-muted-foreground">
                    Reset link until {until(pending.expiresAt)} · <button type="button" className="text-primary hover:opacity-80" onClick={() => cancelReset(m.id)} aria-label={`Cancel ${m.name}'s reset link`}>Cancel</button>
                  </div>
                )}
              </div>
              {admin && m.id !== me && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => createReset(m.id)} disabled={busy} aria-label={`Reset ${m.name}'s password`} title="Make a password reset link">
                  <KeyRound /><span className="hidden sm:inline">Reset password</span>
                </Button>
              )}
            </ListRow>
          );
        })}
      </List>
      {admin && s.members.length > 1 && !resetFor && <p className="-mt-1 px-1 text-[13px] text-muted-foreground">If a cousin forgets their password, tap the key next to their name to make them a reset link.</p>}
      {resetFor && freshReset && (
        <Card className="p-5 motion-safe:animate-fade-up">
          <div className="text-[15px] font-medium">Reset link for {resetFor.name}</div>
          <div className="text-[13px] text-muted-foreground">Send it to {resetFor.name} privately. It works once, for 24 hours, and their current password keeps working until they use it.</div>
          <SharePanel title="Shown only now, so copy it before you leave" url={resetLink(freshReset.token)} onDone={() => setFreshReset(null)}
            share={{ title: "Reset your Thunderstorms 'n' All password", text: `${resetFor.name}, here's your link to choose a new password. It works once, for 24 hours.` }} />
        </Card>
      )}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium">Invite a cousin</div>
            <div className="text-[13px] text-muted-foreground">{inv ? `${inv.members} of ${inv.max} spots filled. Each link works once and expires in 7 days.` : "Loading…"}</div>
          </div>
          {inv && inv.open > 0 && <Button size="sm" onClick={create} disabled={busy}><Plus />Invite</Button>}
        </div>
        {fresh && (
          <SharePanel title="Send this link to your cousin" url={link(fresh)} share={{ title: "Join Thunderstorms 'n' All", text: "Five cousins. Five unique journeys. One shared universe. Here's your invite:" }}>
            <div className="mt-1 text-[13px] text-muted-foreground">Code: <span className="font-mono tracking-wider text-foreground">{fresh}</span></div>
          </SharePanel>
        )}
        {inv && inv.invites.filter((i) => i.code !== fresh).length > 0 && (
          <div className="mt-4 divide-y divide-border/70 border-t border-border/70">
            {inv.invites.filter((i) => i.code !== fresh).map((i) => (
              <div key={i.code} className="flex items-center gap-3 py-2.5">
                <span className="font-mono text-[14px] tracking-wider">{i.code}</span>
                <span className="flex-1 text-[12px] text-muted-foreground">{i.mine ? "" : `from ${i.by} · `}expires {new Date(i.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(i.code)} aria-label="Copy invite link"><Copy /></Button>
                {(i.mine || admin) && <DeleteButton onConfirm={() => cancel(i.code)} label="Cancel" />}
              </div>
            ))}
          </div>
        )}
        {inv && inv.open === 0 && inv.members < inv.max && <p className="mt-3 text-[13px] text-muted-foreground">Every remaining spot has an invitation waiting.</p>}
      </Card>
    </Section>
  );
}

const until = (t: number) => new Date(t).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });

/** A freshly made link, with copy and share buttons. */
function SharePanel({ title, url, share, onDone, children }: { title: string; url: string; share: { title: string; text: string }; onDone?: () => void; children?: ReactNode }) {
  const { toast } = useGame();
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [url]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast("Couldn't copy. Select the link and copy it instead.", "warn"); }
  };
  const send = async () => {
    try { await navigator.share({ ...share, url }); } catch { /* dismissed */ }
  };
  return (
    <div className="mt-4 rounded-2xl bg-secondary/70 p-4 motion-safe:animate-fade-up">
      <div className="text-[13px] text-muted-foreground">{title}</div>
      <div className="mt-1 break-all font-mono text-[14px]">{url}</div>
      {children}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="tinted" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy link"}</Button>
        {typeof navigator !== "undefined" && "share" in navigator && <Button size="sm" variant="secondary" onClick={send}><Share />Share</Button>}
        {onDone && <Button size="sm" variant="ghost" className="ml-auto" onClick={onDone}>Done</Button>}
      </div>
    </div>
  );
}

export function Account() {
  const { s, profile, toast, signOut } = useGame();
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
    <Section title="Account">
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="text-[15px] font-medium">Change password</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current password"><PasswordInput value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" required /></Field>
            <Field label="New password"><PasswordInput value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" minLength={8} required /></Field>
          </div>
          <FormError>{error}</FormError>
          <Button type="submit" variant="secondary" disabled={busy || !f.current || f.next.length < 8}>{busy ? "Saving…" : "Update password"}</Button>
          <p className="text-[13px] text-muted-foreground">
            {profile.role === "admin"
              ? <>Forgot your current one? <Link href="/forgot" className="text-primary hover:opacity-80">Reset it with your setup code</Link>.</>
              : `Forgot your current one? Ask ${s.members[0]?.name ?? "the organiser"} for a reset link.`}
          </p>
        </form>
      </Card>
      <Button variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={signOut}><LogOut />Sign out of {profile.username}</Button>
    </Section>
  );
}

export function YourData() {
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
          <p className="text-[13px] text-muted-foreground">Your quests, goals and progress belong to your account and sync across your devices, with a daily backup. Cousins see your profile, Aura totals, achievements and Life Balance scores. Private quests, money amounts, notes and your phone number are only ever sent to you.</p>
        </div>
        {legacy && (
          <ListRow>
            <div className="min-w-0 flex-1"><div className="text-[15px]">Old demo data on this device</div><div className="text-[13px] text-muted-foreground">The first version kept sample data in this browser. It was backed up and removed.</div></div>
            <Button size="sm" variant="secondary" onClick={download}><Download />Download</Button>
          </ListRow>
        )}
      </List>
    </Section>
  );
}

export function HowItWorks() {
  return (
    <Section title="How it works">
      <List>
        {RULES.map(([t, d]) => <div key={t} className="px-4 py-3.5"><div className="text-[15px] font-medium">{t}</div><p className="text-[14px] text-muted-foreground">{d}</p></div>)}
      </List>
    </Section>
  );
}
