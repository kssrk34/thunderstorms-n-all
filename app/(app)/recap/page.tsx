"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { Feed } from "@/components/feed";
import { AreaIcon, Delta, PageHeader, ScoreBar, Section, Stat, pct } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { balance, scoresOf } from "@/lib/balance";
import { ACTIVE_DIMS, DIM } from "@/lib/catalog";
import { auraBetween, userLogs } from "@/lib/engine";
import { useGame } from "@/lib/store";
import type { ActiveDim } from "@/lib/types";
import { addDays, fmtShort, today, weekStart } from "@/lib/utils";

const COMPLETIONS = new Set(["habit", "todo", "activity", "challenge", "meetup"]);

export default function Recap() {
  const { s, me, profile, toast } = useGame();
  const [which, setWhich] = useState<"last" | "this">("last");
  const t = today();
  const start = which === "last" ? addDays(weekStart(t), -7) : weekStart(t);
  const end = which === "last" ? addDays(start, 6) : t;
  const pStart = addDays(start, -7);
  const pEnd = addDays(start, -1);

  const r = useMemo(() => {
    const logs = userLogs(s, me);
    const inWeek = (from: string, to: string) => logs.filter((l) => l.date >= from && l.date <= to && l.xp > 0);
    const now = scoresOf(balance(s, me, start, end));
    const prev = scoresOf(balance(s, me, pStart, pEnd));
    const tracked = ACTIVE_DIMS.filter((d) => now[d] !== null).sort((a, b) => now[b]! - now[a]!);
    const attention = [...ACTIVE_DIMS].sort((a, b) => (now[a] ?? -1) - (now[b] ?? -1)).slice(0, 2);
    const gains = ACTIVE_DIMS.filter((d) => now[d] !== null && prev[d] !== null && now[d]! > prev[d]!).sort((a, b) => (now[b]! - prev[b]!) - (now[a]! - prev[a]!)).slice(0, 3);
    const squad = s.members.reduce((a, m) => a + Math.max(0, auraBetween(userLogs(s, m.id), start, end)), 0);
    const startMs = Date.parse(`${start}T00:00:00+05:30`);
    const endMs = Date.parse(`${end}T23:59:59+05:30`);
    const moments = s.feed.filter((e) => e.ts >= startMs && e.ts <= endMs && ["badge", "level", "mission", "rivalry", "meetup", "goal", "streak"].includes(e.kind)).slice(0, 10);
    return {
      aura: auraBetween(logs, start, end), prevAura: auraBetween(logs, pStart, pEnd),
      quests: inWeek(start, end).filter((l) => COMPLETIONS.has(l.kind)).length, prevQuests: inWeek(pStart, pEnd).filter((l) => COMPLETIONS.has(l.kind)).length,
      now, prev, tracked, attention, gains, squad, moments,
    };
  }, [s, me, start, end, pStart, pEnd]);

  const range = `${fmtShort(start)} – ${fmtShort(end)}`;
  const summary = `My week in Thunderstorms 'n' All (${range}): ${r.aura} Aura Points, ${r.quests} quests completed${r.tracked[0] ? `, strongest in ${DIM[r.tracked[0]].name} (${r.now[r.tracked[0]]}%)` : ""}.`;

  const share = async () => {
    try {
      const blob = await drawCard({ name: profile.name, range, aura: r.aura, quests: r.quests, vision: r.now.vision, top: r.tracked.slice(0, 3).map((d) => ({ d, v: r.now[d]! })) });
      const file = new File([blob], `recap-${start}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: summary });
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast("Recap image saved", "info");
      }
    } catch { /* dismissed */ }
  };

  return (
    <div className="space-y-10">
      <Link href="/" className="inline-flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <PageHeader title="Weekly recap" eyebrow={range}
        subtitle={which === "last" ? "How last week went, and what to carry into this one." : "This week so far."}
        action={<Tabs value={which} onValueChange={(v) => setWhich(v as "last" | "this")}><TabsList><TabsTrigger value="last">Last week</TabsTrigger><TabsTrigger value="this">This week</TabsTrigger></TabsList></Tabs>} />

      <Card className="electric relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_100%_0%,hsl(var(--primary)/.22),transparent_60%)]" />
        <div className="relative grid gap-6 sm:grid-cols-3">
          <div>
            <div className="eyebrow">Aura Points</div>
            <div className="mt-1 font-display text-[44px] font-bold leading-none tracking-tight text-primary glow-text tabular-nums">{r.aura.toLocaleString("en-IN")}</div>
            <div className="mt-2 text-[13px] text-muted-foreground"><Delta now={r.aura} prev={r.prevAura} className="text-[13px]" /> vs the week before ({r.prevAura})</div>
          </div>
          <div>
            <div className="eyebrow">Quests completed</div>
            <div className="mt-1 font-display text-[44px] font-bold leading-none tracking-tight tabular-nums">{r.quests}</div>
            <div className="mt-2 text-[13px] text-muted-foreground"><Delta now={r.quests} prev={r.prevQuests} className="text-[13px]" /> vs {r.prevQuests}</div>
          </div>
          <div>
            <div className="eyebrow">Life Vision</div>
            <div className="mt-1 font-display text-[44px] font-bold leading-none tracking-tight tabular-nums">{pct(r.now.vision)}</div>
            <div className="mt-2 text-[13px] text-muted-foreground"><Delta now={r.now.vision} prev={r.prev.vision} className="text-[13px]" /> {r.prev.vision !== null ? `vs ${r.prev.vision}%` : "your overall balance"}</div>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Button onClick={share}><Share2 />Share recap</Button>
          <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(summary); toast("Summary copied", "info"); } catch { /* ignore */ } }}><Download />Copy text</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Strongest">
          <Card className="divide-y divide-border/60">
            {r.tracked.length === 0 && <p className="p-5 text-[14px] text-muted-foreground">Not enough data this week yet.</p>}
            {r.tracked.slice(0, 3).map((d) => <DimLine key={d} d={d} v={r.now[d]} prev={r.prev[d]} />)}
          </Card>
        </Section>
        <Section title="Needs attention">
          <Card className="divide-y divide-border/60">
            {r.attention.map((d) => <DimLine key={d} d={d} v={r.now[d]} prev={r.prev[d]} hint />)}
          </Card>
        </Section>
      </div>

      {r.gains.length > 0 && (
        <Section title="Better than the week before">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {r.gains.map((d) => <Stat key={d} label={DIM[d].name} value={<span className="inline-flex items-center gap-2">{r.now[d]}%<Delta now={r.now[d]} prev={r.prev[d]} className="text-[14px]" /></span>} sub={`from ${r.prev[d]}%`} />)}
          </div>
        </Section>
      )}

      <Section title="The squad this week" eyebrow={`${r.squad.toLocaleString("en-IN")} Aura Points together`}>
        <div className="panel"><Feed events={r.moments} empty="No big moments yet. There's still time." /></div>
      </Section>
    </div>
  );
}

function DimLine({ d, v, prev, hint }: { d: ActiveDim; v: number | null; prev: number | null; hint?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <AreaIcon dim={d} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-medium">{DIM[d].name}</span><span className="flex items-center gap-2"><Delta now={v} prev={prev} /><span className="font-semibold tabular-nums">{pct(v)}</span></span></div>
        <ScoreBar value={v} prev={prev} color={DIM[d].color} className="mt-1.5" height={6} />
        {hint && <p className="mt-1.5 text-[12px] text-muted-foreground">{v === null ? "No quests here yet. One small one would start it." : "One extra quest here this week would show."}</p>}
      </div>
    </div>
  );
}

/** Draws a shareable 1080×1350 recap card. */
async function drawCard(d: { name: string; range: string; aura: number; quests: number; vision: number | null; top: { d: ActiveDim; v: number }[] }): Promise<Blob> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-display").trim() || "system-ui";
  const body = css.getPropertyValue("--font-inter").trim() || "system-ui";
  await document.fonts?.ready;
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0E1A3A"); bg.addColorStop(1, "#05070E");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, 900);
  glow.addColorStop(0, "rgba(66,144,255,.35)"); glow.addColorStop(1, "rgba(66,144,255,0)");
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  // a bolt across the corner
  x.strokeStyle = "rgba(160,210,255,.35)"; x.lineWidth = 4; x.beginPath();
  x.moveTo(930, 40); x.lineTo(880, 170); x.lineTo(925, 175); x.lineTo(860, 330); x.stroke();

  x.fillStyle = "#8FA3C8"; x.font = `600 30px ${body}`; x.fillText("WEEKLY RECAP · " + d.range.toUpperCase(), 80, 130);
  x.fillStyle = "#FFFFFF"; x.font = `700 76px ${display}`; x.fillText(d.name, 80, 230);

  x.fillStyle = "#8FA3C8"; x.font = `600 28px ${body}`; x.fillText("AURA POINTS", 80, 380);
  x.fillStyle = "#6FB1FF"; x.shadowColor = "rgba(66,144,255,.8)"; x.shadowBlur = 40; x.font = `700 180px ${display}`; x.fillText(d.aura.toLocaleString("en-IN"), 70, 550); x.shadowBlur = 0;

  x.fillStyle = "#8FA3C8"; x.font = `600 28px ${body}`;
  x.fillText("QUESTS", 80, 660); x.fillText("LIFE VISION", 460, 660);
  x.fillStyle = "#FFFFFF"; x.font = `700 92px ${display}`;
  x.fillText(String(d.quests), 80, 760); x.fillText(d.vision === null ? "—" : `${d.vision}%`, 460, 760);

  x.fillStyle = "#8FA3C8"; x.font = `600 28px ${body}`; x.fillText("STRONGEST AREAS", 80, 880);
  d.top.forEach((t, i) => {
    const y = 940 + i * 100;
    x.fillStyle = "#E8EEFA"; x.font = `500 36px ${body}`; x.fillText(DIM[t.d].name, 80, y);
    x.fillStyle = "#E8EEFA"; x.textAlign = "right"; x.fillText(`${t.v}%`, W - 80, y); x.textAlign = "left";
    x.fillStyle = "rgba(255,255,255,.08)"; x.beginPath(); x.roundRect(80, y + 20, W - 160, 16, 8); x.fill();
    x.fillStyle = DIM[t.d].color; x.beginPath(); x.roundRect(80, y + 20, Math.max(16, ((W - 160) * t.v) / 100), 16, 8); x.fill();
  });

  x.fillStyle = "#8FA3C8"; x.font = `600 30px ${display}`; x.fillText("Thunderstorms 'n' All", 80, H - 80);
  x.textAlign = "right"; x.font = `500 26px ${body}`; x.fillText("Five cousins. One shared universe.", W - 80, H - 80);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png"));
}

