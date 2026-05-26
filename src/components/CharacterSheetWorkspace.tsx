"use client";

import { useState } from "react";
import type { CharacterSheet, RollLogEntry } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { DiceRoller } from "./DiceRoller";
import { RollLog } from "./RollLog";

type CharacterSheetWorkspaceProps = {
  character: CharacterSheet;
};

export function CharacterSheetWorkspace({ character }: CharacterSheetWorkspaceProps) {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);

  function addEntry(entry: RollLogEntry) {
    setEntries((current) => [entry, ...current]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main>
        <CharacterSheetViewer character={character} />
      </main>
      <aside className="space-y-4">
        <section className="rounded-lg border border-white/10 bg-panel p-4">
          <h2 className="text-base font-semibold text-white">Actions</h2>
          <div className="mt-4 space-y-3">
            {character.actions.map((action) => (
              <ActionButton
                action={action}
                character={character}
                key={action.label}
                onRoll={addEntry}
              />
            ))}
          </div>
        </section>
        <DiceRoller
          characterName={character.name}
          defaultSystem={character.system}
          onRoll={addEntry}
        />
        <RollLog entries={entries} onClear={() => setEntries([])} />
      </aside>
    </div>
  );
}
