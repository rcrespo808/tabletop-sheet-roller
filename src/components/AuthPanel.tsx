"use client";

import { LogIn, LogOut, Mail, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getCurrentAuthState,
  onAuthStateChanged,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateAppUserLevel,
  type AuthState
} from "@/lib/auth/supabaseAuth";
import type { UserLevel } from "@/lib/sheets/types";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import { GlassPanel } from "./GlassPanel";

type AuthPanelProps = {
  onAuthChange?: (state: AuthState) => void;
};

type AuthMode = "signin" | "signup";

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userLevel, setUserLevel] = useState<UserLevel>("player");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentAuthState().then((state) => {
      if (!mounted) return;
      setAuthState(state);
      setUserLevel(state.profile?.userLevel ?? "player");
      onAuthChange?.(state);
    });

    const unsubscribe = onAuthStateChanged((state) => {
      if (!mounted) return;
      setAuthState(state);
      setUserLevel(state.profile?.userLevel ?? "player");
      onAuthChange?.(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [onAuthChange]);

  if (!isSupabaseConfigured()) {
    return (
      <GlassPanel level="tertiary" className="p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Local mode</p>
            <p className="text-xs text-muted-foreground">
              Add Supabase public env vars to enable accounts.
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  }

  async function refreshAuthState() {
    const state = await getCurrentAuthState();
    setAuthState(state);
    setUserLevel(state.profile?.userLevel ?? "player");
    onAuthChange?.(state);
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
          userLevel
        });

        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage(
            "Check your email and open the verification link. It should land on this app's account verification page."
          );
        } else {
          setMessage("Account created.");
          await refreshAuthState();
        }
        return;
      }

      const { error: signInError } = await signInWithEmail(trimmedEmail, password);
      if (signInError) throw signInError;
      setMessage("Signed in.");
      await refreshAuthState();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLevelChange(nextLevel: UserLevel) {
    setUserLevel(nextLevel);
    if (!authState.user) return;

    try {
      const profile = await updateAppUserLevel(nextLevel);
      const nextState = { ...authState, profile };
      setAuthState(nextState);
      onAuthChange?.(nextState);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update table role.");
    }
  }

  async function handleSignOut() {
    await signOut();
    const nextState = { session: null, user: null, profile: null };
    setAuthState(nextState);
    onAuthChange?.(nextState);
  }

  if (authState.user) {
    const label = authState.profile?.displayName || authState.user.email || "Signed in";

    return (
      <GlassPanel level="tertiary" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <UserRound className="h-5 w-5 text-cyan-100" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">Supabase account</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
              value={userLevel}
              onChange={(event) => handleLevelChange(event.target.value as UserLevel)}
            >
              <option value="player">Player</option>
              <option value="gm">GM</option>
            </select>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </GlassPanel>
    );
  }

  return (
    <GlassPanel level="tertiary" className="p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex gap-2">
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

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            {mode === "signup" ? (
              <select
                className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
                value={userLevel}
                onChange={(event) => setUserLevel(event.target.value as UserLevel)}
              >
                <option value="player">Player</option>
                <option value="gm">GM</option>
              </select>
            ) : null}
          </div>
        </div>

        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={handleSubmit}
          type="button"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </GlassPanel>
  );
}
