"use client";

import { StormBackdrop } from "@/components/brand";
import { Toasts } from "@/components/shell";
import { GameProvider } from "@/lib/store";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sky relative min-h-dvh overflow-hidden">
      <StormBackdrop />
      <GameProvider gate="onboarding">
        <div className="relative flex min-h-dvh flex-col">{children}</div>
        <Toasts />
      </GameProvider>
    </div>
  );
}
