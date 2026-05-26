import Link from "next/link";
import type { CharacterSheet } from "@/lib/sheets/types";
import { SystemBadge } from "./SystemBadge";

type CharacterCardProps = {
  character: CharacterSheet;
};

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <article className="flex min-h-56 flex-col justify-between rounded-lg border border-white/10 bg-panel p-5 shadow-2xl shadow-black/20">
      <div className="space-y-4">
        <SystemBadge system={character.system} />
        <div>
          <h2 className="text-2xl font-semibold text-white">{character.name}</h2>
          {character.subtitle ? (
            <p className="mt-1 text-sm text-zinc-400">{character.subtitle}</p>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          {character.actions.length} prepared actions
        </p>
      </div>
      <Link
        className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-zinc-200"
        href={`/characters/${character.id}`}
      >
        Open Sheet
      </Link>
    </article>
  );
}
