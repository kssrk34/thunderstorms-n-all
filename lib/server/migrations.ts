import { CHARACTER, CHARACTERS, EMOJI_TO_ICON, LEGACY_CHARACTERS } from "../catalog";
import { emptyGame, toStored } from "../seed";
import { addDays, monthStart, today, uid } from "../utils";

/**
 * Schema migrations for the server database. Each step runs exactly once, in
 * order, and the database file is backed up before any of them run. Normal
 * startup never resets or clears data: only a migration may change stored
 * content, and only in the specific way it describes.
 */
export const LATEST_SCHEMA = 6;

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
  4: {
    name: "Aura Points, ten life dimensions and the squad feed",
    up(db) {
      const g = db.game;
      const icon = (x: Raw) => {
        if (!x.icon && x.emoji && EMOJI_TO_ICON[x.emoji]) x.icon = EMOJI_TO_ICON[x.emoji];
      };
      for (const h of g.habits ?? []) { h.dim = newDim(h.dim); icon(h); }
      // one-time quests were already private; their completion labels now are too
      for (const x of g.todos ?? []) { x.dim = newDim(x.dim); x.private = true; icon(x); }
      for (const x of g.goals ?? []) { x.dim = newDim(x.dim); x.peak = Math.max(x.peak ?? 0, x.current ?? 0); }
      for (const c of g.challenges ?? []) {
        c.dim = newDim(c.dim);
        c.track ??= "manual";
        c.startsOn ??= c.period === "daily" ? c.endsOn : addDays(c.endsOn, c.period === "weekly" ? -6 : -30);
        icon(c);
      }
      for (const m of g.memories ?? []) { icon(m); m.icon ??= "sun"; }
      for (const p of g.penalties ?? []) p.dim = newDim(p.dim);
      for (const l of g.logs ?? []) {
        l.dim = newDim(l.dim);
        // history that was meant to be personal: what cousins see is now just "a private activity"
        if (PRIVATE_KINDS.has(l.kind)) l.private = true;
      }
      for (const n of g.notifs ?? []) {
        n.title = String(n.title ?? "").replace(/\bXP\b/g, "Aura Points");
        if (n.body) n.body = String(n.body).replace(/\bXP\b/g, "Aura Points");
      }
      g.rivalries ??= [];
      for (const d of g.duels ?? []) {
        const end = d.period === "week" ? addDays(d.start, 6) : addDays(monthStart(addDays(d.start, 32)), -1);
        g.rivalries.push({
          id: d.id, title: d.metric === "days" ? "Most active days" : "Most Aura", metric: d.metric === "days" ? "days" : "aura",
          start: d.start, end, participants: [d.a, d.b], createdBy: d.a, ...(d.stake ? { stake: d.stake } : {}),
        });
      }
      delete g.duels;
      g.priorities ??= {};
      g.feed ??= [];
      if (!g.feed.length) g.feed = backfillFeed(g);
      g.v = 4;
      db.outbox ??= [];
    },
  },
  5: {
    name: "fresh start: clear everyone's activity, keep every account",
    up(db) {
      // The owner asked for a clean slate for all cousins. Accounts, passwords, photos, characters,
      // bios, roles, invitations, sessions and notification settings are untouched; everything the
      // cousins did in the game is removed. The pre-migration backup keeps a copy of all of it.
      db.game = toStored(emptyGame());
      db.outbox = [];
      for (const u of db.users ?? []) delete u.frame; // frames were unlocked by badges that no longer exist
      db.rev = (db.rev ?? 0) + 1;
      console.log(`[thunderstorms] migration 5: cleared game data for ${(db.users ?? []).length} account(s)`);
    },
  },
  6: {
    name: "character portraits, shared quests and notification categories",
    up(db) {
      // Additive and per-account only: no quest, log, goal or photo changes.
      db.game.shares ??= [];
      const users: Raw[] = db.users ?? [];

      // The drawn characters are replaced by the five portraits. Each cousin moves to the portrait
      // closest in colour (still one per cousin); cousins with neither a character nor a photo get a
      // free one so every card has a face. Anyone can pick a different one afterwards. Photos are untouched.
      const taken = new Set<string>(users.map((u) => u.character).filter((c: unknown) => typeof c === "string" && CHARACTER[c as string]));
      const free = () => CHARACTERS.find((c) => !taken.has(c.id))?.id;
      for (const u of [...users].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))) {
        if (u.character && CHARACTER[u.character]) continue;
        const want = u.character ? LEGACY_CHARACTERS[u.character] : undefined;
        const pick = want && !taken.has(want) ? want : u.character || !u.photo ? free() : undefined;
        if (pick) { u.character = pick; taken.add(pick); } else delete u.character;
      }

      // Notification kinds became categories; earlier choices carry over.
      for (const u of users) {
        const k = u.notify?.kinds;
        if (!k) continue;
        const next: Record<string, boolean> = {};
        if (typeof k.daily === "boolean") { next.habits = k.daily; next.quests = k.daily; }
        if (typeof k.overtaken === "boolean") next.leaderboard = k.overtaken;
        if (typeof k.challengeDone === "boolean" || typeof k.ending === "boolean") next.missions = k.challengeDone !== false || k.ending !== false;
        for (const key of ["habits", "quests", "invites", "cousins", "leaderboard", "missions", "recap", "meetups"]) if (typeof k[key] === "boolean") next[key] = k[key];
        u.notify.kinds = next;
      }
      db.rev = (db.rev ?? 0) + 1;
    },
  },
};

