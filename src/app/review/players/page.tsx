"use client";

import Link from "next/link";
import { Check, Home, UserCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { canReviewPlayers } from "@/lib/auth/accessControl";
import { fetchIsTableGmAnywhere } from "@/lib/auth/tableGmAccess";
import { getCurrentAuthState, type AuthState } from "@/lib/auth/supabaseAuth";
import {
  listPendingPlayers,
  reviewPlayer,
  type PendingPlayerProfile
} from "@/lib/auth/playerReviewRepository";

export default function ReviewPlayersPage() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [pendingPlayers, setPendingPlayers] = useState<PendingPlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [state, isTableGm] = await Promise.all([
        getCurrentAuthState(),
        fetchIsTableGmAnywhere()
      ]);
      setAuthState(state);
      if (!canReviewPlayers(state, { isTableGmAnywhere: isTableGm })) {
        setPendingPlayers([]);
        return;
      }
      setPendingPlayers(await listPendingPlayers());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load pending players.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleReview(userId: string, action: "approve" | "reject") {
    setBusyId(userId);
    setMessage(null);
    setError(null);
    try {
      await reviewPlayer(userId, action);
      setMessage(action === "approve" ? "Player approved for play." : "Player rejected.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-700">
              <UserCheck className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-200">Table GM</p>
              <h1 className="text-3xl font-bold">Review Players</h1>
            </div>
          </div>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            href="/tables"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Tables
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        {message ? (
          <GlassPanel level="tertiary" className="border-emerald-500/30 p-4 text-sm text-emerald-200">
            {message}
          </GlassPanel>
        ) : null}
        {error ? (
          <GlassPanel level="tertiary" className="border-red-500/30 p-4 text-sm text-red-200">
            {error}
          </GlassPanel>
        ) : null}

        <GlassPanel level="secondary" className="p-6">
          <p className="text-sm text-muted-foreground">
            Approve players to unlock the full app. Rejected players remain on the pending gate.
          </p>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading pending players…</p>
            ) : pendingPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players are waiting for approval.</p>
            ) : (
              pendingPlayers.map((player) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/30 bg-slate-950/30 px-4 py-3"
                  key={player.id}
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {player.displayName || player.email || player.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.email || "No email"} · joined{" "}
                      {player.createdAt
                        ? new Date(player.createdAt).toLocaleString()
                        : "recently"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/50 disabled:opacity-60"
                      disabled={busyId === player.id}
                      onClick={() => void handleReview(player.id, "approve")}
                      type="button"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-950/60 disabled:opacity-60"
                      disabled={busyId === player.id}
                      onClick={() => void handleReview(player.id, "reject")}
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
