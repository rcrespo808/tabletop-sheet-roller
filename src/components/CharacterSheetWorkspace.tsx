"use client";

import { useEffect, useState } from "react";
import { getSystemSheet } from "@/data/characters";
import type { CharacterProfile, GameSystem, RollLogEntry } from "@/lib/sheets/types";
import { getCustomActions } from "@/lib/sheets/actions";
import {
  clearRollLogs,
  DEFAULT_ROOM_SLUG,
  getRollLogStorageMode,
  listRollLogs,
  saveRollLog
} from "@/lib/storage/rollLogRepository";
import type { StorageMode } from "@/lib/storage/types";
import { CharacterImagesPanel } from "./CharacterImagesPanel";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { CharacterStatsPanel } from "./CharacterStatsPanel";
import { DiceRoller } from "./DiceRoller";
import { GlassPanel } from "./GlassPanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { RollLog } from "./RollLog";

type CharacterSheetWorkspaceProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  onProfileChange?: (profile: CharacterProfile) => void | Promise<void>;
};

export function CharacterSheetWorkspace({
  profile,
  selectedSystem,
  onProfileChange
}: CharacterSheetWorkspaceProps) {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [rollLogStorageMode, setRollLogStorageMode] = useState<StorageMode>("local");
  const sheet = getSystemSheet(profile, selectedSystem);

  useEffect(() => {
    let cancelled = false;

    listRollLogs(DEFAULT_ROOM_SLUG)
      .then((loaded) => {
        if (cancelled) return;
        setEntries(loaded);
        setRollLogStorageMode(getRollLogStorageMode());
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function addEntry(entry: RollLogEntry) {
    setEntries((current) => {
      if (current.some((existing) => existing.id === entry.id)) return current;
      return [entry, ...current];
    });

    await saveRollLog(DEFAULT_ROOM_SLUG, entry, { characterId: profile.id });
    setRollLogStorageMode(getRollLogStorageMode());
  }

  async function handleClearLogs() {
    setEntries([]);
    await clearRollLogs(DEFAULT_ROOM_SLUG);
    setRollLogStorageMode(getRollLogStorageMode());
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
        {onProfileChange ? (
          <CharacterImagesPanel
            onProfileChange={onProfileChange}
            profile={profile}
            selectedSystem={selectedSystem}
          />
        ) : null}
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
        <RollLog
          entries={entries}
          loading={loadingLogs}
          onClear={handleClearLogs}
          storageMode={rollLogStorageMode}
        />
      </aside>
    </div>
  );
}
