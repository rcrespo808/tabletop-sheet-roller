"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CharacterHeader } from "@/components/CharacterHeader";
import { CharacterSheetWorkspace } from "@/components/CharacterSheetWorkspace";
import { getAvailableSystems } from "@/data/characters";
import { resolveCharacter } from "@/lib/sheets/customCharacters";
import type { GameSystem } from "@/lib/sheets/types";

export default function CharacterPage() {
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId;

  const lookup = useMemo(() => resolveCharacter(characterId), [characterId]);

  const [systemByCharacter, setSystemByCharacter] = useState<Record<string, GameSystem>>({});

  const activeSystem = useMemo(() => {
    if (!lookup) return null;

    const userPick = systemByCharacter[characterId];
    if (userPick && lookup.profile.sheets[userPick]) {
      return userPick;
    }
    if (lookup.initialSystem && lookup.profile.sheets[lookup.initialSystem]) {
      return lookup.initialSystem;
    }
    const systems = getAvailableSystems(lookup.profile);
    return lookup.profile.defaultSystem ?? systems[0] ?? null;
  }, [characterId, lookup, systemByCharacter]);

  function handleSystemChange(system: GameSystem) {
    setSystemByCharacter((current) => ({ ...current, [characterId]: system }));
  }

  if (!lookup || !activeSystem) {
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

  const { profile } = lookup;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CharacterHeader
        profile={profile}
        selectedSystem={activeSystem}
        onSystemChange={handleSystemChange}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CharacterSheetWorkspace
          profile={profile}
          selectedSystem={activeSystem}
          key={`${profile.id}-${activeSystem}`}
        />
      </div>
    </div>
  );
}
