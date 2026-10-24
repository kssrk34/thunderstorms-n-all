"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Copy, Download, Info, MessageCircle, Send, Share, ShieldCheck, Smartphone, SquarePlus } from "lucide-react";
import { useInstallPrompt } from "./runtime";
import { Field } from "./forms";
import { Section } from "./game";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { List, ListRow } from "./ui/list";
import { Switch } from "./ui/switch";
import { api } from "@/lib/api";
import { NOTIFY_KINDS } from "@/lib/catalog";
import { useGame } from "@/lib/store";
import type { NotifyPrefs, OutboxItem } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface Summary {
  prefs: NotifyPrefs;
  channels: { whatsapp: boolean; push: boolean; publicKey?: string };
  pushDevices: number;
  codePending: boolean;
  unsubscribe: string | null;
  history: Omit<OutboxItem, "template" | "providerId" | "dedupe">[];
  sent?: boolean;
}

const STATUS: Record<OutboxItem["status"], { label: string; tone: string }> = {
  simulated: { label: "Preview only · not sent", tone: "bg-arc/15 text-arc" },
  queued: { label: "Queued", tone: "bg-secondary text-muted-foreground" },
  sending: { label: "Sending", tone: "bg-secondary text-muted-foreground" },
  sent: { label: "Sent", tone: "bg-primary/15 text-primary" },
  delivered: { label: "Delivered", tone: "bg-success/15 text-success" },
  read: { label: "Read", tone: "bg-success/15 text-success" },
  failed: { label: "Failed", tone: "bg-destructive/15 text-destructive" },
  skipped: { label: "Skipped", tone: "bg-secondary text-muted-foreground" },
};
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric" });

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Install guidance: iPhone needs the Home Screen app for push; Android and desktop can install with one tap. */
function InstallSteps() {
  const { canPrompt, prompt, installed, ios } = useInstallPrompt();
  if (installed) return null;
  if (ios) {
    const steps: [typeof Share, string][] = [
      [Smartphone, "Open this site on your iPhone in Safari (iOS 16.4 or later)."],
      [Share, "Tap the Share button."],
      [SquarePlus, "Choose “Add to Home Screen”, then Add."],
      [Download, "Open Thunderstorms from your Home Screen."],
      [Bell, "Come back here, tap “Enable notifications”, and allow them."],
    ];
    return (
      <div className="border-t border-border/70 p-5">
        <div className="text-[14px] font-semibold">On iPhone: install the app first</div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Apple only allows notifications from apps on your Home Screen, not from a browser tab.</p>
        <ol className="mt-3 space-y-2">
          {steps.map(([Icon, text], i) => (
            <li key={i} className="flex items-center gap-3 text-[13px]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary font-display text-[12px] font-bold text-muted-foreground">{i + 1}</span><Icon className="h-4 w-4 shrink-0 text-primary" />{text}</li>
          ))}
        </ol>
      </div>
    );
  }
  if (!canPrompt) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border/70 p-5">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 text-[13px] text-muted-foreground"><span className="block text-[14px] font-semibold text-foreground">Install the app</span>One tap from your home screen, full screen, with notifications.</span>
      <Button size="sm" onClick={prompt}>Install app</Button>
    </div>
  );
}

