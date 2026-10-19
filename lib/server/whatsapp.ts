import { createHmac, timingSafeEqual } from "crypto";

/**
 * WhatsApp through Meta's official WhatsApp Business Platform (Cloud API).
 * Server-side only: the access token never reaches a browser.
 *
 * Messages a business starts must use templates approved in WhatsApp
 * Manager. The names and texts the app expects are listed in the README.
 */
export function whatsappConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return token && phoneId
    ? { token, phoneId, version: process.env.WHATSAPP_API_VERSION || "v21.0", lang: process.env.WHATSAPP_TEMPLATE_LANG || "en" }
    : null;
}
export const whatsappReady = () => whatsappConfig() !== null;

export interface SendResult { ok: boolean; id?: string; error?: string; retry?: boolean }

async function post(body: unknown): Promise<SendResult> {
  const cfg = whatsappConfig();
  if (!cfg) return { ok: false, error: "WhatsApp isn't configured on the server." };
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.version}/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const out = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (res.ok && out.messages?.[0]?.id) return { ok: true, id: out.messages[0].id };
    const msg = `${out.error?.code ?? res.status}: ${out.error?.message ?? res.statusText}`.slice(0, 180);
    // rate limits and server trouble are worth retrying; bad numbers or templates are not
    return { ok: false, error: msg, retry: res.status >= 500 || res.status === 429 || out.error?.code === 130429 || out.error?.code === 131056 };
  } catch (e) {
    return { ok: false, error: `Network error: ${(e as Error).message}`.slice(0, 180), retry: true };
  }
}

/** Sends an approved template with positional body parameters. */
export function sendTemplate(to: string, name: string, params: string[]): Promise<SendResult> {
  const cfg = whatsappConfig();
  return post({
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name,
      language: { code: cfg?.lang ?? "en" },
      components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 200) })) }] : [],
    },
  });
}

/** Sends a one-time code with an authentication template (code in the body and on the copy button). */
export function sendCode(to: string, code: string): Promise<SendResult> {
  const cfg = whatsappConfig();
  return post({
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: process.env.WHATSAPP_VERIFY_TEMPLATE || "tna_verify",
      language: { code: cfg?.lang ?? "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ],
    },
  });
}

/** Checks Meta's X-Hub-Signature-256 header against the raw request body. */
export function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}
