import { emptyGame, toStored } from "../seed";

/**
 * Schema migrations for the server database. Each step runs exactly once, in
 * order, and the database file is backed up before any of them run. Normal
 * startup never resets or clears data: only a migration may change stored
 * content, and only in the specific way it describes.
 */
export const LATEST_SCHEMA = 3;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

const MIGRATIONS: Record<number, { name: string; up: (db: Raw) => void }> = {
  1: {
    name: "full database shape",
    up(db) {
      db.meta ??= { createdAt: Date.now() };
      db.rev ??= 1;
      db.users ??= [];
      db.sessions ??= [];
      db.invites ??= [];
      db.game = { ...toStored(emptyGame()), ...(db.game ?? {}) };
    },
  },
  2: {
    name: "remove demo content",
    up(db) {
      const removed = purgeDemoContent(db);
      if (removed) console.log(`[thunderstorms] migration 2: removed ${removed} demo item(s) not owned by a real account`);
    },
  },
  3: {
    name: "password reset links",
    up(db) {
      db.resets ??= [];
    },
  },
};

export function migrate(db: Raw): Raw {
  for (let v = (db.schema ?? 0) + 1; v <= LATEST_SCHEMA; v++) {
    console.log(`[thunderstorms] running migration ${v}: ${MIGRATIONS[v].name}`);
    MIGRATIONS[v].up(db);
    db.schema = v;
  }
  return db;
}

/**
 * Earlier builds shipped sample cousins with pre-made quests, goals and
 * activity. Anything owned by an id that is not a real account is demo
 * content and is removed. Real accounts, sessions, invitations and every
 * item they own are left untouched.
 */
export function purgeDemoContent(db: Raw): number {
  const real = new Set<string>((db.users ?? []).map((u: Raw) => u.id));
  const g = db.game;
  let removed = 0;
  const keep = <T,>(list: T[] | undefined, ok: (x: T) => boolean): T[] => {
    const arr = list ?? [];
    const out = arr.filter(ok);
    removed += arr.length - out.length;
    return out;
  };
  const owned = (x: Raw) => real.has(x.userId);
  g.habits = keep(g.habits, owned);
  g.todos = keep(g.todos, owned);
  g.goals = keep(g.goals, owned);
  g.logs = keep(g.logs, owned);
  g.gratitude = keep(g.gratitude, owned);
  g.reviews = keep(g.reviews, owned);
  g.savings = keep(g.savings, owned);
  g.memories = keep(g.memories, (m: Raw) => real.has(m.by));
  g.duels = keep(g.duels, (d: Raw) => real.has(d.a) && real.has(d.b));
  g.challenges = keep(g.challenges, (c: Raw) => real.has(c.createdBy)).map((c: Raw) => ({ ...c, participants: c.participants.filter((p: string) => real.has(p)) }));
  g.meetups = keep(g.meetups, (m: Raw) => m.attendees.filter((p: string) => real.has(p)).length >= 2).map((m: Raw) => ({ ...m, attendees: m.attendees.filter((p: string) => real.has(p)) }));
  for (const key of ["health", "mood", "lessons", "badges", "levelSeen", "selfRatings", "restDays", "boxOpened", "savingsTarget", "notifsSeen"]) {
    for (const id of Object.keys(g[key] ?? {})) {
      if (!real.has(id)) { delete g[key][id]; removed++; }
    }
  }
  // notifications about removed sample cousins would point at people who don't exist
  if (removed) g.notifs = [];
  return removed;
}
