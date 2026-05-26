import Link from "next/link";
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
    <div className="min-h-screen bg-charcoal px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              className="text-sm font-semibold text-zinc-400 transition hover:text-white"
              href="/"
            >
              Back to gallery
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{character.name}</h1>
              <SystemBadge system={character.system} />
            </div>
            {character.subtitle ? (
              <p className="mt-2 text-sm text-zinc-400">{character.subtitle}</p>
            ) : null}
          </div>
        </header>

        <CharacterSheetWorkspace character={character} />
      </div>
    </div>
  );
}
