"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { CharacterSheetWorkspace } from "@/components/CharacterSheetWorkspace";
import { SystemBadge } from "@/components/SystemBadge";
import { getCharacter } from "@/data/characters";
import { loadCustomCharacters } from "@/lib/sheets/customCharacters";

export default function CharacterPage() {
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId;

  const character = useMemo(() => {
    const seeded = getCharacter(characterId);
    if (seeded) return seeded;
    const custom = loadCustomCharacters();
    return custom.find((entry) => entry.id === characterId);
  }, [characterId]);

  if (!character) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-foreground">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-700/30 bg-slate-900/40 p-8 text-center">
          <p className="text-lg font-semibold">Character not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Return to the gallery and add/import the character again.
          </p>
          <Link className="mt-5 inline-flex rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold" href="/">
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground"
              href="/"
              aria-label="Back to gallery"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-bold text-foreground">{character.name}</h1>
                <SystemBadge system={character.system} />
              </div>
              {character.subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{character.subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CharacterSheetWorkspace character={character} />
      </div>
    </div>
  );
}
