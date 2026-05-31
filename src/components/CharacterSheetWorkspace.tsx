"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getSystemSheet } from "@/data/characters";
import { getCurrentAuthState, type AuthState } from "@/lib/auth/supabaseAuth";
import type {
  CharacterProfile,
  GameSystem,
  RollLogEntry,
  SheetAction
} from "@/lib/sheets/types";
import { getCustomActions } from "@/lib/sheets/actions";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import {
  clearRollLogs,
  DEFAULT_ROOM_SLUG,
  getRollLogStorageMode,
  listRollLogs,
  saveRollLog
} from "@/lib/storage/rollLogRepository";
import type { StorageMode } from "@/lib/storage/types";
import { CharacterImagesPanel } from "./CharacterImagesPanel";
import { CharacterRewardsPanel } from "./CharacterRewardsPanel";
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
  isRollLogOpen?: boolean;
  onRollLogClose?: () => void;
};

export function CharacterSheetWorkspace({
  profile,
  selectedSystem,
  onProfileChange,
  isRollLogOpen = false,
  onRollLogClose
}: CharacterSheetWorkspaceProps) {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [rollLogStorageMode, setRollLogStorageMode] = useState<StorageMode>("local");
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
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

  useEffect(() => {
    if (!isRollLogOpen || !onRollLogClose) return;
    const closeRollLog = onRollLogClose;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRollLog();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRollLogOpen, onRollLogClose]);

  useEffect(() => {
    let cancelled = false;

    getCurrentAuthState().then((state) => {
      if (!cancelled) setAuthState(state);
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
  const codexActions = customActions.filter((action) => action.metadata?.sourceCodexEntryId);
  const canManageRewards =
    Boolean(onProfileChange) &&
    (!isSupabaseConfigured() || authState.profile?.userLevel === "gm");
  const canToggleEquipment = canManageRewards;

  async function removeCodexAction(action: SheetAction) {
    if (!onProfileChange) return;
    const currentSheet = profile.sheets[selectedSystem];
    if (!currentSheet) return;

    await onProfileChange({
      ...profile,
      sheets: {
        ...profile.sheets,
        [selectedSystem]: {
          ...currentSheet,
          actions: currentSheet.actions.filter((current) => current.id !== action.id)
        }
      }
    });
  }

  return (
    <>
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
        {codexActions.length > 0 ? (
          <GlassPanel level="secondary" className="p-5">
            <h2 className="text-lg font-semibold text-foreground">
              Codex Attachments / Granted Features
            </h2>
            <div className="mt-4 space-y-3">
              {codexActions.map((action) => (
                <div
                  className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3"
                  key={action.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{action.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedSystem} / {action.type}
                        {action.metadata?.sourceCodexName
                          ? ` / ${action.metadata.sourceCodexName}`
                          : ""}
                      </p>
                    </div>
                    {canManageRewards ? (
                      <button
                        className="rounded-md border border-red-500/30 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-900/40"
                        onClick={() => removeCodexAction(action)}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        ) : null}
        <CharacterRewardsPanel
          canManageRewards={canManageRewards}
          canToggleEquipment={canToggleEquipment}
          onProfileChange={onProfileChange}
          profile={profile}
          selectedSystem={selectedSystem}
        />
        <DiceRoller
          characterName={profile.name}
          defaultSystem={selectedSystem}
          onRoll={addEntry}
        />
        </aside>
      </div>

      {isRollLogOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
          onClick={onRollLogClose}
          role="presentation"
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-700/30 bg-background/95 p-4 shadow-2xl shadow-black/40 sm:p-5"
            id="roll-log-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Roll log"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current Session
                </p>
                <h2 className="text-xl font-semibold text-foreground">Roll Log</h2>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/70 hover:text-foreground"
                onClick={onRollLogClose}
                type="button"
                aria-label="Close roll log"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <RollLog
              className="min-h-0 flex-1 p-4"
              entries={entries}
              listClassName="max-h-[calc(100vh-18rem)]"
              loading={loadingLogs}
              onClear={handleClearLogs}
              storageMode={rollLogStorageMode}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