/** Twelve life areas became ten dimensions. Life Vision is now calculated, so items filed under it move to Character. */
const DIM_MAP: Record<string, string> = {
  mind: "intellectual", money: "financial", family: "social", friends: "social", creativity: "quality",
  giving: "character", calm: "spiritual", adventure: "quality", vision: "character",
};
const NEW_DIMS = new Set(["health", "intellectual", "emotional", "character", "spiritual", "social", "financial", "career", "quality"]);
const newDim = (d: string) => (NEW_DIMS.has(d) ? d : DIM_MAP[d] ?? "character");
const PRIVATE_KINDS = new Set(["todo", "money", "reflect", "penalty", "health"]);

/**
 * Starts the feed from things cousins really did in the last two weeks and
 * could already see. Private history and personal notes are left out.
 */
function backfillFeed(g: Raw): Raw[] {
  const since = addDays(today(), -14);
  const out: Raw[] = [];
  const ev = (l: Raw, kind: string, text: string) => out.push({ id: uid(), ts: l.ts, userId: l.userId, kind, text, dim: l.dim, xp: l.xp, ref: l.ref, reactions: {} });
  for (const l of g.logs ?? []) {
    if (l.date < since || l.xp <= 0 || l.private) continue;
    const label = String(l.label ?? "");
    if (l.kind === "habit") ev(l, "quest", `completed ${label}`);
    else if (l.kind === "activity") ev(l, "quest", `logged ${label.split(":")[0].toLowerCase()}`);
    else if (l.kind === "challenge") ev(l, "challenge", `completed the challenge ${label.replace(/^[^:]*:\s*/, "")}`);
    else if (l.kind === "goal" && String(l.ref ?? "").startsWith("goal:")) ev(l, "goal", `achieved a goal: ${label.replace(/^Goal achieved:\s*/, "")}`);
    else if (l.kind === "meetup" && l.ref === `mt:${String(l.ref).split(":")[1]}:${l.userId}`) {
      const m = (g.meetups ?? []).find((x: Raw) => x.id === String(l.ref).split(":")[1]);
      if (m && m.by === l.userId) ev(l, "meetup", `met up with ${m.attendees.length - 1} ${m.attendees.length === 2 ? "cousin" : "cousins"} at ${m.place}`);
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 60);
}

export function migrate(db: Raw, to = LATEST_SCHEMA): Raw {
  for (let v = (db.schema ?? 0) + 1; v <= to; v++) {
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
