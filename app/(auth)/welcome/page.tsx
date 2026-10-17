"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { migrateLegacyBrowserData } from "@/lib/legacy";

export default function Welcome() {
  useEffect(() => migrateLegacyBrowserData(), []);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="motion-safe:animate-fade-up">
        <LogoMark size={80} className="shadow-float" />
      </div>
      <h1 className="mt-10 text-[34px] font-bold leading-[1.08] tracking-tight motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] sm:text-[52px]">
        Welcome to Project<br className="hidden sm:block" /> Thunderstorms &rsquo;n&rsquo;&nbsp;All
      </h1>
      <p className="mt-5 text-[19px] text-muted-foreground motion-safe:animate-fade-up motion-safe:[animation-delay:160ms] sm:text-[21px]">
        Five cousins. Five journeys. One extraordinary life.
      </p>
      <div className="mt-12 flex w-full max-w-xs flex-col items-center gap-4 motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]">
        <Button asChild size="lg" className="w-full"><Link href="/signup">Get Started</Link></Button>
        <Link href="/login" className="text-[15px] text-primary hover:opacity-80">I already have an account</Link>
      </div>
      <p className="mt-16 text-[13px] text-muted-foreground/80 motion-safe:animate-fade-up motion-safe:[animation-delay:320ms]">Private to your squad. Invitation only.</p>
    </main>
  );
}
