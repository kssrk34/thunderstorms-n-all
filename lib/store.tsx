"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { StormLoader } from "@/components/brand";
import { api } from "./api";
import type { QuestKind } from "./catalog";
import { BADGES, levelOf, lifetimeAura, userLogs } from "./engine";
import { migrateLegacyBrowserData } from "./legacy";
import { applyAction, Nope, type Action } from "./reducer";
import { playLevelUp, playZap } from "./sound";
import { memberStats } from "./stats";
import type { ActiveDim, DailyGoal, GameState, Me, Member, MemberStats, View } from "./types";
import { today, uid } from "./utils";

const POLL_MS = 12_000;

export interface Toast { id: string; text: string; tone: "aura" | "info" | "warn"; aura?: number }
export interface Celebration { kind: "badge" | "level"; badgeId?: string; title: string; body: string }
export interface QuestPreset { kind?: QuestKind; title?: string; dim?: ActiveDim; icon?: string; xp?: number; goalId?: string; edit?: { type: "habit" | "todo"; id: string }; invite?: boolean }
export interface GoalPreset { title?: string; dim?: ActiveDim; edit?: string }
export type Sheet =
  | { kind: "quest"; preset?: QuestPreset }
  | { kind: "goal"; preset?: GoalPreset }
  | { kind: "log" }
  | { kind: "rivalry" }
  | { kind: "meetup" }
  /** invite cousins: to a new shared quest made from one of yours, or to an existing one */
  | { kind: "invite"; source?: { type: "habit" | "todo"; id: string }; shareId?: string }
  /** a shared quest's details and participants */
  | { kind: "share"; id: string };

export interface ProfilePatch { name?: string; bio?: string; character?: string | null; photo?: string | null; frame?: string; onboarded?: boolean; dailyGoal?: DailyGoal; shareActivity?: boolean }

interface Ctx {
  s: GameState;
  me: string;
  profile: Me;
  /** aggregated progress for any cousin; your own is recalculated instantly */
  stats: (id: string) => MemberStats | undefined;
  act: (a: Action) => boolean;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"], aura?: number) => void;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  sheet: Sheet | null;
  openSheet: (s: Sheet | null) => void;
  updateProfile: (p: ProfilePatch) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** bumps whenever your Aura goes up, so counters can glow */
  surge: number;
}
const GameCtx = createContext<Ctx | null>(null);

/** Fresh id for something the user creates, shared by the optimistic and the server copy. */
export const newId = () => uid() + uid().slice(0, 4);

function signedOut() {
  window.location.replace("/login");
}

/**
 * Loads the signed-in cousin's view and keeps it fresh.
 * `gate="app"` sends people who haven't finished onboarding to /onboarding;
 * `gate="onboarding"` sends people who have finished it to their dashboard.
 */
