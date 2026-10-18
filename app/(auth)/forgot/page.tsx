"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { AuthFrame, FormError, PasswordInput } from "@/components/auth";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function Forgot() {
  const router = useRouter();
  const [organiser, setOrganiser] = useState(false);
  const [f, setF] = useState({ code: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await api<{ onboarded: boolean }>("/api/auth/recover", { body: f });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace(r.data.onboarded ? "/" : "/onboarding");
  };

  return (
    <AuthFrame title="Forgot your password?" subtitle="Your quests and progress are safe. Here's how to get back in."
      footer={<>Remembered it? <Link href="/login" className="text-primary hover:opacity-80">Sign in</Link></>}>
      <div className="flex gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span>
        <div>
          <div className="text-[15px] font-medium">Ask the organiser for a reset link</div>
          <p className="mt-0.5 text-[14px] text-muted-foreground">The cousin who set up the squad can make one in Settings → Cousins. Open it within 24 hours to choose a new password.</p>
        </div>
      </div>
      <div className="mt-6 border-t border-border/70 pt-5">
        {organiser ? (
          <form onSubmit={submit} className="space-y-4 motion-safe:animate-fade-up">
            <div>
              <div className="text-[15px] font-medium">Reset the organiser&apos;s password</div>
              <p className="mt-0.5 text-[14px] text-muted-foreground">Your other devices will be signed out.</p>
            </div>
            <Field label="Setup code" hint="The code you created the squad with. It's saved as TNA_SETUP_CODE in your hosting settings.">
              <input className="field font-mono uppercase tracking-[.12em]" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus required />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" minLength={8} required />
            </Field>
            <FormError>{error}</FormError>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save and sign in"}</Button>
          </form>
        ) : (
          <>
            <div className="text-[15px] font-medium">Are you the organiser?</div>
            <p className="mt-0.5 text-[14px] text-muted-foreground">Choose a new password with your setup code.</p>
            <Button variant="tinted" className="mt-4" onClick={() => setOrganiser(true)}>Use setup code</Button>
          </>
        )}
      </div>
    </AuthFrame>
  );
}
