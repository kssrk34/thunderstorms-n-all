import { existsSync, promises as fs } from "fs";
import path from "path";
import { emptyGame, toStored } from "../seed";
import type { StoredGame } from "../types";
import { today } from "../utils";
import { LATEST_SCHEMA, migrate } from "./migrations";

/**
 * The whole squad's data is one small JSON document. Five cousins is a tiny
 * dataset, so this keeps hosting, inspecting and backing up simple.
 *
 * Two places it can live:
 * - a file on disk (local development, or any host with a persistent disk);
 * - Upstash Redis (Vercel and other serverless hosts), used automatically
 *   when KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN
 *   are set.
 * Writes are all-or-nothing and use compare-and-set, so two server
 * instances can never silently overwrite each other's changes.
 */

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  passHash: string;
  role: "admin" | "member";
  emoji: string;
  color: string;
  /** data: URL of an uploaded profile picture */
  photo?: string;
  photoV?: number;
  bio?: string;
  interests: string[];
  onboarded: boolean;
  createdAt: number;
  invitedBy?: string;
}

export interface SessionRecord {
  /** sha-256 of the session token; the raw token only ever lives in the cookie */
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastSeen: number;
}

export interface InviteRecord {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedBy?: string;
  usedAt?: number;
}

export interface DB {
  schema: number;
  /** bumps on every change cousins can see; clients poll on it */
  rev: number;
  meta: { createdAt: number; setupCode?: string };
  users: UserRecord[];
  sessions: SessionRecord[];
  invites: InviteRecord[];
  game: StoredGame;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const DAILY_BACKUPS_KEPT = 14;

/* ------------------------------------------------------------------ */
/* backends                                                            */
/* ------------------------------------------------------------------ */
interface Backend {
  name: string;
  /** "same" when `known` is still current; otherwise the stored document (null if none yet) and its version. */
  latest(known: string | null): Promise<"same" | { raw: string | null; ver: string }>;
  /** Saves only if the stored version is still `expected`. */
  save(raw: string, expected: string, next: string): Promise<boolean>;
  backup(label: string, raw: string): Promise<string>;
  daily(day: string, raw: string): Promise<void>;
}

export const DATA_DIR = process.env.TNA_DATA_DIR ? path.resolve(process.env.TNA_DATA_DIR) : path.join(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "thunderstorms.json");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

/** One process owns the file, so the in-memory copy is always current. */
const fileBackend: Backend = {
  name: "file",
  async latest(known) {
    if (known !== null) return "same";
    return { raw: existsSync(DB_FILE) ? await fs.readFile(DB_FILE, "utf8") : null, ver: "file" };
  },
  async save(raw) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, raw, "utf8");
    for (let i = 0; ; i++) {
      try {
        await fs.rename(tmp, DB_FILE);
        return true;
      } catch (e) {
        // Windows can briefly lock the target (antivirus, indexers); retry a few times
        if (i >= 4) throw e;
        await new Promise((r) => setTimeout(r, 40 * (i + 1)));
      }
    }
  },
  async backup(label, raw) {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `${label}-${stamp()}.json`);
    await fs.writeFile(file, raw, "utf8");
    return file;
  },
  async daily(day, raw) {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const target = path.join(BACKUP_DIR, `daily-${day}.json`);
    if (!existsSync(target)) await fs.writeFile(target, raw, "utf8");
    const dailies = (await fs.readdir(BACKUP_DIR)).filter((f) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const old of dailies.slice(0, Math.max(0, dailies.length - DAILY_BACKUPS_KEPT))) await fs.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
  },
};

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = process.env.TNA_REDIS_PREFIX || "tna";
const K = { db: `${PREFIX}:db`, ver: `${PREFIX}:ver`, backup: `${PREFIX}:backup` };
// Writes the document only if nobody else has written since we read it.
const CAS = "if (redis.call('GET', KEYS[2]) or '') ~= ARGV[1] then return 0 end redis.call('SET', KEYS[1], ARGV[2]) redis.call('SET', KEYS[2], ARGV[3]) return 1";

async function redis<T>(...cmd: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const out = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || out.error) throw new Error(`[thunderstorms] Redis ${cmd[0]} failed: ${out.error ?? res.status}`);
  return out.result as T;
}

const redisBackend: Backend = {
  name: "redis",
  async latest(known) {
    if (known !== null && (await redis<string | null>("GET", K.ver)) === known) return "same";
    const [raw, ver] = await redis<[string | null, string | null]>("MGET", K.db, K.ver);
    return { raw, ver: ver ?? "" };
  },
  async save(raw, expected, next) {
    return (await redis<number>("EVAL", CAS, 2, K.db, K.ver, expected, raw, next)) === 1;
  },
  async backup(label, raw) {
    const key = `${K.backup}:${label}:${stamp()}`;
    await redis("SET", key, raw);
    return `Redis key ${key}`;
  },
  async daily(day, raw) {
    await redis("SET", `${K.backup}:daily:${day}`, raw, "NX", "EX", DAILY_BACKUPS_KEPT * 86_400);
  },
};

export const STORAGE_MISSING = "Storage isn't connected yet. In your Vercel project, open Storage, add an Upstash Redis database, connect it to this project, then redeploy.";

