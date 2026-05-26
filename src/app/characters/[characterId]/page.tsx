import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterSheetWorkspace } from "@/components/CharacterSheetWorkspace";
import { SystemBadge } from "@/components/SystemBadge";
import { characters, getCharacter } from "@/data/characters";

type CharacterPageProps = {
  params: Promise<{
    characterId: string;
  }>;
};

export function generateStaticParams() {
  return characters.map((character) => ({
    characterId: character.id
  }));
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { characterId } = await params;
  const character = getCharacter(characterId);

  if (!character) {
    notFound();
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
                <h1 className="truncate text-2xl font-bold text-foreground">
                  {character.name}
                </h1>
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
