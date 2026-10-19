"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Eye } from "lucide-react";
import { Feed } from "@/components/feed";
import { AreaIcon, AreaTag, Delta, EmptyState, ScoreBar, Section, memberColor, tooltipStyle, useAnimate } from "@/components/game";
import { AchievementGrid, ProfileHero, ProfileStats } from "@/components/profile";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Progress } from "@/components/ui/progress";
import { ACTIVE_DIMS, DIM } from "@/lib/catalog";
import { useGame } from "@/lib/store";

/** A cousin's profile. Read-only: there is nothing here to edit, and the server wouldn't allow it anyway. */
export default function CousinProfile() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const { s, me, stats } = useGame();
  const anim = useAnimate();
  const m = s.members.find((x) => x.username === username);
  useEffect(() => { if (m?.id === me) router.replace("/profile"); }, [m, me, router]);
  if (!m) return <Card><EmptyState title="No cousin by that name" body="They may have changed it, or the link is mistyped." action={<Link href="/" className="text-primary">Back to the dashboard</Link>} /></Card>;
  const st = stats(m.id);
  const color = memberColor(m);
  const radar = ACTIVE_DIMS.map((d) => ({ dim: DIM[d].short, v: st?.b30[d] ?? 0 }));
  const goals = s.goals.filter((g) => g.userId === m.id && !g.done);
  const feed = s.feed.filter((e) => e.userId === m.id).slice(0, 12);
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] text-muted-foreground"><Eye className="h-3.5 w-3.5" />Viewing · read-only</span>
      </div>
      <ProfileHero m={m} />
      <ProfileStats id={m.id} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="px-5 pt-5"><div className="font-display text-[16px] font-semibold">Life Balance</div><div className="text-[13px] text-muted-foreground">Last 30 days, from completed quests</div></div>
          <div className="h-[280px] px-1 pb-3 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="68%">
                <PolarGrid stroke="currentColor" strokeOpacity={0.14} />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "currentColor", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar isAnimationActive={anim} dataKey="v" name={m.name} stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="divide-y divide-border/60 lg:col-span-3">
          {(["vision", ...ACTIVE_DIMS] as const).map((d) => (
            <div key={d} className="flex items-center gap-3 px-5 py-2.5">
              <AreaIcon dim={d} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="truncate">{DIM[d].name}</span><span className="flex items-center gap-2"><Delta now={st?.b7[d]} prev={st?.bPrev7[d]} /><span className="font-semibold tabular-nums">{st?.b30[d] ?? "—"}{st?.b30[d] !== null && st?.b30[d] !== undefined ? "%" : ""}</span></span></div>
                <ScoreBar value={st?.b30[d]} prev={st?.bPrev30[d]} color={d === "vision" ? "hsl(var(--primary))" : DIM[d].color} className="mt-1.5" height={5} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {goals.length > 0 && (
        <Section title="Working on">
          <List>
            {goals.map((g) => (
              <div key={g.id} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3"><span className="truncate text-[15px] font-medium">{g.title}</span><AreaTag dim={g.dim} /></div>
                {g.target ? <><Progress value={(g.current / g.target) * 100} className="mt-2" color={DIM[g.dim].color} /><div className="mt-1 text-[12px] tabular-nums text-muted-foreground">{g.current.toLocaleString("en-IN")} of {g.target.toLocaleString("en-IN")} {g.unit}</div></> : null}
              </div>
            ))}
          </List>
        </Section>
      )}

      <Section title="Recent activity"><div className="panel"><Feed events={feed} empty={`${m.name} hasn't shared anything yet.`} /></div></Section>
      <Section title="Achievements"><AchievementGrid id={m.id} /></Section>
    </div>
  );
}