/** Everything about messages outside the app, all of it opt-in. */
export function AlertsSettings() {
  const { toast } = useGame();
  const ios = useInstallPrompt().ios;
  const [d, setD] = useState<Summary | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pushHere, setPushHere] = useState<"unsupported" | "off" | "on" | "denied">("off");

  const load = (r: { ok: true; data: Summary } | { ok: false; error: string }) => {
    if (!r.ok) { toast(r.error, "warn"); return false; }
    setD(r.data);
    return true;
  };
  useEffect(() => {
    api<Summary>("/api/notify").then((r) => { if (load(r) && r.ok) setPhone(r.data.prefs.phone?.replace(/^\+91/, "") ?? ""); });
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setPushHere("unsupported");
      if (Notification.permission === "denied") return setPushHere("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      setPushHere((await reg?.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (p: Omit<Partial<NotifyPrefs>, "kinds"> & { kinds?: Partial<NotifyPrefs["kinds"]> }, key = "patch") => {
    setBusy(key);
    load(await api<Summary>("/api/notify", { method: "PATCH", body: p }));
    setBusy(null);
  };
  const savePhone = async () => {
    setBusy("phone");
    const r = await api<Summary>("/api/notify/phone", { body: { phone } });
    setBusy(null);
    if (load(r) && r.ok) toast(r.data.sent ? "Code sent on WhatsApp" : "Number saved", "info");
  };
  const verify = async () => {
    setBusy("verify");
    const r = await api<Summary>("/api/notify/verify", { body: { code } });
    setBusy(null);
    if (load(r)) { setCode(""); toast("Number verified", "info"); }
  };
  const enablePush = async () => {
    if (!d?.channels.publicKey) return;
    setBusy("push");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushHere(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(d.channels.publicKey) });
      if (load(await api<Summary>("/api/notify/push", { body: { subscription: sub.toJSON() } }))) setPushHere("on");
    } catch {
      toast("This browser couldn't turn on notifications. If you're on iPhone, install the app to your home screen first.", "warn");
    } finally {
      setBusy(null);
    }
  };
  const disablePush = async () => {
    setBusy("push");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await api(`/api/notify/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" }); await sub.unsubscribe().catch(() => {}); }
    load(await api<Summary>("/api/notify"));
    setPushHere("off");
    setBusy(null);
  };
  const [testNote, setTestNote] = useState<string | null>(null);
  const test = async () => {
    setBusy("test");
    setTestNote(null);
    const r = await api<Summary>("/api/notify/test", { body: {} });
    setBusy(null);
    if (!load(r) || !r.ok) return;
    const push = r.data.history.find((o) => o.kind === "test" && o.channel === "push");
    if (!push) { setTestNote(d?.channels.whatsapp ? "Test handed to WhatsApp. Its delivery status updates below." : "Preview added below. Nothing was sent."); return; }
    if (push.status === "failed") { setTestNote(`The push service refused it: ${push.error ?? "unknown error"}.`); return; }
    setTestNote("Submitted to the push service. Waiting for your device to confirm it was shown…");
    // the service worker reports back once the notification is actually on screen
    for (let i = 0; i < 6; i++) {
      await new Promise((res) => setTimeout(res, 2500));
      const again = await api<Summary>("/api/notify");
      if (!again.ok) break;
      setD(again.data);
      const o = again.data.history.find((x) => x.id === push.id);
      if (o?.status === "delivered") { setTestNote("Delivered: a device confirmed it showed the notification."); return; }
    }
    setTestNote("Submitted to the push service, but no device has confirmed it yet. If nothing appeared, check that notifications are allowed for this app in your phone's settings.");
  };

  if (!d) return <Card className="h-40 animate-pulse" />;
  const p = d.prefs;
  const savedPhone = p.phone?.replace(/^\+91/, "") ?? "";

  return (
    <div className="space-y-10">
      <Section title="In the app">
        <Card className="flex items-start gap-3 p-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-[14px] text-muted-foreground">Invitations, reactions, rivalries and milestones always appear under the bell, whether or not you turn on phone notifications. Everything below is about your phone, and it&apos;s all off until you turn it on.</p>
        </Card>
      </Section>

      <Section title="Phone notifications" eyebrow="This device">
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden p-5" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / .10), hsl(var(--arc) / .08) 60%, transparent)" }}>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_hsl(var(--primary))]"><Bell className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[17px] font-semibold">{pushHere === "on" ? "Notifications are on for this device" : "Never miss an invite"}</div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {pushHere === "on" ? `${d.pushDevices} ${d.pushDevices === 1 ? "device" : "devices"} signed up. Only the kinds you pick below are sent, never during quiet hours.`
                    : "Get a nudge when a cousin invites you, when your habits are still waiting at the time you choose, and your weekly summary. Even when the app is closed."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!d.channels.push ? (
                <p className="text-[13px] text-muted-foreground"><Info className="mr-1 inline h-4 w-4 text-arc" />Push isn&apos;t switched on for the app yet: the organiser needs to add its keys on the server (README → Browser push). Nothing will be promised until then.</p>
              ) : pushHere === "unsupported" ? (
                <p className="text-[13px] text-muted-foreground">{ios ? "On iPhone, notifications work from the installed app only. Follow the steps below, then come back here." : "This browser can't receive push notifications. Try Chrome, Edge, Firefox or Safari."}</p>
              ) : pushHere === "denied" ? (
                <p className="text-[13px] text-muted-foreground">Notifications are blocked for this app. Allow them in your browser or phone settings, then reload.</p>
              ) : pushHere === "on" ? (
                <Button size="sm" variant="secondary" disabled={busy === "push"} onClick={disablePush}><BellOff />Turn off on this device</Button>
              ) : (
                <Button disabled={busy === "push"} onClick={enablePush}><Bell />Enable notifications</Button>
              )}
            </div>
          </div>
          <InstallSteps />
        </Card>
      </Section>

      <Section title="WhatsApp" eyebrow="Optional">
        <Card className="space-y-5 p-5">
          {!d.channels.whatsapp && (
            <div className="flex gap-3 rounded-2xl border border-arc/30 bg-arc/10 p-4 text-[13px]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-arc" />
              <p><span className="font-medium text-foreground">WhatsApp isn&apos;t connected on the server yet.</span> <span className="text-muted-foreground">You can save your number and opt in now. Until the organiser connects the official WhatsApp Business Platform, messages appear below as previews and nothing is sent.</span></p>
            </div>
          )}
          <Field label="Mobile number" hint={p.phone ? (p.phoneVerified ? <span className="inline-flex items-center gap-1 text-success"><ShieldCheck className="h-3.5 w-3.5" />Verified</span> : d.channels.whatsapp ? "Not verified yet. We'll send a code on WhatsApp." : "Saved. It'll be verified with a WhatsApp code once WhatsApp is connected.") : "Only you can see it. Never shown to cousins."}>
            <div className="flex gap-2">
              <span className="grid h-11 shrink-0 place-items-center rounded-xl bg-secondary px-3 text-[15px] text-muted-foreground">+91</span>
              <input className="field" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
              <Button type="button" variant="secondary" className="h-11 shrink-0" disabled={busy === "phone" || !phone.trim() || (phone.replace(/\D/g, "") === savedPhone.replace(/\D/g, "") && (!!p.phoneVerified || !d.channels.whatsapp))} onClick={savePhone}>
                {d.channels.whatsapp && !p.phoneVerified ? "Send code" : "Save"}
              </Button>
            </div>
          </Field>
          <p className="-mt-3 text-[12px] text-muted-foreground">Outside India? Type the full number with its country code, like +44…</p>
          {d.channels.whatsapp && d.codePending && !p.phoneVerified && (
            <div className="flex gap-2">
              <input className="field font-mono tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="Verification code" />
              <Button type="button" className="h-11 shrink-0" disabled={code.length !== 6 || busy === "verify"} onClick={verify}><Check />Verify</Button>
            </div>
          )}
          <label className="flex items-start justify-between gap-4 rounded-2xl bg-secondary/60 p-4">
            <span className="flex gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <span>
                <span className="block text-[15px] font-medium">Send me WhatsApp notifications</span>
                <span className="block text-[13px] text-muted-foreground">I agree to receive WhatsApp messages from Thunderstorms &apos;n&apos; All about my quests and cousins, within the limits below. Reply STOP or switch this off any time.</span>
                {p.whatsapp && p.whatsappAt && <span className="mt-1 block text-[12px] text-muted-foreground">Opted in {new Date(p.whatsappAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
              </span>
            </span>
            <Switch checked={p.whatsapp} disabled={!p.phone || busy === "patch"} onCheckedChange={(v) => patch({ whatsapp: v })} aria-label="WhatsApp notifications" />
          </label>
        </Card>
      </Section>

      <Section title="What to send">
        <List>
          {NOTIFY_KINDS.map((k) => (
            <ListRow key={k.id}>
              <div className="min-w-0 flex-1"><div className="text-[15px]">{k.label}</div><div className="text-[13px] text-muted-foreground">&ldquo;{k.example}&rdquo;</div></div>
              <Switch checked={p.kinds[k.id]} onCheckedChange={(v) => patch({ kinds: { [k.id]: v } })} aria-label={k.label} />
            </ListRow>
          ))}
        </List>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Quiet hours" hint="Messages wait until quiet hours end.">
            <div className="flex items-center gap-2">
              <select className="field" value={p.quietStart} onChange={(e) => patch({ quietStart: +e.target.value })} aria-label="Quiet from">{HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
              <span className="text-muted-foreground">to</span>
              <select className="field" value={p.quietEnd} onChange={(e) => patch({ quietEnd: +e.target.value })} aria-label="Quiet until">{HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
            </div>
          </Field>
          <Field label="Daily reminder at" hint="Only if you still have quests left that day.">
            <select className="field" value={p.reminderHour} onChange={(e) => patch({ reminderHour: +e.target.value })}>{HOURS.filter((h) => h >= 5 && h <= 21).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
          </Field>
          <Field label="Most messages a day" hint="Anything beyond this is skipped, not delayed.">
            <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => patch({ dailyLimit: n })} aria-pressed={p.dailyLimit === n} className={cn("h-10 flex-1 rounded-xl text-[14px] font-medium transition", p.dailyLimit === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{n}</button>
            ))}</div>
          </Field>
          <div className="flex flex-col justify-end gap-1.5">
            <Button variant="secondary" className="w-full" disabled={busy === "test" || (!p.whatsapp && pushHere !== "on")} onClick={test}><Send />Send test notification</Button>
            {testNote && <p role="status" className="text-[12px] text-muted-foreground">{testNote}</p>}
          </div>
          <p className="text-[12px] text-muted-foreground sm:col-span-2">All times are India time (Asia/Kolkata). Habits can also have their own reminder time: set it when you edit a habit.</p>
        </Card>
      </Section>

      <Section title="Recent messages" eyebrow="Delivery log">
        {d.history.length === 0 ? (
          <Card className="p-5 text-[14px] text-muted-foreground">No messages yet. Once you opt in, each one appears here with its delivery status.</Card>
        ) : (
          <List>
            {d.history.map((o) => (
              <div key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">{o.channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}{o.channel === "whatsapp" ? "WhatsApp" : "Push"} · {timeAgo(o.createdAt)}{o.notBefore > Date.now() && ` · waits until ${new Date(o.notBefore).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[o.status].tone)}>{o.channel === "push" && o.status === "sent" ? "Accepted by push service" : o.channel === "push" && o.status === "delivered" ? "Shown on device" : STATUS[o.status].label}</span>
                </div>
                <p className="mt-1 text-[14px]">{o.title && <span className="font-medium">{o.title}: </span>}{o.body}</p>
                {o.error && o.status !== "simulated" && <p className="mt-0.5 text-[12px] text-muted-foreground">{o.error}</p>}
              </div>
            ))}
          </List>
        )}
      </Section>

      {(p.whatsapp || p.push) && (
        <Section title="Unsubscribe">
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <p className="min-w-0 flex-1 text-[14px] text-muted-foreground">Stop every WhatsApp and push message in one go. The unsubscribe link works without signing in.</p>
            {d.unsubscribe && <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(location.origin + d.unsubscribe); toast("Link copied", "info"); } catch { /* ignore */ } }}><Copy />Copy link</Button>}
            <Button size="sm" variant="secondary" onClick={async () => { await patch({ whatsapp: false, push: false }); if (pushHere === "on") await disablePush(); }}>Turn everything off</Button>
          </Card>
        </Section>
      )}
    </div>
  );
}
