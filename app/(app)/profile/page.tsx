"use client";

import { useState } from "react";
import { Lock, Pencil } from "lucide-react";
import { ProfileForm } from "@/components/forms";
import { AvatarView, Section, Stat, useLevel } from "@/components/game";
import { BADGE_ICON } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BADGES, streakOf, userLogs } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { cn, dstr, fmtShort, plural } from "@/lib/utils";

export default function Profile() {
  const { s, me, profile } = useGame();
  const [editing, setEditing] = useState(false);
  const L = useLevel(me);
  const streak = streakOf(s, me);
  const earned = s.badges[me] ?? {};
  const logs = userLogs(s, me);
  const questsDone = logs.filter((l) => (l.kind === "habit" || l.kind === "todo") && l.xp > 0).length;
  const joined = new Date(profile.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-center text-center motion-safe:animate-fade-up">
        <AvatarView member={profile} size={112} />
        <h1 className="mt-4 text-[30px] font-bold tracking-tight">{profile.name}</h1>
        <p className="text-[15px] text-muted-foreground">@{profile.username} · Joined {joined}</p>
        {profile.bio && <p className="mt-3 max-w-md text-[16px]">{profile.bio}</p>}
        {profile.interests.length > 0 && (
          <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-1.5">
            {profile.interests.map((x) => <span key={x} className="rounded-full bg-secondary px-3 py-1 text-[13px]">{x}</span>)}
          </div>
        )}
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => setEditing(true)}><Pencil />Edit profile</Button>
      </header>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div><div className="text-[13px] text-muted-foreground">Level {L.level}</div><div className="text-[22px] font-semibold tracking-tight">{L.title}</div></div>
          <div className="text-right text-[13px] tabular-nums text-muted-foreground">{L.into} / {L.span} XP</div>
        </div>
        <Progress value={L.pct * 100} className="mt-3 h-2" />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime XP" value={L.xp.toLocaleString("en-IN")} />
        <Stat label="Current streak" value={`${streak.current}`} sub={`Best ${plural(streak.best, "day")}`} />
        <Stat label="Quests completed" value={questsDone} />
        <Stat label="Achievements" value={`${Object.keys(earned).length}/${BADGES.length}`} />
      </div>

      <Section title="Achievements">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const at = earned[b.id];
            const Icon = BADGE_ICON[b.id];
            return (
              <Card key={b.id} className={cn("flex flex-col items-center p-4 text-center", !at && "shadow-none")}>
                <span className={cn("relative grid h-14 w-14 place-items-center rounded-full", at ? "storm text-[#F5C451]" : "bg-secondary text-muted-foreground/50")}>
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                  {!at && <Lock className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card p-1 text-muted-foreground" />}
                </span>
                <div className={cn("mt-3 text-[14px] font-medium", !at && "text-muted-foreground")}>{b.name}</div>
                <div className="text-[12px] text-muted-foreground">{at ? `Earned ${fmtShort(dstr(new Date(at)))}` : b.desc}</div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          {editing && <ProfileForm onSaved={() => setEditing(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
