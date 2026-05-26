"use client";

import { useState } from "react";
import type { CharacterSheet, RollLogEntry } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { DiceRoller } from "./DiceRoller";
import { GlassPanel } from "./GlassPanel";
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main>
        <CharacterSheetViewer character={character} />
      </main>
      <aside className="space-y-6">
        <GlassPanel level="secondary" glow="medium" className="p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">{character.name}</p>
          </div>
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
        </GlassPanel>
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
