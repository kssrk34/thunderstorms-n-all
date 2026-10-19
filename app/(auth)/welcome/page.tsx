"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CharacterArt } from "@/components/avatars";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { CHARACTERS } from "@/lib/catalog";
import { migrateLegacyBrowserData } from "@/lib/legacy";

const LINEUP = ["tempest", "aurelia", "volt", "sable", "aegis"];

export default function Welcome() {
  useEffect(() => migrateLegacyBrowserData(), []);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="motion-safe:animate-fade-up">
        <LogoMark size={72} />
      </div>
      <h1 className="mt-9 font-display text-[36px] font-bold leading-[1.05] tracking-tight motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] sm:text-[56px]">
        Thunderstorms &rsquo;n&rsquo;&nbsp;All
      </h1>
      <p className="mt-5 max-w-md text-[18px] text-muted-foreground motion-safe:animate-fade-up motion-safe:[animation-delay:160ms] sm:text-[20px]">
        Five cousins. Five unique journeys. One shared universe.
      </p>
      <div className="mt-10 flex items-end justify-center -space-x-3 motion-safe:animate-fade-up motion-safe:[animation-delay:220ms]" aria-hidden>
        {LINEUP.map((id, i) => {
          const big = i === 2;
          return (
            <span key={id} className="overflow-hidden rounded-full ring-4 ring-background" style={{ width: big ? 96 : 72, height: big ? 96 : 72, zIndex: big ? 2 : 1 }}>
              <CharacterArt id={id} size={big ? 96 : 72} />
            </span>
          );
        })}
      </div>
      <p className="mt-6 max-w-sm text-[15px] text-muted-foreground motion-safe:animate-fade-up motion-safe:[animation-delay:260ms]">
        Your real life is the game. Every quest you complete earns Aura Points and makes your character stronger.
      </p>
      <div className="mt-10 flex w-full max-w-xs flex-col items-center gap-4 motion-safe:animate-fade-up motion-safe:[animation-delay:300ms]">
        <Button asChild size="lg" className="w-full"><Link href="/signup">Get Started</Link></Button>
        <Link href="/login" className="text-[15px] text-primary hover:opacity-80">I already have an account</Link>
      </div>
      <p className="mt-14 text-[13px] text-muted-foreground/80">Private to your squad. Invitation only. {CHARACTERS.length} characters, five cousins.</p>
    </main>
  );
}
