import { existsSync, promises as fs } from "fs";
import path from "path";
import { emptyGame, toStored } from "../seed";
import type { StoredGame } from "../types";
import { today } from "../utils";
import { LATEST_SCHEMA, migrate } from "./migrations";

/**
 * A small JSON-file database. Five cousins is a tiny dataset, so one file
 * keeps hosting, inspecting and backing up simple. Writes are serialised,
 * atomic (temp file + rename) and snapshotted to backups/ once a day.
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

export const DATA_DIR = process.env.TNA_DATA_DIR ? path.resolve(process.env.TNA_DATA_DIR) : path.join(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "thunderstorms.json");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
const DAILY_BACKUPS_KEPT = 14;

interface Store { db: DB | null; loading: Promise<DB> | null; queue: Promise<unknown>; lastDaily: string; announced: boolean }
const g = globalThis as unknown as { __tnaStore?: Store };
// survives hot reloads in dev so there is only ever one writer
const store: Store = g.__tnaStore ?? (g.__tnaStore = { db: null, loading: null, queue: Promise.resolve(), lastDaily: "", announced: false });

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function freshDb(): DB {
  return { schema: LATEST_SCHEMA, rev: 1, meta: { createdAt: Date.now() }, users: [], sessions: [], invites: [], game: toStored(emptyGame()) };
}

async function backup(contents: string, label: string) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `${label}-${stamp}.json`);
  await fs.writeFile(file, contents, "utf8");
  return file;
}

async function persist(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db), "utf8");
  for (let i = 0; ; i++) {
    try {
      await fs.rename(tmp, DB_FILE);
      return;
    } catch (e) {
      // Windows can briefly lock the target (antivirus, indexers); retry a few times
      if (i >= 4) throw e;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
}

async function dailySnapshot() {
  const day = today();
  if (store.lastDaily === day || !existsSync(DB_FILE)) return;
  store.lastDaily = day;
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const target = path.join(BACKUP_DIR, `daily-${day}.json`);
  if (!existsSync(target)) await fs.copyFile(DB_FILE, target);
  const dailies = (await fs.readdir(BACKUP_DIR)).filter((f) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const old of dailies.slice(0, Math.max(0, dailies.length - DAILY_BACKUPS_KEPT))) await fs.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
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

async function loadFromDisk(): Promise<DB> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  let db: DB;
  if (!existsSync(DB_FILE)) {
    db = freshDb();
  } else {
    const raw = await fs.readFile(DB_FILE, "utf8");
    try {
      db = JSON.parse(raw);
    } catch {
      // never overwrite a file we can't read: that could destroy real data
      throw new Error(`[thunderstorms] ${DB_FILE} is not valid JSON. Refusing to start so nothing is overwritten. Restore a copy from ${BACKUP_DIR}.`);
    }
    if ((db.schema ?? 0) < LATEST_SCHEMA) {
      const saved = await backup(raw, `pre-migration-v${db.schema ?? 0}`);
      console.log(`[thunderstorms] backed up the database to ${saved} before migrating`);
      db = migrate(db);
    } else if (db.schema > LATEST_SCHEMA) {
      console.warn(`[thunderstorms] database schema ${db.schema} is newer than this build (${LATEST_SCHEMA}). Loading as-is.`);
    }
  }
  if (db.users.length === 0 && !process.env.TNA_SETUP_CODE && !db.meta.setupCode) db.meta.setupCode = makeCode();
  await persist(db);
  announceSetup(db);
  return db;
}

async function load(): Promise<DB> {
  if (store.db) return store.db;
  store.loading ??= loadFromDisk().then((db) => (store.db = db)).finally(() => { store.loading = null; });
  return store.loading;
}

/** Read-only access. Do not mutate what you get. */
export async function readDb<T>(fn: (db: DB) => T): Promise<T> {
  return fn(await load());
}

/** Serialised, all-or-nothing write. If `fn` throws, nothing is saved. */
export function writeDb<T>(fn: (draft: DB) => T): Promise<T> {
  const run = async () => {
    const draft = structuredClone(await load());
    const out = fn(draft);
    await dailySnapshot();
    await persist(draft);
    store.db = draft;
    return out;
  };
  const p = store.queue.then(run, run);
  store.queue = p.catch(() => {});
  return p;
}

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
