"use client";

import Link from "next/link";
import { Clock3, LogOut, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { isPlayRejected } from "@/lib/auth/accessControl";
import {
  getCurrentAuthState,
  signOut,
  type AuthState
} from "@/lib/auth/supabaseAuth";

export default function PendingPage() {
  const [authState, setAuthState] = useState<AuthState | null>(null);

  useEffect(() => {
    void getCurrentAuthState().then(setAuthState);
  }, []);

  const rejected = isPlayRejected(authState?.profile);
  const label = authState?.profile?.displayName || authState?.user?.email || "Player";

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <GlassPanel level="secondary" className="w-full max-w-lg space-y-6 p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
            <Clock3 className="h-6 w-6 text-amber-200" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-amber-200">Play access</p>
            <h1 className="text-2xl font-bold">
              {rejected ? "Access not approved" : "Awaiting GM approval"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as <span className="font-semibold text-foreground">{label}</span>
            </p>
          </div>
        </div>

        {rejected ? (
          <p className="text-sm leading-6 text-muted-foreground">
            A table GM reviewed your account and has not approved play access yet. Contact your GM
            if you think this is a mistake.
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Your account is created, but campaign tools stay locked until a table GM approves you for
            play. If you are running the game, create a campaign table to bootstrap GM access.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/30 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/40"
            href="/tables"
          >
            <Table2 className="h-4 w-4" aria-hidden="true" />
            I am running the game
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            onClick={() => void handleSignOut()}
            type="button"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </GlassPanel>
    </main>
  );
}
