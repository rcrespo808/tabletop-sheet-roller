"use client";

import { useState } from "react";
import { getSystemSheet } from "@/data/characters";
import type { CharacterProfile, GameSystem, RollLogEntry } from "@/lib/sheets/types";
import { getCustomActions } from "@/lib/sheets/actions";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { CharacterStatsPanel } from "./CharacterStatsPanel";
import { DiceRoller } from "./DiceRoller";
import { GlassPanel } from "./GlassPanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
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

  const customActions = getCustomActions(sheet);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="space-y-6">
        <CharacterSheetViewer
          actions={customActions}
          characterName={profile.name}
          onRoll={addEntry}
          selectedSystem={selectedSystem}
          sheet={sheet}
        />
        <CharacterStatsPanel characterName={profile.name} onRoll={addEntry} sheet={sheet} />
      </main>
      <aside className="space-y-6">
        <QuickActionsPanel
          characterName={profile.name}
          onRoll={addEntry}
          selectedSystem={selectedSystem}
          sheet={sheet}
        />
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
