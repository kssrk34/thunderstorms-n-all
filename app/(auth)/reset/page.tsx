"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthFrame, FormError, PasswordInput } from "@/components/auth";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Check = { valid: boolean; name?: string; username?: string };

/** Opened from a reset link. The token sits after the #, so browsers never send it to the server in a page request. */
export default function Reset() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = decodeURIComponent(window.location.hash.slice(1));
    setToken(t);
    if (!t) {
      setCheck({ valid: false });
      return;
    }
    api<Check>("/api/auth/reset/check", { body: { token: t } }).then((r) => (r.ok ? setCheck(r.data) : setError(r.error)));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await api<{ onboarded: boolean }>("/api/auth/reset", { body: { token, password } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace(r.data.onboarded ? "/" : "/onboarding");
  };

  const footer = <>Remembered it? <Link href="/login" className="text-primary hover:opacity-80">Sign in</Link></>;

  if (check && !check.valid) {
    return (
      <AuthFrame title="This link no longer works" subtitle="Reset links work once, within 24 hours of being made. Ask the organiser for a fresh one." footer={footer}>
        <Button asChild variant="secondary" size="lg" className="w-full"><Link href="/login">Back to sign in</Link></Button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" subtitle={check ? `For ${check.name} (@${check.username}).` : "Checking your link…"} footer={footer}>
      {check ? (
        <form onSubmit={submit} className="space-y-4">
          {/* lets password managers save the new password under the right account */}
          <input type="text" name="username" value={check.username} autoComplete="username" readOnly hidden />
          <Field label="New password" hint="At least 8 characters. You'll be signed out on your other devices.">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} autoFocus required />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" className="w-full" disabled={busy || password.length < 8}>{busy ? "Saving…" : "Save and sign in"}</Button>
        </form>
      ) : (
        <FormError>{error}</FormError>
      )}
    </AuthFrame>
  );
}
