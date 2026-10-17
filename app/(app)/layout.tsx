"use client";

import { Shell } from "@/components/shell";
import { GameProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider gate="app">
      <Shell>{children}</Shell>
    </GameProvider>
  );
}
