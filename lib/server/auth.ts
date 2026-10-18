import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readDb, writeDb, type DB, type SessionRecord, type UserRecord } from "./db";

export const SESSION_COOKIE = "tna_session";
const SESSION_DAYS = 30;
const DAY = 86_400_000;
const MAX_SESSIONS_PER_USER = 10;

/* ---------- passwords (scrypt, per-user salt) ---------- */
const SCRYPT: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function derive(pw: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw.normalize("NFKC"), salt, 64, opts, (err, key) => (err ? rej(err) : res(key))));
}
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(pw, salt, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await derive(pw, Buffer.from(salt, "base64"), { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  const want = Buffer.from(hash, "base64");
  return want.length === key.length && timingSafeEqual(want, key);
}
/** Compared against when a username doesn't exist, so failed logins take the same time either way. */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(12).toString("hex")));

/* ---------- sessions ---------- */
const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

const isHttps = (req: NextRequest) => (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")) === "https";

export function setSessionCookie(res: NextResponse, token: string, req: NextRequest) {
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: SESSION_DAYS * 86400 });
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Creates a session inside a write and returns the raw token for the cookie. */
export function startSession(db: { sessions: SessionRecord[] }, userId: string): string {
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  const mine = db.sessions.filter((s) => s.userId === userId).sort((a, b) => a.lastSeen - b.lastSeen);
  const drop = new Set(mine.slice(0, Math.max(0, mine.length - (MAX_SESSIONS_PER_USER - 1))).map((s) => s.id));
  db.sessions = db.sessions.filter((s) => !drop.has(s.id));
  db.sessions.push({ id: tokenHash(token), userId, createdAt: now, expiresAt: now + SESSION_DAYS * DAY, lastSeen: now });
  return token;
}

export async function endSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const id = tokenHash(token);
  await writeDb((db) => { db.sessions = db.sessions.filter((s) => s.id !== id); });
}

export interface Authed { user: UserRecord; sessionId: string; token: string; refreshed: boolean }

export async function currentUser(req: NextRequest): Promise<Authed | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = tokenHash(token);
  const now = Date.now();
  const found = await readDb((db) => {
    const s = db.sessions.find((x) => x.id === id);
    if (!s || s.expiresAt < now) return null;
    const user = db.users.find((u) => u.id === s.userId);
    return user ? { user, lastSeen: s.lastSeen } : null;
  });
  if (!found) return null;
  // sliding expiry, written at most once a day per session
  let refreshed = false;
  if (now - found.lastSeen > DAY) {
    refreshed = true;
    await writeDb((db) => {
      const s = db.sessions.find((x) => x.id === id);
      if (s) { s.lastSeen = now; s.expiresAt = now + SESSION_DAYS * DAY; }
    });
  }
  return { user: found.user, sessionId: id, token, refreshed };
}

/* ---------- forgotten passwords ---------- */
export const RESET_HOURS = 24;

/** A token for a reset link. Like session tokens, only its hash is stored. */
export function newResetToken(): { token: string; id: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, id: tokenHash(token) };
}

/** The reset a link's token belongs to, if it is still valid. */
export function findReset(db: DB, token: string) {
  if (!token || token.length > 100) return null;
  const id = tokenHash(token);
  const reset = db.resets.find((r) => r.id === id && r.expiresAt > Date.now());
  const user = reset && db.users.find((u) => u.id === reset.userId);
  return user ? { reset, user } : null;
}

/**
 * Sets a new password inside a write. Every session on the account ends, as
 * does whatever account this device was signed into, any reset links for the
 * account are used up, and a fresh session starts here.
 */
export function replacePassword(db: DB, req: NextRequest, userId: string, passHash: string): string {
  const here = req.cookies.get(SESSION_COOKIE)?.value;
  const hereId = here ? tokenHash(here) : "";
  db.users.find((u) => u.id === userId)!.passHash = passHash;
  db.sessions = db.sessions.filter((s) => s.userId !== userId && s.id !== hereId);
  db.resets = db.resets.filter((r) => r.userId !== userId);
  return startSession(db, userId);
}

/** Constant-time comparison for secrets such as the setup code. */
export function sameSecret(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}