export function GameProvider({ children, gate }: { children: ReactNode; gate: "app" | "onboarding" }) {
  const router = useRouter();
  const [shown, setShown] = useState<{ s: GameState; me: Me; stats: Record<string, MemberStats> } | null>(null);
  const server = useRef<View | null>(null);
  const display = useRef<GameState | null>(null);
  const pending = useRef<Action[]>([]);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const myAura = useRef<number | null>(null);
  const [surge, setSurge] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [sheet, openSheet] = useState<Sheet | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info", aura?: number) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, tone, aura }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "warn" ? 4200 : 3000);
  }, []);

  /** Shows a state, and makes the Aura counter glow (with a zap) when your total rises. */
  const show = useCallback((st: GameState, v: View, local: boolean) => {
    display.current = st;
    const aura = lifetimeAura(userLogs(st, v.me.id));
    if (myAura.current !== null && aura > myAura.current) {
      setSurge((n) => n + 1);
      if (local) playZap();
    }
    myAura.current = aura;
    setShown({ s: st, me: v.me, stats: v.stats });
  }, []);

  /** Shows the confirmed server state with any still-pending actions replayed on top. */
  const rebase = useCallback(() => {
    const v = server.current;
    if (!v) return;
    let st = v.game;
    for (const a of pending.current) {
      try { st = applyAction(st, a, v.me.id, { admin: v.me.role === "admin", scope: "self" }); } catch { /* the server will have the final word */ }
    }
    show(st, v, false);
  }, [show]);

  /** Aura toasts and milestone celebrations, from what the server actually recorded. */
  const feedback = useCallback((prev: GameState, next: GameState, me: string, fromAction: boolean) => {
    const before = new Set(prev.logs.map((l) => l.id));
    const added = next.logs.filter((l) => l.userId === me && !before.has(l.id));
    for (const l of added.slice(-3)) if (l.xp > 0) toast(l.label, "aura", l.xp);
    const mineBefore = prev.logs.filter((l) => l.userId === me).length;
    const mineAfter = next.logs.filter((l) => l.userId === me).length;
    if (fromAction && !added.length && mineAfter < mineBefore) toast("Undone", "info");

    const cel: Celebration[] = [];
    const had = prev.badges[me] ?? {};
    for (const id of Object.keys(next.badges[me] ?? {})) {
      if (had[id]) continue;
      const b = BADGES.find((x) => x.id === id);
      if (b) cel.push({ kind: "badge", badgeId: b.id, title: b.name, body: b.desc });
    }
    const was = prev.levelSeen[me] ?? 0;
    const now = next.levelSeen[me] ?? 0;
    if (now > was && was > 0) {
      const L = levelOf(lifetimeAura(userLogs(next, me)));
      cel.push({ kind: "level", title: `Level ${L.level}`, body: `You're now a ${L.title}.` });
      playLevelUp();
    }
    if (cel.length) setQueue((q) => [...q, ...cel]);
  }, [toast]);

  const receive = useCallback((next: View, opts: { fromAction?: boolean } = {}) => {
    const prev = server.current;
    if (prev && next.rev < prev.rev) return; // an older reply arriving late
    server.current = next;
    if (prev) feedback(prev.game, next.game, next.me.id, !!opts.fromAction);
    rebase();
  }, [feedback, rebase]);

  // first load
  useEffect(() => {
    migrateLegacyBrowserData();
    let alive = true;
    (async () => {
      const r = await api<View>("/api/state");
      if (!alive) return;
      if (!r.ok) {
        if (r.status === 401) return signedOut();
        setTimeout(() => window.location.reload(), 4000);
        return toast(r.error, "warn");
      }
      if (gate === "app" && !r.data.me.onboarded) { setRedirecting(true); router.replace("/onboarding"); }
      if (gate === "onboarding" && r.data.me.onboarded) { setRedirecting(true); router.replace("/"); }
      receive(r.data);
    })();
    return () => { alive = false; };
  }, [gate, receive, router, toast]);

  // keep up with the other cousins
  useEffect(() => {
    let day = today();
    const tick = async () => {
      const v = server.current;
      if (!v || document.hidden || pending.current.length) return;
      if (day !== today()) { day = today(); rebase(); }
      const r = await api<View | { rev: number; unchanged: true }>(`/api/state?rev=${v.rev}&day=${today()}`);
      if (!r.ok) { if (r.status === 401) signedOut(); return; }
      if ("unchanged" in r.data || pending.current.length) return;
      receive(r.data);
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [receive, rebase]);

  const act = useCallback((a: Action): boolean => {
    const v = server.current;
    const cur = display.current;
    if (!v || !cur) return false;
    let optimistic: GameState;
    try {
      optimistic = applyAction(cur, a, v.me.id, { admin: v.me.role === "admin", scope: "self" });
    } catch (e) {
      if (e instanceof Nope) { toast(e.message, "warn"); return false; }
      throw e;
    }
    show(optimistic, v, true);
    pending.current.push(a);
    chain.current = chain.current.then(async () => {
      const r = await api<View>("/api/action", { body: { action: a } });
      pending.current.shift();
      if (!r.ok) {
        if (r.status === 401) return signedOut();
        toast(r.error, "warn");
        return rebase();
      }
      receive(r.data, { fromAction: true });
    });
    return true;
  }, [rebase, receive, show, toast]);

  const updateProfile = useCallback(async (p: ProfilePatch) => {
    const r = await api<View>("/api/profile", { method: "PATCH", body: p });
    if (!r.ok) { if (r.status === 401) signedOut(); return r.error; }
    receive(r.data);
    return null;
  }, [receive]);

  const signOut = useCallback(async () => {
    await api("/api/auth/logout", { body: {} });
    window.location.replace("/welcome");
  }, []);

  const mine = useMemo(() => (shown ? memberStats(shown.s, shown.me.id) : undefined), [shown]);
  const stats = useCallback((id: string) => (id === shown?.me.id ? mine : shown?.stats[id]), [shown, mine]);

  if (!shown || redirecting) return <StormLoader />;
  return (
    <GameCtx.Provider value={{
      s: shown.s, me: shown.me.id, profile: shown.me, stats, act, toasts, toast,
      celebration: queue[0] ?? null, dismissCelebration: () => setQueue((q) => q.slice(1)),
      sheet, openSheet, updateProfile, signOut, surge,
    }}>
      {children}
    </GameCtx.Provider>
  );
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}

/** The member profile for an id, with a graceful fallback. */
export function useMember(id: string): Member {
  const { s } = useGame();
  return s.members.find((m) => m.id === id) ?? { id, name: "Cousin", username: "", emoji: "", color: "#8693AD", joinedAt: 0 };
}
