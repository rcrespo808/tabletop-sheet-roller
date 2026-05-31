"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { CharacterProfileCard } from "@/components/CharacterProfileCard";
import { CreateCharacterPanel } from "@/components/CreateCharacterPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import { getStorageMode, listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { storageStatusForMode, type StorageMode } from "@/lib/storage/types";
import type { CharacterProfile } from "@/lib/sheets/types";

export default function HomePage() {
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");

  const refreshProfiles = useCallback(async () => {
    const next = await listCharacters();
    setProfiles(next);
    setStorageMode(getStorageMode());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    listCharacters().then((next) => {
      if (cancelled) return;
      setProfiles(next);
      setStorageMode(getStorageMode());
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthChange = useCallback(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

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
            <StorageStatusBadge mode={storageMode} />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            One character identity, multiple system sheets. Structured stats drive derived quick
            actions while custom rolls stay available.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AuthPanel onAuthChange={handleAuthChange} />

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
