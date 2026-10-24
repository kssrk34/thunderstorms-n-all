import webpush from "web-push";
import type { PushSub } from "./db";

/**
 * Browser push (Web Push with VAPID). Needs VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY; generate a pair with `npx web-push generate-vapid-keys`.
 */
export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  return publicKey && privateKey ? { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:admin@thunderstorms-n-all.vercel.app" } : null;
}
export const pushReady = () => pushConfig() !== null;

export interface PushResult { ok: boolean; gone?: boolean; error?: string; retry?: boolean }

export async function sendPush(sub: PushSub, payload: { id?: string; title: string; body: string; url?: string; tag?: string }): Promise<PushResult> {
  const cfg = pushConfig();
  if (!cfg) return { ok: false, error: "Push isn't configured on the server." };
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), {
      vapidDetails: { subject: cfg.subject, publicKey: cfg.publicKey, privateKey: cfg.privateKey },
      TTL: 60 * 60 * 12,
      urgency: "normal",
      timeout: 8000,
    });
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 0;
    // 404 and 410 mean the browser dropped the subscription
    return { ok: false, gone: status === 404 || status === 410, error: `${status || "network"}: ${(e as Error).message}`.slice(0, 180), retry: status >= 500 || status === 429 || status === 0 };
  }
}
