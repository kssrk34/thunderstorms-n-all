"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame, FormError, PasswordInput } from "@/components/auth";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await api<{ onboarded: boolean }>("/api/auth/login", { body: f });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace(r.data.onboarded ? "/" : "/onboarding");
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to pick up where you left off."
      footer={<>New here? <Link href="/signup" className="text-primary hover:opacity-80">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username">
          <input className="field" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required />
        </Field>
        <Field label="Password">
          <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" required />
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <div className="text-center"><Link href="/forgot" className="text-[15px] text-primary hover:opacity-80">Forgot password?</Link></div>
      </form>
    </AuthFrame>
  );
}
