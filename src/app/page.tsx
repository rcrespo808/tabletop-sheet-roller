"use client";

import Link from "next/link";
import { BookOpen, Coins, FileText, Gift, RefreshCw, Sparkles, Swords, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActiveTableBar } from "@/components/campaign/ActiveTableBar";
import { AuthPanel } from "@/components/AuthPanel";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import { useRealtimeTableSubscription } from "@/lib/realtime/useRealtimeTableSubscription";
import { useCampaignSeat } from "@/lib/session/useCampaignSeat";
import { CharacterProfileCard } from "@/components/CharacterProfileCard";
import { CreateCharacterPanel } from "@/components/CreateCharacterPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import { getStorageMode, listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { storageStatusForMode, type StorageMode } from "@/lib/storage/types";
import type { CharacterProfile } from "@/lib/sheets/types";

export default function HomePage() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const campaignSeat = useCampaignSeat(authState);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProfiles, setRefreshingProfiles] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");

  const refreshProfiles = useCallback(async () => {
    setRefreshingProfiles(true);
    try {
      const next = await listCharacters();
      setProfiles(next);
      setStorageMode(getStorageMode());
    } catch (error) {
      console.warn("Failed to sync character profiles", error);
      setStorageMode(getStorageMode());
    } finally {
      setLoading(false);
      setRefreshingProfiles(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    listCharacters()
      .then((next) => {
        if (cancelled) return;
        setProfiles(next);
        setStorageMode(getStorageMode());
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Failed to load character profiles", error);
        setStorageMode(getStorageMode());
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthChange = useCallback((state: AuthState) => {
    setAuthState(state);
    void refreshProfiles();
  }, [refreshProfiles]);

  const handleRealtimeProfilesChange = useCallback(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  useRealtimeTableSubscription({
    channelName: "character-profiles-gallery",
    enabled: Boolean(authState.user),
    onChange: handleRealtimeProfilesChange,
    table: "character_profiles"
  });

  async function addProfile(profile: CharacterProfile) {
    await saveCharacter(profile);
    await refreshProfiles();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
                <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-cyan-200">
                  Tabletop Sheet Roller
                </p>
                <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
                  Character Gallery
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={storageMode} />
              <button
                aria-label="Sync characters"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/35 bg-cyan-950/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/45 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || refreshingProfiles}
                onClick={() => void refreshProfiles()}
                type="button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshingProfiles ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Sync
              </button>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/codex"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Codex
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/loot"
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                Loot
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/handouts"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Handouts
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/markets"
              >
                <Coins className="h-4 w-4" aria-hidden="true" />
                Markets
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/tables"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Tables
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/combat"
              >
                <Swords className="h-4 w-4" aria-hidden="true" />
                Combat
              </Link>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            One character identity, multiple system sheets. Structured stats drive derived quick
            actions while custom rolls stay available.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AuthPanel onAuthChange={handleAuthChange} />
        <ActiveTableBar seat={campaignSeat} />

        {campaignSeat.activeTableId ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {campaignSeat.isTableGm ? (
              <Link
                className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 transition hover:bg-amber-950/35"
                href={`/tables/${campaignSeat.activeTableId}`}
              >
                <p className="text-sm font-semibold text-amber-100">GM at table</p>
                <p className="mt-1 text-xs text-muted-foreground">Open lobby to manage roster and assignments.</p>
              </Link>
            ) : (
              <Link
                className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4 transition hover:bg-cyan-950/35"
                href="/join"
              >
                <p className="text-sm font-semibold text-cyan-100">Join a table</p>
                <p className="mt-1 text-xs text-muted-foreground">Use a join code to get character assignments.</p>
              </Link>
            )}
            {campaignSeat.controlledCharacterIds.length > 0 ? (
              <GlassPanel level="tertiary" className="p-4">
                <p className="text-sm font-semibold text-foreground">Assigned characters</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {campaignSeat.controlledCharacterIds.length} character
                  {campaignSeat.controlledCharacterIds.length === 1 ? "" : "s"} at this table.
                </p>
              </GlassPanel>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4">
          <CreateCharacterPanel onAdd={addProfile} />
        </div>

        <div className="mb-8 mt-8">
          <h2 className="text-xl font-semibold text-foreground">Your Characters</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Select a character to open their workspace, switch system tabs, and roll from stats or
            prepared actions.
          </p>
        </div>

        {loading ? (
          <GlassPanel level="tertiary" className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading characters…</p>
          </GlassPanel>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <CharacterProfileCard profile={profile} key={profile.id} />
            ))}
          </section>
        )}

        {!loading && profiles.length === 0 ? (
          <GlassPanel level="tertiary" className="mt-6 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No characters yet. Expand Create or Import above to add one.
            </p>
          </GlassPanel>
        ) : null}

        <div className="mt-12 border-t border-slate-700/20 pt-8">
          <GlassPanel level="tertiary" className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {storageStatusForMode(storageMode).message} · session roll log
            </p>
          </GlassPanel>
        </div>
      </div>
    </main>
  );
}
