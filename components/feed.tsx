"use client";

import Link from "next/link";
import { DIM } from "@/lib/catalog";
import { useGame, useMember } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { AuraChip, AvatarView } from "./game";
import { FEED_ICON, REACTIONS } from "./icons";

/** One shared moment, with lightweight reactions from the other cousins. */
export function FeedItem({ e, compact }: { e: FeedEvent; compact?: boolean }) {
  const { me, act } = useGame();
  const m = useMember(e.userId);
  const mine = e.userId === me;
  const Icon = FEED_ICON[e.kind] ?? FEED_ICON.quest;
  const color = e.dim ? DIM[e.dim].color : e.kind === "badge" || e.kind === "level" || e.kind === "rivalry" ? "hsl(var(--accent))" : "hsl(var(--primary))";
  const counts = REACTIONS.map((r) => ({ ...r, n: Object.values(e.reactions).filter((k) => k === r.id).length, on: e.reactions[me] === r.id }));
  if (e.kind === "together") {
    // a group moment: everyone in a shared quest, so no single name in front
    return (
      <div className={cn("flex gap-3", compact ? "py-2.5" : "px-4 py-3.5")}>
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--arc)))] text-white shadow-[0_6px_16px_-6px_hsl(var(--primary))]"><Icon className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug">{e.text}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><span>{timeAgo(e.ts)}</span>{e.xp ? <AuraChip value={e.xp} className="text-[11px]" /> : null}<span>· shared quest</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-3", compact ? "py-2.5" : "px-4 py-3.5")}>
      <Link href={`/u/${m.username}`} className="relative shrink-0" aria-label={m.name}>
        <AvatarView member={m} size={compact ? 32 : 38} />
        <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full ring-2 ring-card" style={{ background: color }}>
          <Icon className="h-2.5 w-2.5 text-[#05070E]" strokeWidth={2.6} />
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug">
          <span className="font-semibold">{mine ? "You" : m.name}</span> <span className="text-foreground/80">{mine ? e.text.replace(/^hit their/, "hit your").replace(/^is on/, "are on") : e.text}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{timeAgo(e.ts)}</span>
          {e.xp ? <AuraChip value={e.xp} className="text-[11px]" /> : null}
          <div className="ml-auto flex items-center gap-1">
            {counts.map((r) => (mine ? r.n > 0 : true) && (
              <button key={r.id} type="button" disabled={mine} onClick={() => act({ t: "react", id: e.id, kind: r.on ? null : r.id })} aria-pressed={r.on}
                aria-label={mine ? `${r.n} ${r.label}` : `${r.on ? "Remove" : "React"}: ${r.label}`} title={r.label}
                className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2 transition disabled:cursor-default",
                  r.on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground", !r.n && !r.on && "px-1.5")}>
                <r.icon className={cn("h-3.5 w-3.5", r.on && "fill-current")} />
                {r.n > 0 && <span className="tabular-nums">{r.n}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Feed({ events, empty, compact }: { events: FeedEvent[]; empty?: string; compact?: boolean }) {
  if (!events.length) return <p className="px-4 py-6 text-[14px] text-muted-foreground">{empty ?? "Nothing shared yet. Completed quests your cousins share will appear here."}</p>;
  return <div className={cn("divide-y divide-border/60", compact && "px-4")}>{events.map((e) => <FeedItem key={e.id} e={e} compact={compact} />)}</div>;
}
