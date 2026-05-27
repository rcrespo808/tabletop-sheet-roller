"use client";

import { useState } from "react";
import { getSystemSheet } from "@/data/characters";
import type { CharacterProfile, GameSystem, RollLogEntry } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { DiceRoller } from "./DiceRoller";
import { GlassPanel } from "./GlassPanel";
import { RollLog } from "./RollLog";

type CharacterSheetWorkspaceProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
};

export function CharacterSheetWorkspace({
  profile,
  selectedSystem
}: CharacterSheetWorkspaceProps) {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const sheet = getSystemSheet(profile, selectedSystem);

  function addEntry(entry: RollLogEntry) {
    setEntries((current) => [entry, ...current]);
  }

  if (!sheet) {
    return (
      <GlassPanel level="secondary" className="p-8 text-center">
        <p className="text-lg font-semibold">No sheet for this system</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.name} does not have a {selectedSystem} sheet configured.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main>
        <CharacterSheetViewer
          actions={sheet.actions}
          characterName={profile.name}
          onRoll={addEntry}
          selectedSystem={selectedSystem}
          sheet={sheet}
        />
      </main>
      <aside className="space-y-6">
        <GlassPanel level="secondary" glow="medium" className="p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.name} · {sheet.label ?? selectedSystem}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {sheet.actions.map((action) => (
              <ActionButton
                action={action}
                characterName={profile.name}
                key={action.id}
                onRoll={addEntry}
                selectedSystem={selectedSystem}
              />
            ))}
          </div>
        </GlassPanel>
        <DiceRoller
          characterName={profile.name}
          defaultSystem={selectedSystem}
          onRoll={addEntry}
        />
        <RollLog entries={entries} onClear={() => setEntries([])} />
      </aside>
    </div>
  );
}
