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
import {
  canManageCharacterRewards,
  canManageCharacterRewardsFully
} from "@/lib/session/permissions";
import type { CampaignSeat } from "@/lib/session/useCampaignSeat";
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
import { CharacterCombatPanel } from "./combat/CharacterCombatPanel";
import { CharacterNotesPanel } from "./CharacterNotesPanel";
import { CharacterOverviewPanel } from "./CharacterOverviewPanel";
import { CharacterRewardsPanel } from "./CharacterRewardsPanel";
import { CharacterSheetViewer } from "./CharacterSheetViewer";
import { CharacterStatsPanel } from "./CharacterStatsPanel";
import {
  CharacterWorkspaceTabPanel,
  CharacterWorkspaceTabs,
  type CharacterWorkspaceTab
} from "./CharacterWorkspaceTabs";
import { DiceRoller } from "./DiceRoller";
import { GlassPanel } from "./GlassPanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { RollLog } from "./RollLog";

type CharacterSheetWorkspaceProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  onProfileChange?: (profile: CharacterProfile) => void | Promise<void>;
  campaignSeat?: CampaignSeat | null;
  isRollLogOpen?: boolean;
  onRollLogClose?: () => void;
};

export function CharacterSheetWorkspace({
  profile,
  selectedSystem,
  campaignSeat,
  onProfileChange,
  isRollLogOpen = false,
  onRollLogClose
}: CharacterSheetWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<CharacterWorkspaceTab>("overview");
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
  const localMode = !isSupabaseConfigured();
  const seatContext = campaignSeat?.seatContext;
  const canManageRewards =
    Boolean(onProfileChange) &&
    (localMode ||
      Boolean(seatContext && canManageCharacterRewards(seatContext, profile, { localMode })));
  const canEditSheetFully =
    localMode ||
    Boolean(seatContext && canManageCharacterRewardsFully(seatContext, { localMode }));

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
      <div className="space-y-6">
        <CharacterWorkspaceTabs active={activeTab} onChange={setActiveTab} />

        <CharacterWorkspaceTabPanel active={activeTab} tab="overview">
          <CharacterCombatPanel profile={profile} selectedSystem={selectedSystem} />
          <CharacterOverviewPanel
            canManage={canEditSheetFully && Boolean(onProfileChange)}
            onProfileChange={onProfileChange}
            onRollLogEntry={addEntry}
            profile={profile}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
          <CharacterSheetViewer
            actions={customActions}
            characterName={profile.name}
            onRoll={addEntry}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
          {codexActions.length > 0 ? (
            <CodexAttachmentsPanel
              actions={codexActions}
              canManage={canEditSheetFully}
              onRemove={removeCodexAction}
              selectedSystem={selectedSystem}
            />
          ) : null}
        </CharacterWorkspaceTabPanel>

        <CharacterWorkspaceTabPanel active={activeTab} tab="actions">
          <CharacterStatsPanel characterName={profile.name} onRoll={addEntry} sheet={sheet} />
          <QuickActionsPanel
            characterName={profile.name}
            onRoll={addEntry}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
          <CharacterRewardsPanel
            canManageRewards={canManageRewards}
            canToggleEquipment={canManageRewards}
            inventoryMode="powers-only"
            onProfileChange={onProfileChange}
            onRollLogEntry={addEntry}
            profile={profile}
            sections={["inventory"]}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
          <DiceRoller
            characterName={profile.name}
            defaultSystem={selectedSystem}
            onRoll={addEntry}
          />
        </CharacterWorkspaceTabPanel>

        <CharacterWorkspaceTabPanel active={activeTab} tab="inventory">
          <CharacterRewardsPanel
            canManageRewards={canManageRewards}
            canToggleEquipment={canManageRewards}
            onProfileChange={onProfileChange}
            onRollLogEntry={addEntry}
            profile={profile}
            sections={["inventory", "wallet"]}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
        </CharacterWorkspaceTabPanel>

        <CharacterWorkspaceTabPanel active={activeTab} tab="rewards">
          <CharacterRewardsPanel
            canManageRewards={canManageRewards}
            canToggleEquipment={canManageRewards}
            onProfileChange={onProfileChange}
            onRollLogEntry={addEntry}
            profile={profile}
            sections={["progression", "conditions", "history"]}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
        </CharacterWorkspaceTabPanel>

        <CharacterWorkspaceTabPanel active={activeTab} tab="notes">
          <CharacterNotesPanel canManageGmNotes={canEditSheetFully} profile={profile} />
          {onProfileChange ? (
            <CharacterImagesPanel
              onProfileChange={onProfileChange}
              profile={profile}
              selectedSystem={selectedSystem}
            />
          ) : null}
        </CharacterWorkspaceTabPanel>
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

function CodexAttachmentsPanel({
  actions,
  selectedSystem,
  canManage,
  onRemove
}: {
  actions: SheetAction[];
  selectedSystem: GameSystem;
  canManage: boolean;
  onRemove: (action: SheetAction) => void;
}) {
  return (
    <GlassPanel level="secondary" className="p-5">
      <h2 className="text-lg font-semibold text-foreground">Codex Attachments</h2>
      <div className="mt-4 space-y-3">
        {actions.map((action) => (
          <div
            className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3"
            key={action.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSystem} / {action.type}
                  {action.metadata?.sourceCodexName ? ` / ${action.metadata.sourceCodexName}` : ""}
                </p>
              </div>
              {canManage ? (
                <button
                  className="rounded-md border border-red-500/30 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-900/40"
                  onClick={() => onRemove(action)}
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
  );
}
