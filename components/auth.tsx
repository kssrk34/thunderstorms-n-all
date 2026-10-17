"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./brand";

export function AuthFrame({ title, subtitle, children, footer, step, wide, top }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; step?: { at: number; of: number }; wide?: boolean; top?: ReactNode }) {
  return (
    <main className={cn("mx-auto flex w-full flex-1 flex-col justify-center px-4 py-10", wide ? "max-w-[560px]" : "max-w-[440px]")}>
      {top}
      <Link href="/welcome" className="mx-auto mb-8 motion-safe:animate-fade-up" aria-label="Thunderstorms 'n' All"><LogoMark size={52} /></Link>
      {step && <Steps at={step.at} of={step.of} className="mb-5" />}
      <div className="rounded-[28px] border border-border/70 bg-card/85 p-6 shadow-float backdrop-blur-xl motion-safe:animate-fade-up sm:p-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-[15px] text-muted-foreground">{footer}</div>}
    </main>
  );
}

export function Steps({ at, of, className }: { at: number; of: number; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)} role="progressbar" aria-valuemin={1} aria-valuemax={of} aria-valuenow={at + 1} aria-label={`Step ${at + 1} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === at ? "w-6 bg-primary" : i < at ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/25")} />
      ))}
    </div>
  );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cn("field pr-11", props.className)} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-[14px] text-destructive motion-safe:animate-fade-up">{children}</p>;
}
