import { NextResponse, type NextRequest } from "next/server";
import { Nope } from "../reducer";
import { clearSessionCookie, currentUser, setSessionCookie, type Authed } from "./auth";
import { ApiError } from "./db";

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
export const ok = (data: unknown) => NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

/**
 * Blocks cross-site writes. Browsers always send Origin on cross-origin
 * requests, so a mismatch means another site is trying to act as the user.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return [req.headers.get("host"), req.headers.get("x-forwarded-host")].includes(host);
  } catch {
    return false;
  }
}

export async function readJson<T>(req: NextRequest, maxBytes = 64_000): Promise<T | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? (v as T) : null;
  } catch {
    return null;
  }
}

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "local";

/* ---------- a tiny in-memory rate limiter ---------- */
const g = globalThis as unknown as { __tnaRate?: Map<string, { n: number; reset: number }> };
const buckets = (g.__tnaRate ??= new Map());
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of Array.from(buckets)) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= max;
}

/** Turns known errors into friendly JSON responses. */
export function handleError(e: unknown) {
  if (e instanceof ApiError) return fail(e.status, e.message);
  if (e instanceof Nope) return fail(400, e.message);
  console.error(e);
  return fail(500, "Something went wrong on our side. Please try again.");
}

/** Runs `handler` for a signed-in cousin, or answers 401 and clears a stale cookie. */
export async function withUser(req: NextRequest, handler: (a: Authed) => Promise<NextResponse>, opts: { write?: boolean } = {}) {
  if (opts.write && !sameOrigin(req)) return fail(403, "Cross-site request blocked.");
  try {
    const auth = await currentUser(req);
    if (!auth) {
      const res = fail(401, "Please sign in.");
      if (req.cookies.has("tna_session")) clearSessionCookie(res);
      return res;
    }
    const res = await handler(auth);
    if (auth.refreshed) setSessionCookie(res, auth.token, req);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
