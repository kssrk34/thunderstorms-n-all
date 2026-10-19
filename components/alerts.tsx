"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Copy, Info, MessageCircle, Send, ShieldCheck, Smartphone } from "lucide-react";
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

/** Everything about messages outside the app, all of it opt-in. */
export function AlertsSettings() {
  const { toast } = useGame();
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
  const test = async () => {
    setBusy("test");
    const r = await api<Summary>("/api/notify/test", { body: {} });
    setBusy(null);
    if (load(r)) toast(d?.channels.whatsapp || d?.channels.push ? "Test sent" : "Preview added below. Nothing was sent.", "info");
  };

  if (!d) return <Card className="h-40 animate-pulse" />;
  const p = d.prefs;
  const savedPhone = p.phone?.replace(/^\+91/, "") ?? "";

  return (
    <div className="space-y-10">
      <Section title="In the app">
        <Card className="flex items-start gap-3 p-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-[14px] text-muted-foreground">Invitations, reactions and rivalries always appear under the bell. The options below are for messages outside the app, and they&apos;re all off until you turn them on.</p>
        </Card>
      </Section>

      <Section title="Push notifications" eyebrow="This device">
        <Card className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">{pushHere === "on" ? "On for this device" : "Off for this device"}</div>
              <div className="text-[13px] text-muted-foreground">
                {!d.channels.push ? "Push isn't set up on the server yet. The organiser can turn it on by adding VAPID keys (see the README)."
                  : pushHere === "unsupported" ? "This browser doesn't support push. On iPhone, install the app to your home screen first."
                  : pushHere === "denied" ? "Notifications are blocked for this site in your browser settings."
                  : `${d.pushDevices} ${d.pushDevices === 1 ? "device" : "devices"} signed up.`}
              </div>
            </div>
            {d.channels.push && pushHere !== "unsupported" && pushHere !== "denied" && (
              pushHere === "on"
                ? <Button size="sm" variant="secondary" disabled={busy === "push"} onClick={disablePush}><BellOff />Turn off</Button>
                : <Button size="sm" disabled={busy === "push"} onClick={enablePush}><Bell />Turn on</Button>
            )}
          </div>
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
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" disabled={busy === "test" || (!p.whatsapp && pushHere !== "on")} onClick={test}><Send />Send a test</Button>
          </div>
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
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[o.status].tone)}>{STATUS[o.status].label}</span>
                </div>
                <p className="mt-1 text-[14px]">{o.body}</p>
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
