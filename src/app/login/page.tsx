"use client";

import { LogIn, Mail, Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/GlassPanel";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/supabaseAuth";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <GlassPanel level="secondary" className="max-w-md p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Local mode</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Supabase is not configured. The app runs without login in local mode.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white"
            href="/"
          >
            Continue to app
          </Link>
        </GlassPanel>
      </main>
    );
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await signUpWithEmail({
          email: trimmedEmail,
          password,
          displayName: displayName.trim() || undefined,
          userLevel: "player"
        });

        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage(
            "Check your email and open the verification link before signing in."
          );
        } else {
          window.location.href = "/pending";
        }
        return;
      }

      const { error: signInError } = await signInWithEmail(trimmedEmail, password);
      if (signInError) throw signInError;
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <GlassPanel level="primary" glow="medium" className="w-full max-w-lg p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700">
            <LogIn className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-cyan-200">Tabletop Sheet Roller</p>
            <h1 className="text-2xl font-bold">Sign in to play</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Campaign access requires an account. New players stay gated until a table GM approves
          them for play.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signin"
                ? "bg-cyan-600/40 text-cyan-50"
                : "bg-slate-900/50 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-purple-600/40 text-purple-50"
                : "bg-slate-900/50 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {mode === "signup" ? (
            <input
              className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          ) : null}
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 pl-9 pr-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <input
            className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => void handleSubmit()}
          type="button"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {message ? <p className="mt-4 text-sm text-cyan-200">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </GlassPanel>
    </main>
  );
}
