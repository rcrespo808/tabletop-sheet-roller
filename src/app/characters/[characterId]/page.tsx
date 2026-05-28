"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CharacterHeader } from "@/components/CharacterHeader";
import { CharacterSheetWorkspace } from "@/components/CharacterSheetWorkspace";
import { GlassPanel } from "@/components/GlassPanel";
import { getAvailableSystems } from "@/data/characters";
import { resolveCharacterLookup, saveCharacter } from "@/lib/storage/characterRepository";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";

export default function CharacterPage() {
  const params = useParams<{ characterId: string }>();
  return <CharacterPageContent characterId={params.characterId} key={params.characterId} />;
}

function CharacterPageContent({ characterId }: { characterId: string }) {
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [initialSystem, setInitialSystem] = useState<GameSystem | undefined>();
  const [loading, setLoading] = useState(true);
  const [systemByCharacter, setSystemByCharacter] = useState<Record<string, GameSystem>>({});

  useEffect(() => {
    let cancelled = false;

    resolveCharacterLookup(characterId).then((lookup) => {
      if (cancelled) return;
      setProfile(lookup?.profile ?? null);
      setInitialSystem(lookup?.initialSystem);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  const activeSystem = useMemo(() => {
    if (!profile) return null;

    const userPick = systemByCharacter[characterId];
    if (userPick && profile.sheets[userPick]) {
      return userPick;
    }
    if (initialSystem && profile.sheets[initialSystem]) {
      return initialSystem;
    }
    const systems = getAvailableSystems(profile);
    return profile.defaultSystem ?? systems[0] ?? null;
  }, [characterId, initialSystem, profile, systemByCharacter]);

  function handleSystemChange(system: GameSystem) {
    setSystemByCharacter((current) => ({ ...current, [characterId]: system }));
  }

  async function handleProfileChange(nextProfile: CharacterProfile) {
    const saved = await saveCharacter(nextProfile);
    setProfile(saved);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-foreground">
        <GlassPanel level="secondary" className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading character…</p>
        </GlassPanel>
      </div>
    );
  }

  if (!profile || !activeSystem) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-foreground">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-700/30 bg-slate-900/40 p-8 text-center">
          <p className="text-lg font-semibold">Character not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Return to the gallery and add or import the character again.
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold"
            href="/"
          >
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CharacterHeader
        profile={profile}
        selectedSystem={activeSystem}
        onSystemChange={handleSystemChange}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CharacterSheetWorkspace
          onProfileChange={handleProfileChange}
          profile={profile}
          selectedSystem={activeSystem}
          key={`${profile.id}-${activeSystem}`}
        />
      </div>
    </div>
  );
}
