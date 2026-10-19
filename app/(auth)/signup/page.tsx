"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AuthFrame, FormError, PasswordInput } from "@/components/auth";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [setup, setSetup] = useState<{ needsSetup: boolean; members: number; max: number } | null>(null);
  const [inviter, setInviter] = useState<string | null>(null);
  const [f, setF] = useState({ code: params.get("code") ?? "", name: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsSetup: boolean; members: number; max: number }>("/api/setup").then((r) => (r.ok ? setSetup(r.data) : setError(r.error)));
  }, []);
  useEffect(() => {
    const code = params.get("code");
    if (!code) return;
    api<{ valid: boolean; by?: string }>(`/api/invites/check?code=${encodeURIComponent(code)}`).then((r) => {
      if (r.ok && r.data.valid) setInviter(r.data.by ?? null);
      else if (r.ok) setError("This invitation link has expired or was already used. Ask for a fresh one.");
    });
  }, [params]);

  const full = setup && !setup.needsSetup && setup.members >= setup.max;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await api("/api/auth/signup", { body: f });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace("/onboarding");
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthFrame
      step={{ at: 0, of: 5 }}
      title="Create your account"
      subtitle={inviter ? `${inviter} invited you to the squad.` : setup?.needsSetup ? "You're the first cousin here. Let's set things up." : "Your own private space in the squad."}
      footer={<>Already have an account? <Link href="/login" className="text-primary hover:opacity-80">Sign in</Link></>}
    >
      {full ? (
        <p className="text-[15px] text-muted-foreground">All {setup.max} spots in the squad are taken. If you&apos;re one of the cousins, sign in instead.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={setup?.needsSetup ? "Setup code" : "Invitation code"} hint={setup?.needsSetup ? "Shown in the server console the first time the app starts." : "From the invite link a cousin sent you."}>
            <input className="field font-mono uppercase tracking-[.12em]" value={f.code} onChange={set("code")} placeholder="XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
          </Field>
          <Field label="Name"><input className="field" value={f.name} onChange={set("name")} placeholder="What should we call you?" autoComplete="given-name" maxLength={40} required /></Field>
          <Field label="Username" hint="3–20 letters, numbers, dots or underscores. You'll sign in with this.">
            <input className="field" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })} placeholder="e.g. meghana" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <PasswordInput value={f.password} onChange={set("password")} autoComplete="new-password" minLength={8} required />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating your account…" : "Continue"}</Button>
        </form>
      )}
    </AuthFrame>
  );
}

export default function Signup() {
  return <Suspense><SignupForm /></Suspense>;
}
