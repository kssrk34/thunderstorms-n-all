"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AuthFrame } from "@/components/auth";
import { ClearSkyArt } from "@/components/brand";
import { AddedRow, GoalForm, ProfileForm, QuestForm } from "@/components/forms";
import { AreaTag } from "@/components/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";

type Step = "profile" | "goals" | "quest" | "done";
const ORDER: Step[] = ["profile", "goals", "quest", "done"];

export default function Onboarding() {
  const router = useRouter();
  const { s, me, profile, act, updateProfile, toast } = useGame();
  const [step, setStep] = useState<Step>("profile");
  const [finishing, setFinishing] = useState(false);
  const goals = s.goals.filter((g) => g.userId === me);
  const quests = s.habits.length + s.todos.filter((t) => t.userId === me).length;
  const i = ORDER.indexOf(step);

  const finish = async () => {
    setFinishing(true);
    const err = await updateProfile({ onboarded: true });
    setFinishing(false);
    if (err) return toast(err, "warn");
    setStep("done");
  };

  const back = i > 0 && step !== "done" && (
    <button onClick={() => setStep(ORDER[i - 1])} className="absolute left-4 top-4 flex items-center gap-0.5 rounded-full px-2 py-1 text-[15px] text-primary hover:opacity-80 sm:left-6 sm:top-6">
      <ChevronLeft className="h-5 w-5" /> Back
    </button>
  );

  if (step === "profile") {
    return (
      <AuthFrame step={{ at: 1, of: 4 }} title={`Hi ${profile.name}, make it yours`} subtitle="Add a photo or pick an avatar, and tell your cousins a little about you.">
        <ProfileForm onSaved={() => setStep("goals")} submitLabel="Continue" />
      </AuthFrame>
    );
  }

  if (step === "goals") {
    return (
      <AuthFrame wide top={back} step={{ at: 2, of: 4 }} title="What would you love to achieve?" subtitle="Add your own goals. The ideas are only suggestions, and you can change everything later.">
        {goals.length > 0 && (
          <div className="mb-6 space-y-2">
            {goals.map((g) => (
              <AddedRow key={g.id} onRemove={() => act({ t: "goalDel", id: g.id })}>
                <div className="font-medium">{g.title}</div>
                <AreaTag dim={g.dim} />
              </AddedRow>
            ))}
          </div>
        )}
        <GoalForm onDone={() => {}} submitLabel={goals.length ? "Add another goal" : "Add goal"} submitVariant={goals.length ? "tinted" : "default"} />
        <div className="mt-4 border-t border-border/70 pt-4">
          <Button size="lg" variant={goals.length ? "default" : "ghost"} className="w-full" onClick={() => setStep("quest")}>
            {goals.length ? "Continue" : "Skip for now"}
          </Button>
        </div>
      </AuthFrame>
    );
  }

  if (step === "quest") {
    return (
      <AuthFrame wide top={back} step={{ at: 3, of: 4 }} title="Create your first quest" subtitle="Every extraordinary journey starts with one small step.">
        <QuestForm allowChallenge={false} preset={{ goalId: goals[0]?.id }} submitLabel="Add my first quest" onDone={finish} />
        <Button size="lg" variant="ghost" className="mt-3 w-full" disabled={finishing} onClick={finish}>Skip for now</Button>
      </AuthFrame>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="motion-safe:animate-fade-up"><ClearSkyArt className="h-28" /></div>
      <h1 className="mt-8 text-[34px] font-bold leading-tight tracking-tight motion-safe:animate-fade-up motion-safe:[animation-delay:80ms]">You&rsquo;re all set, {profile.name}</h1>
      <p className="mt-3 text-[17px] text-muted-foreground motion-safe:animate-fade-up motion-safe:[animation-delay:160ms]">
        {goals.length || quests
          ? `${goals.length} ${goals.length === 1 ? "goal" : "goals"} and ${quests} ${quests === 1 ? "quest" : "quests"}, all yours. The sky is clear.`
          : "A clear sky and a fresh start. Add goals and quests whenever you're ready."}
      </p>
      <Button size="lg" className="mt-10 w-full max-w-xs motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]" onClick={() => router.replace("/")}>Enter your dashboard</Button>
    </main>
  );
}