function backend(): Backend {
  if (REDIS_URL && REDIS_TOKEN) return redisBackend;
  // serverless hosts have no lasting disk: refuse rather than lose people's data
  if (process.env.VERCEL) throw new ApiError(503, STORAGE_MISSING);
  return fileBackend;
}

/* ------------------------------------------------------------------ */
/* loading, migrating and writing                                      */
/* ------------------------------------------------------------------ */
interface Snapshot { db: DB; ver: string }
interface Store { snap: Snapshot | null; inflight: Promise<Snapshot> | null; queue: Promise<unknown>; lastDaily: string; announced: boolean }
const g = globalThis as unknown as { __tnaStore?: Store };
// survives hot reloads in dev, and warm serverless invocations
const store: Store = g.__tnaStore ?? (g.__tnaStore = { snap: null, inflight: null, queue: Promise.resolve(), lastDaily: "", announced: false });

const newVer = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function freshDb(): DB {
  return { schema: LATEST_SCHEMA, rev: 1, meta: { createdAt: Date.now() }, users: [], sessions: [], invites: [], game: toStored(emptyGame()) };
}

function announceSetup(db: DB) {
  if (db.users.length > 0 || store.announced) return;
  store.announced = true;
  const code = process.env.TNA_SETUP_CODE || db.meta.setupCode;
  console.log(
    "\n  ⛈  Thunderstorms 'n' All: no accounts yet.\n" +
    `     Setup code for the first cousin: ${code}\n` +
    "     Enter it on the Create account screen. After that, invite the others from Settings.\n",
  );
}

/** The current document, reloaded only when someone else has changed it. Concurrent callers share one check. */
function current(): Promise<Snapshot> {
  if (store.inflight) return store.inflight;
  const p = refresh().finally(() => { if (store.inflight === p) store.inflight = null; });
  store.inflight = p;
  return p;
}

async function refresh(attempt = 0): Promise<Snapshot> {
  const b = backend();
  const got = await b.latest(store.snap?.ver ?? null);
  if (got === "same") return store.snap!;

  let db: DB;
  let dirty = false;
  if (got.raw === null) {
    db = freshDb();
    dirty = true;
  } else {
    try {
      db = JSON.parse(got.raw);
    } catch {
      // never overwrite data we can't read
      throw new Error(`[thunderstorms] The stored database is not valid JSON (${b.name}). Refusing to continue so nothing is overwritten. Restore it from a backup.`);
    }
    if ((db.schema ?? 0) < LATEST_SCHEMA) {
      const where = await b.backup(`pre-migration-v${db.schema ?? 0}`, got.raw);
      console.log(`[thunderstorms] backed up the database to ${where} before migrating`);
      db = migrate(db);
      dirty = true;
    } else if (db.schema > LATEST_SCHEMA) {
      console.warn(`[thunderstorms] database schema ${db.schema} is newer than this build (${LATEST_SCHEMA}). Loading as-is.`);
    }
  }
  if (db.users.length === 0 && !process.env.TNA_SETUP_CODE && !db.meta.setupCode) {
    db.meta.setupCode = makeCode();
    dirty = true;
  }

  let ver = got.ver;
  if (dirty) {
    const next = newVer();
    if (!(await b.save(JSON.stringify(db), got.ver, next))) {
      // another instance initialised or migrated first: use theirs
      if (attempt > 4) throw new ApiError(503, "The squad is busy right now. Please try again.");
      return refresh(attempt + 1);
    }
    ver = next;
  }
  store.snap = { db, ver };
  announceSetup(db);
  return store.snap;
}

/** Read-only access. Do not mutate what you get. */
export async function readDb<T>(fn: (db: DB) => T): Promise<T> {
  return fn((await current()).db);
}

/**
 * All-or-nothing write. If `fn` throws, nothing is saved. If another
 * instance wrote in the meantime, `fn` runs again on the fresh data.
 */
export function writeDb<T>(fn: (draft: DB) => T): Promise<T> {
  const run = async () => {
    const b = backend();
    for (let attempt = 0; attempt < 30; attempt++) {
      // back off a little, with jitter, when another instance keeps winning
      if (attempt) await new Promise((r) => setTimeout(r, 10 + Math.random() * 30 * Math.min(attempt, 10)));
      const base = await current();
      const draft = structuredClone(base.db);
      const out = fn(draft);
      const day = today();
      if (store.lastDaily !== day) {
        await b.daily(day, JSON.stringify(base.db));
        store.lastDaily = day;
      }
      const next = newVer();
      if (await b.save(JSON.stringify(draft), base.ver, next)) {
        store.snap = { db: draft, ver: next };
        return out;
      }
      store.snap = null;
    }
    throw new ApiError(503, "The squad is busy right now. Please try again.");
  };
  const p = store.queue.then(run, run);
  store.queue = p.catch(() => {});
  return p;
}

/* ------------------------------------------------------------------ */
/* codes                                                               */
/* ------------------------------------------------------------------ */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
/** 8 random characters from an unambiguous alphabet, shown as XXXX-XXXX. */
export function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normaliseCode(input: unknown): string {
  const s = String(input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}
