"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Dices,
  Plus,
  Skull,
  Sparkles,
  Swords,
  Target,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { RollLog } from "@/components/RollLog";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import {
  applyDamage,
  applyHealing,
  canAct,
  clearPendingAction,
  createCombatantFromCharacter,
  createCombatantFromNpcTemplate,
  createEncounter,
  declarePendingAction,
  getValidTargets,
  makeCombatLogEntry,
  nextTurn,
  previousTurn,
  setCombatantStatus,
  startEncounter,
  setActiveTurn,
  appendCombatHistory,
  updateCombatant
} from "@/lib/combat/combatEngine";
import {
  clearSavedLocalEncounters,
  deleteEncounter,
  getCombatStorageMode,
  listEncounters,
  saveEncounter
} from "@/lib/combat/combatRepository";
import { listNpcTemplates } from "@/lib/combat/npcTemplates";
import { resolveCombatAction } from "@/lib/combat/resolveCombatAction";
import type {
  Combatant,
  CombatEncounter,
  CombatEncounterSystem,
  CombatLogEntry,
  CombatStatus,
  CombatTeam
} from "@/lib/combat/types";
import { createRollLogEntry } from "@/lib/dice/log";
import type { RollLogEntry } from "@/lib/sheets/types";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import { listCharacters } from "@/lib/storage/characterRepository";
import {
  clearRollLogs,
  getRollLogStorageMode,
  listRollLogs,
  saveRollLog
} from "@/lib/storage/rollLogRepository";
import type { CharacterProfile } from "@/lib/sheets/types";

const COMBAT_ROOM = "combat";

const TEAM_LABELS: Record<CombatTeam, string> = {
  players: "Players",
  enemies: "Enemies",
  allies: "Allies",
  neutral: "Neutral"
};

const STATUS_LABELS: Record<CombatStatus, string> = {
  active: "Active",
  down: "Down",
  dead: "Dead",
  fled: "Fled",
  hidden: "Hidden"
};

const SYSTEM_LABELS: Record<CombatEncounterSystem, string> = {
  dnd5e: "D&D 5e",
  nwod: "NWoD"
};

function isGm(authState: AuthState | null): boolean {
  return authState?.profile?.userLevel === "gm";
}

function isPlayerControlledByCurrentUser(
  combatant: Combatant | null,
  authState: AuthState | null
): boolean {
  return Boolean(
    combatant &&
      authState?.user?.id &&
      combatant.controlledByUserId &&
      combatant.controlledByUserId === authState.user.id
  );
}

function combatHistoryEntryToRollLogEntry(
  encounter: CombatEncounter,
  historyEntry: CombatLogEntry
): RollLogEntry {
  return createRollLogEntry({
    kind: "combat",
    characterName: historyEntry.actorName,
    actionLabel: historyEntry.actionLabel,
    system: encounter.system,
    resultText: historyEntry.summary,
    details: {
      encounterId: encounter.id,
      round: historyEntry.round,
      turnIndex: historyEntry.turnIndex,
      ...historyEntry.details
    }
  });
}

export default function CombatPage() {
  const [encounters, setEncounters] = useState<CombatEncounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<CombatEncounter | null>(null);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [dangerPanelOpen, setDangerPanelOpen] = useState(false);
  const [rollLogOpen, setRollLogOpen] = useState(false);
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [showAllTargets, setShowAllTargets] = useState(false);
  const [recentResult, setRecentResult] = useState<{
    summary: string;
    targetId: string;
    targetBeforeHp?: number;
    targetAfterHp?: number;
  } | null>(null);

  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedNpcId, setSelectedNpcId] = useState("kobold-cr1-dnd5e");
  const [npcQuantity, setNpcQuantity] = useState("1");
  const [selectedTeam, setSelectedTeam] = useState<CombatTeam>("enemies");
  const [selectedSystem, setSelectedSystem] = useState<CombatEncounterSystem>("dnd5e");

  const encounterSystem = activeEncounter?.system ?? selectedSystem;
  const npcTemplates = useMemo(() => listNpcTemplates(encounterSystem), [encounterSystem]);
  const compatibleCharacters = useMemo(
    () => characters.filter((character) => Boolean(character.sheets[encounterSystem])),
    [characters, encounterSystem]
  );
  const effectiveSelectedNpcId = npcTemplates.some((template) => template.id === selectedNpcId)
    ? selectedNpcId
    : npcTemplates[0]?.id ?? "";
  const effectiveSelectedCharacterId = compatibleCharacters.some(
    (character) => character.id === selectedCharacterId
  )
    ? selectedCharacterId
    : "";

  const refresh = async () => {
    const [loadedEncounters, loadedCharacters] = await Promise.all([
      listEncounters(),
      listCharacters()
    ]);
    setEncounters(loadedEncounters);
    setCharacters(loadedCharacters);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([listEncounters(), listCharacters()]).then(([loadedEncounters, loadedCharacters]) => {
      if (cancelled) return;
      setEncounters(loadedEncounters);
      setCharacters(loadedCharacters);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listRollLogs(COMBAT_ROOM)
      .then(setEntries)
      .finally(() => setLoadingLogs(false));
  }, []);

  async function persistEncounter(encounter: CombatEncounter, options?: { logNewHistoryFrom?: CombatEncounter | null }) {
    const saved = await saveEncounter(encounter);
    setActiveEncounter(saved);
    setEncounters((current) => {
      const without = current.filter((entry) => entry.id !== saved.id);
      return [saved, ...without];
    });

    if (options?.logNewHistoryFrom) {
      const previousIds = new Set((options.logNewHistoryFrom.actionHistory ?? []).map((entry) => entry.id));
      const newEntries = (saved.actionHistory ?? [])
        .filter((entry) => !previousIds.has(entry.id))
        .reverse();
      for (const historyEntry of newEntries) {
        await addLogEntry(combatHistoryEntryToRollLogEntry(saved, historyEntry));
      }
    }
  }

  async function addLogEntry(entry: RollLogEntry) {
    setEntries((current) => [entry, ...current]);
    await saveRollLog(COMBAT_ROOM, entry);
  }

  async function handleNewEncounter() {
    const encounter = createEncounter("New Encounter", selectedSystem);
    await persistEncounter(encounter);
  }

  async function handleSelectEncounter(id: string) {
    const match = encounters.find((encounter) => encounter.id === id);
    if (match) setActiveEncounter(match);
  }

  async function handleDeleteEncounter() {
    if (!activeEncounter) return;
    await deleteEncounter(activeEncounter.id);
    setActiveEncounter(null);
    await refresh();
  }

  function handleClearSavedEncounters() {
    if (!window.confirm("Clear browser-local saved encounters?")) return;
    clearSavedLocalEncounters();
    setActiveEncounter(null);
    setEncounters([]);
    setSelectedTargetId("");
    setRecentResult(null);
  }

  async function handleAddCharacter() {
    if (!activeEncounter || !effectiveSelectedCharacterId) return;
    const character = characters.find((entry) => entry.id === effectiveSelectedCharacterId);
    if (!character) return;

    if (!character.sheets[activeEncounter.system]) return;
    const combatant = createCombatantFromCharacter(character, activeEncounter.system, "players");
    await persistEncounter({
      ...activeEncounter,
      combatants: [...activeEncounter.combatants, combatant]
    });
  }

  async function handleAddNpcs() {
    if (!activeEncounter || !effectiveSelectedNpcId) return;
    const template = npcTemplates.find((entry) => entry.id === effectiveSelectedNpcId);
    if (!template) return;

    const quantity = Math.max(1, Math.min(20, Number(npcQuantity) || 1));
    const additions = Array.from({ length: quantity }, (_, index) =>
      createCombatantFromNpcTemplate(template, index + 1, selectedTeam)
    );

    await persistEncounter({
      ...activeEncounter,
      combatants: [...activeEncounter.combatants, ...additions]
    });
  }

  async function handleManualDamage(combatantId: string, amount: number) {
    if (!activeEncounter || !gmUser || amount <= 0) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === combatantId);
    if (!target) return;
    const beforeHp = target.currentHp ?? target.maxHp ?? 0;
    const updated = updateCombatant(activeEncounter, combatantId, (combatant) => applyDamage(combatant, amount));
    const after = updated.combatants.find((combatant) => combatant.id === combatantId);
    const afterHp = after?.currentHp ?? after?.maxHp ?? 0;
    const withHistory = appendCombatHistory(
      updated,
      makeCombatLogEntry(updated, {
        targetId: target.id,
        targetName: target.instanceName,
        summary: `${target.instanceName} took ${amount} damage. HP ${beforeHp} -> ${afterHp}.`,
        details: {
          resultType: "damage",
          system: activeEncounter.system,
          hpBefore: beforeHp,
          hpAfter: afterHp,
          damageApplied: amount
        }
      })
    );
    await persistEncounter(withHistory, { logNewHistoryFrom: activeEncounter });
  }

  async function handleManualHealing(combatantId: string, amount: number) {
    if (!activeEncounter || !gmUser || amount <= 0) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === combatantId);
    if (!target) return;
    const beforeHp = target.currentHp ?? target.maxHp ?? 0;
    const updated = updateCombatant(activeEncounter, combatantId, (combatant) => applyHealing(combatant, amount));
    const after = updated.combatants.find((combatant) => combatant.id === combatantId);
    const afterHp = after?.currentHp ?? after?.maxHp ?? 0;
    const withHistory = appendCombatHistory(
      updated,
      makeCombatLogEntry(updated, {
        targetId: target.id,
        targetName: target.instanceName,
        summary: `${target.instanceName} healed ${amount}. HP ${beforeHp} -> ${afterHp}.`,
        details: {
          resultType: "healing",
          system: activeEncounter.system,
          hpBefore: beforeHp,
          hpAfter: afterHp
        }
      })
    );
    await persistEncounter(withHistory, { logNewHistoryFrom: activeEncounter });
  }

  async function handleStatusChange(combatantId: string, status: CombatStatus) {
    if (!activeEncounter || !gmUser) return;
    const target = activeEncounter.combatants.find((combatant) => combatant.id === combatantId);
    if (!target) return;
    const updated = updateCombatant(activeEncounter, combatantId, (combatant) =>
      setCombatantStatus(combatant, status)
    );
    const withHistory = appendCombatHistory(
      updated,
      makeCombatLogEntry(updated, {
        targetId: target.id,
        targetName: target.instanceName,
        summary: `${target.instanceName} status changed: ${STATUS_LABELS[target.status]} -> ${STATUS_LABELS[status]}.`,
        details: {
          resultType: "status_change",
          system: activeEncounter.system,
          statusBefore: target.status,
          statusAfter: status
        }
      })
    );
    await persistEncounter(withHistory, { logNewHistoryFrom: activeEncounter });
  }

  async function handleMakeActive(combatantId: string) {
    if (!activeEncounter || !gmUser) return;
    await persistEncounter(setActiveTurn(activeEncounter, combatantId), { logNewHistoryFrom: activeEncounter });
  }

  const currentCombatant =
    activeEncounter && activeEncounter.combatants.length > 0
      ? activeEncounter.combatants[activeEncounter.turnIndex]
      : null;
  const effectiveSelectedTargetId =
    selectedTargetId ||
    (activeEncounter?.pendingAction?.combatantId === currentCombatant?.id
      ? activeEncounter?.pendingAction?.targetId ?? ""
      : currentCombatant?.targetIds[0] ?? "");
  const selectedTarget =
    activeEncounter?.combatants.find((entry) => entry.id === effectiveSelectedTargetId) ?? null;
  const validTargets =
    activeEncounter && currentCombatant
      ? getValidTargets(activeEncounter, currentCombatant, { showAll: showAllTargets })
      : [];
  const gmUser = isGm(authState);
  const activeOwnedByUser = isPlayerControlledByCurrentUser(currentCombatant, authState);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 text-foreground">
        <GlassPanel level="secondary" className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading combat tracker…</p>
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
                <Swords className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-red-200">Combat Tracker</p>
                <h1 className="mt-1 text-3xl font-bold text-foreground">Encounter</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={getCombatStorageMode()} />
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Gallery
              </Link>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                onClick={() => setRollLogOpen(true)}
                type="button"
              >
                Roll Log
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <AuthPanel
          onAuthChange={(state) => {
            setAuthState(state);
            void refresh();
          }}
        />

        <GlassPanel level="secondary" className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Encounter
              </label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                onChange={(event) => void handleSelectEncounter(event.target.value)}
                value={activeEncounter?.id ?? ""}
              >
                <option value="">Select encounter…</option>
                {encounters.map((encounter) => (
                  <option key={encounter.id} value={encounter.id}>
                    {encounter.name} ({encounter.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem]">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                New System
              </label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                disabled={!gmUser}
                onChange={(event) => setSelectedSystem(event.target.value as CombatEncounterSystem)}
                value={selectedSystem}
              >
                <option value="dnd5e">D&amp;D 5e</option>
                <option value="nwod">NWoD</option>
              </select>
            </div>
            <button
              className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!gmUser}
              onClick={() => void handleNewEncounter()}
              type="button"
            >
              New Encounter
            </button>
            {activeEncounter ? (
              <button
                className="h-10 rounded-md border border-red-500/30 bg-red-950/30 px-4 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!gmUser}
                onClick={() => void handleDeleteEncounter()}
                type="button"
              >
                Delete
              </button>
            ) : null}
          </div>
          <div className="mt-4 border-t border-slate-700/25 pt-3">
            <button
              className="flex items-center gap-2 text-xs font-semibold uppercase text-red-200"
              onClick={() => setDangerPanelOpen((current) => !current)}
              type="button"
            >
              {dangerPanelOpen ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              Danger
            </button>
            {dangerPanelOpen ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  className="h-9 rounded-md border border-red-500/40 bg-red-950/40 px-3 text-xs font-semibold text-red-100"
                  disabled={!gmUser}
                  onClick={handleClearSavedEncounters}
                  type="button"
                >
                  Clear Saved Encounters
                </button>
                <span className="text-xs text-muted-foreground">
                  Clears browser-local combat encounters only.
                </span>
              </div>
            ) : null}
          </div>
        </GlassPanel>

        {activeEncounter ? (
          <>
            <EncounterHeader
              canManage={gmUser}
              currentName={currentCombatant?.instanceName}
              encounter={activeEncounter}
              onEnd={async () =>
                persistEncounter({ ...activeEncounter, status: "completed" })
              }
              onNext={async () =>
                persistEncounter(nextTurn(activeEncounter), { logNewHistoryFrom: activeEncounter })
              }
              onPrevious={async () =>
                persistEncounter(previousTurn(activeEncounter), { logNewHistoryFrom: activeEncounter })
              }
              onRename={async (name) => persistEncounter({ ...activeEncounter, name })}
              onStart={async () =>
                persistEncounter(startEncounter(activeEncounter), { logNewHistoryFrom: activeEncounter })
              }
            />

            <ActiveTurnPanel
              activeCombatant={currentCombatant}
              canDeclare={activeOwnedByUser && !gmUser}
              canResolve={gmUser}
              pendingAction={activeEncounter.pendingAction ?? null}
              onDeclareAction={async (actionId) => {
                if (!currentCombatant) return;
                const declared = declarePendingAction(activeEncounter, {
                  combatantId: currentCombatant.id,
                  declaredByUserId: authState?.user?.id,
                  actionId,
                  targetId: effectiveSelectedTargetId || undefined
                });
                await persistEncounter(declared, { logNewHistoryFrom: activeEncounter });
              }}
              onClearPendingAction={async () => {
                const cleared = clearPendingAction(activeEncounter);
                await persistEncounter(cleared, { logNewHistoryFrom: activeEncounter });
              }}
              onEndTurn={async () =>
                persistEncounter(nextTurn(activeEncounter), { logNewHistoryFrom: activeEncounter })
              }
              onNextTurn={async () =>
                persistEncounter(nextTurn(activeEncounter), { logNewHistoryFrom: activeEncounter })
              }
              onResolveAction={async (actionId) => {
                const selected = effectiveSelectedTargetId;
                if (!selected) return;
                const result = resolveCombatAction({
                  encounter: activeEncounter,
                  attackerId: currentCombatant?.id ?? "",
                  targetId: selected,
                  actionId
                });
                const resolvedEncounter = {
                  ...result.encounter,
                  pendingAction: null
                };
                setRecentResult({
                  summary: result.summary,
                  targetId: selected,
                  targetBeforeHp: Number(result.details.targetBeforeHp ?? 0),
                  targetAfterHp: Number(result.details.targetAfterHp ?? 0)
                });
                await persistEncounter(resolvedEncounter);
                await addLogEntry(result.logEntry);
              }}
              onSelectedTargetIdChange={setSelectedTargetId}
              selectedTarget={selectedTarget}
              selectedTargetId={effectiveSelectedTargetId}
              showAllTargets={showAllTargets}
              setShowAllTargets={setShowAllTargets}
              validTargets={validTargets}
            />

            {recentResult ? (
              <GlassPanel level="secondary" className="p-5">
                <p className="text-sm font-semibold text-foreground">Last Resolution</p>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {recentResult.summary}
                </pre>
              </GlassPanel>
            ) : null}

            <GlassPanel level="secondary" className="p-5">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setAddPanelOpen((current) => !current)}
                type="button"
              >
                <span className="text-lg font-semibold text-foreground">Add Combatants</span>
                {addPanelOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {addPanelOpen ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                    <p className="text-sm font-semibold text-foreground">Player Character</p>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                      disabled={!gmUser}
                      onChange={(event) => setSelectedCharacterId(event.target.value)}
                      value={effectiveSelectedCharacterId}
                    >
                      <option value="">Select character…</option>
                      {compatibleCharacters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2 text-xs text-muted-foreground">
                      Locked to {SYSTEM_LABELS[activeEncounter.system]} sheets for this encounter.
                    </p>
                    <button
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/25 px-4 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!gmUser || !effectiveSelectedCharacterId}
                      onClick={() => void handleAddCharacter()}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add Character
                    </button>
                  </div>

                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                    <p className="text-sm font-semibold text-foreground">NPC Template</p>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                      disabled={!gmUser}
                      onChange={(event) => setSelectedNpcId(event.target.value)}
                      value={effectiveSelectedNpcId}
                    >
                      {npcTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.crLabel})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                        disabled={!gmUser}
                        min={1}
                        onChange={(event) => setNpcQuantity(event.target.value)}
                        type="number"
                        value={npcQuantity}
                      />
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                        disabled={!gmUser}
                        onChange={(event) => setSelectedTeam(event.target.value as CombatTeam)}
                        value={selectedTeam}
                      >
                        {Object.entries(TEAM_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-red-500/40 bg-red-700/25 px-4 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!gmUser || !effectiveSelectedNpcId}
                      onClick={() => void handleAddNpcs()}
                      type="button"
                    >
                      <Skull className="h-4 w-4" />
                      Add NPCs
                    </button>
                  </div>
                </div>
              ) : null}
            </GlassPanel>

            <CombatRoster
              canManage={gmUser}
              encounter={activeEncounter}
              onDamage={handleManualDamage}
              onHeal={handleManualHealing}
              onMakeActive={handleMakeActive}
              onStatus={handleStatusChange}
              onTarget={(id) => setSelectedTargetId(id)}
            />

            <CombatHistoryPanel entries={activeEncounter.actionHistory ?? []} />
          </>
        ) : (
          <GlassPanel level="tertiary" className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Create or select an encounter to begin tracking combat.
            </p>
          </GlassPanel>
        )}
      </div>

      {rollLogOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
          onClick={() => setRollLogOpen(false)}
          role="presentation"
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-700/30 bg-background/95 p-4 shadow-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Combat roll log"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Combat Roll Log</h2>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-800/70"
                onClick={() => setRollLogOpen(false)}
                type="button"
                aria-label="Close roll log"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <RollLog
              className="min-h-0 flex-1 p-4"
              entries={entries}
              listClassName="max-h-[calc(100vh-18rem)]"
              loading={loadingLogs}
              onClear={async () => {
                setEntries([]);
                await clearRollLogs(COMBAT_ROOM);
              }}
              storageMode={getRollLogStorageMode()}
            />
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function EncounterHeader({
  encounter,
  currentName,
  canManage,
  onRename,
  onStart,
  onNext,
  onPrevious,
  onEnd
}: {
  encounter: CombatEncounter;
  currentName?: string;
  canManage: boolean;
  onRename: (name: string) => void | Promise<void>;
  onStart: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  onPrevious: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
}) {
  return (
    <GlassPanel level="secondary" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <input
            className="bg-transparent text-2xl font-bold text-foreground outline-none disabled:opacity-80"
            defaultValue={encounter.name}
            disabled={!canManage}
            key={`${encounter.id}-${encounter.updatedAt ?? encounter.name}`}
            onBlur={(event) => {
              const nextName = event.target.value.trim();
              if (nextName && nextName !== encounter.name) {
                void onRename(nextName);
              }
            }}
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {encounter.status} · Round {encounter.round}
            {currentName ? ` · Turn: ${currentName}` : ""}
          </p>
          <p className="mt-2 text-sm font-semibold text-red-100">
            Encounter System: {SYSTEM_LABELS[encounter.system]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Only {SYSTEM_LABELS[encounter.system]} combatants and actions are available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {encounter.status === "draft" ? (
            <button
              className="h-10 rounded-md border border-emerald-500/40 bg-emerald-700/25 px-4 text-sm font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canManage}
              onClick={() => void onStart()}
              type="button"
            >
              Start Encounter
            </button>
          ) : null}
          {encounter.status === "active" ? (
            <>
              <button
                className="h-10 rounded-md border border-slate-600/40 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canManage}
                onClick={() => void onPrevious()}
                type="button"
              >
                Previous
              </button>
              <button
                className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canManage}
                onClick={() => void onNext()}
                type="button"
              >
                Next Turn
              </button>
              <button
                className="h-10 rounded-md border border-red-500/30 px-4 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canManage}
                onClick={() => void onEnd()}
                type="button"
              >
                End Encounter
              </button>
            </>
          ) : null}
        </div>
      </div>
    </GlassPanel>
  );
}

function CombatRoster({
  encounter,
  canManage,
  onTarget,
  onDamage,
  onHeal,
  onMakeActive,
  onStatus
}: {
  encounter: CombatEncounter;
  canManage: boolean;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onMakeActive: (id: string) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
}) {
  if (encounter.combatants.length === 0) {
    return (
      <GlassPanel level="tertiary" className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No combatants in roster.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-lg border border-slate-700/30 lg:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Init</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">HP</th>
              <th className="px-3 py-2">Defense</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Targets</th>
              <th className="px-3 py-2">Controls</th>
            </tr>
          </thead>
          <tbody>
            {encounter.combatants.map((combatant, index) => (
              <CombatantRow
                combatant={combatant}
                encounter={encounter}
                isCurrentTurn={
                  encounter.status === "active" && encounter.turnIndex === index
                }
                canManage={canManage}
                key={combatant.id}
                layout="table"
                onDamage={onDamage}
                onHeal={onHeal}
                onMakeActive={onMakeActive}
                onStatus={onStatus}
                onTarget={onTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {encounter.combatants.map((combatant, index) => (
          <CombatantRow
            combatant={combatant}
            encounter={encounter}
            isCurrentTurn={encounter.status === "active" && encounter.turnIndex === index}
            canManage={canManage}
            key={combatant.id}
            layout="card"
            onDamage={onDamage}
            onHeal={onHeal}
            onMakeActive={onMakeActive}
            onStatus={onStatus}
            onTarget={onTarget}
          />
        ))}
      </div>
    </div>
  );
}

function CombatHistoryPanel({ entries }: { entries: CombatLogEntry[] }) {
  return (
    <GlassPanel level="secondary" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Combat History</h2>
        <span className="text-xs text-muted-foreground">{entries.length} entries</span>
      </div>
      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
            No combat events recorded yet.
          </p>
        ) : (
          entries.slice(0, 30).map((entry) => (
            <article
              className="rounded-md border border-slate-700/20 bg-slate-950/35 p-3"
              key={entry.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-red-100">
                  Round {entry.round} · Turn {entry.turnIndex + 1}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "2-digit",
                    minute: "2-digit"
                  }).format(new Date(entry.createdAt))}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{entry.summary}</p>
            </article>
          ))
        )}
      </div>
    </GlassPanel>
  );
}

function ActiveTurnPanel({
  activeCombatant,
  canResolve,
  canDeclare,
  pendingAction,
  selectedTargetId,
  selectedTarget,
  validTargets,
  showAllTargets,
  setShowAllTargets,
  onSelectedTargetIdChange,
  onResolveAction,
  onDeclareAction,
  onClearPendingAction,
  onEndTurn,
  onNextTurn
}: {
  activeCombatant: Combatant | null;
  canResolve: boolean;
  canDeclare: boolean;
  pendingAction: CombatEncounter["pendingAction"];
  selectedTargetId: string;
  selectedTarget: Combatant | null;
  validTargets: Combatant[];
  showAllTargets: boolean;
  setShowAllTargets: (value: boolean) => void;
  onSelectedTargetIdChange: (value: string) => void;
  onResolveAction: (actionId: string) => void | Promise<void>;
  onDeclareAction: (actionId: string) => void | Promise<void>;
  onClearPendingAction: () => void | Promise<void>;
  onEndTurn: () => void | Promise<void>;
  onNextTurn: () => void | Promise<void>;
}) {
  const actions = activeCombatant?.combatActions ?? [];
  const attackActions = actions.filter((action) => action.kind !== "utility");
  const pendingActionLabel = pendingAction?.actionId
    ? actions.find((action) => action.id === pendingAction.actionId)?.label
    : undefined;
  const targetSummary = selectedTarget
    ? `${selectedTarget.instanceName} · ${TEAM_LABELS[selectedTarget.team]} · HP ${
        selectedTarget.currentHp ?? selectedTarget.maxHp ?? "—"
      }/${selectedTarget.maxHp ?? "—"} · ${
        selectedTarget.system === "dnd5e"
          ? `AC ${selectedTarget.armorClass ?? "—"}`
          : `Defense ${selectedTarget.defense ?? "—"}`
      } · ${STATUS_LABELS[selectedTarget.status]}`
    : "No target selected";

  return (
    <GlassPanel level="secondary" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Active Combatant</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            {activeCombatant?.instanceName ?? "None"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            HP {activeCombatant?.currentHp ?? "—"}/{activeCombatant?.maxHp ?? "—"} ·{" "}
            {activeCombatant?.system === "dnd5e"
              ? `AC ${activeCombatant?.armorClass ?? "—"}`
              : `Defense ${activeCombatant?.defense ?? "—"}${
                  activeCombatant?.armor !== undefined ? ` · Armor ${activeCombatant.armor}` : ""
                }`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-10 rounded-md border border-slate-600/40 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canResolve}
            onClick={() => void onEndTurn()}
            type="button"
          >
            End Turn
          </button>
          <button
            className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canResolve}
            onClick={() => void onNextTurn()}
            type="button"
          >
            Next Turn Override
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Target</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedTarget ? "Target selected" : "Select a target to resolve attacks."}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={showAllTargets}
                className="accent-purple-400"
                onChange={(event) => setShowAllTargets(event.target.checked)}
                type="checkbox"
              />
              Show all valid targets
            </label>
          </div>
          <select
            className="mt-3 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
            onChange={(event) => onSelectedTargetIdChange(event.target.value)}
            value={selectedTargetId}
          >
            <option value="">Select target…</option>
            {validTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.instanceName} · {TEAM_LABELS[target.team]} · HP{" "}
                {target.currentHp ?? target.maxHp ?? "—"}/{target.maxHp ?? "—"} ·{" "}
                {target.system === "dnd5e"
                  ? `AC ${target.armorClass ?? "—"}`
                  : `Defense ${target.defense ?? "—"}`} · {STATUS_LABELS[target.status]}
              </option>
            ))}
          </select>
          <div className="mt-3 rounded-md border border-slate-700/25 bg-slate-900/50 p-3 text-sm text-muted-foreground">
            {targetSummary}
          </div>
        </div>

        <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
          <p className="text-sm font-semibold text-foreground">Actions</p>
          {!activeCombatant || !canAct(activeCombatant) ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This combatant cannot act right now.
            </p>
          ) : null}
          {!selectedTargetId ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a target to resolve attacks.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {attackActions.map((action) => (
              <div className="flex flex-wrap gap-2" key={action.id}>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-purple-500/35 bg-purple-600/20 px-3 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canResolve || !activeCombatant || !canAct(activeCombatant) || !selectedTargetId}
                  onClick={() => void onResolveAction(action.id)}
                  type="button"
                >
                  <Dices className="h-4 w-4" />
                  Resolve {action.label}
                </button>
                {canDeclare ? (
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/35 bg-cyan-700/20 px-3 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!activeCombatant || !canAct(activeCombatant) || !selectedTargetId}
                    onClick={() => void onDeclareAction(action.id)}
                    type="button"
                  >
                    <Target className="h-4 w-4" />
                    Declare {action.label}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {pendingAction ? (
            <div className="mt-4 rounded-md border border-cyan-500/30 bg-cyan-950/30 p-3 text-sm text-cyan-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">Pending action waiting for GM.</p>
                <button
                  className="rounded border border-cyan-400/40 px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canResolve}
                  onClick={() => void onClearPendingAction()}
                  type="button"
                >
                  Clear
                </button>
              </div>
              <p className="mt-1 text-xs text-cyan-100/80">
                {activeCombatant?.instanceName ?? "Combatant"} →{" "}
                {selectedTarget?.instanceName ?? pendingAction.targetId ?? "target"} with{" "}
                {pendingActionLabel ?? pendingAction.actionId ?? "action"}.
              </p>
            </div>
          ) : null}
          <div className="mt-4 rounded-md border border-slate-700/25 bg-slate-900/50 p-3 text-sm text-muted-foreground">
            Action resolved. GM may end turn when ready.
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function CombatantRow({
  combatant,
  encounter,
  layout,
  isCurrentTurn,
  canManage,
  onTarget,
  onDamage,
  onHeal,
  onMakeActive,
  onStatus
}: {
  combatant: Combatant;
  encounter: CombatEncounter;
  layout: "table" | "card";
  isCurrentTurn: boolean;
  canManage: boolean;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onMakeActive: (id: string) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
}) {
  const [damageInput, setDamageInput] = useState("5");
  const [healInput, setHealInput] = useState("5");
  const defenseLabel =
    combatant.system === "dnd5e"
      ? combatant.armorClass !== undefined
        ? `AC ${combatant.armorClass}`
        : "—"
      : `Def ${combatant.defense ?? "—"}${combatant.armor !== undefined ? ` / Arm ${combatant.armor}` : ""}`;

  const targetNames = combatant.targetIds
    .map((id) => encounter.combatants.find((entry) => entry.id === id)?.instanceName)
    .filter(Boolean);

  const controls = (
    <div className="flex flex-wrap gap-1">
      <button
        className="h-8 rounded border border-slate-600/40 px-2 text-xs"
        disabled={!canManage}
        onClick={() => onDamage(combatant.id, 5)}
        type="button"
      >
        -5
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        disabled={!canManage}
        onChange={(event) => setDamageInput(event.target.value)}
        type="number"
        value={damageInput}
      />
      <button
        className="h-8 rounded border border-red-500/30 px-2 text-xs text-red-100"
        disabled={!canManage}
        onClick={() => onDamage(combatant.id, Number(damageInput) || 0)}
        type="button"
      >
        Apply Damage
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        disabled={!canManage}
        onChange={(event) => setHealInput(event.target.value)}
        type="number"
        value={healInput}
      />
      <button
        className="h-8 rounded border border-emerald-500/30 px-2 text-xs text-emerald-100"
        disabled={!canManage}
        onClick={() => onHeal(combatant.id, Number(healInput) || 0)}
        type="button"
      >
        Apply Healing
      </button>
      <button
        className="h-8 rounded border border-amber-400 bg-amber-500/20 px-2 text-xs text-amber-100"
        onClick={() => onTarget(combatant.id)}
        type="button"
      >
        <Target className="inline h-3 w-3" /> Target
      </button>
      {(["down", "dead", "fled", "hidden", "active"] as CombatStatus[]).map((status) => (
        <button
          className="h-8 rounded border border-slate-600/40 px-2 text-[10px] uppercase"
          disabled={!canManage}
          key={status}
          onClick={() => onStatus(combatant.id, status)}
          type="button"
        >
          {status}
        </button>
      ))}
      <button
        className="h-8 rounded border border-purple-500/30 px-2 text-xs text-purple-100"
        disabled={!canManage}
        onClick={() => onMakeActive(combatant.id)}
        type="button"
      >
        Make Active
      </button>
    </div>
  );

  if (layout === "table") {
    return (
      <>
        <tr
          className={`border-t border-slate-700/20 ${isCurrentTurn ? "bg-purple-500/10" : ""}`}
        >
          <td className="px-3 py-2 font-semibold">{combatant.initiative || "—"}</td>
          <td className="px-3 py-2">
            <p className="font-medium">{combatant.instanceName}</p>
            {combatant.crLabel ? (
              <p className="text-xs text-muted-foreground">{combatant.crLabel}</p>
            ) : null}
          </td>
          <td className="px-3 py-2">{TEAM_LABELS[combatant.team]}</td>
          <td className="px-3 py-2">
            {combatant.currentHp ?? "—"}/{combatant.maxHp ?? "—"}
            {combatant.temporaryHp ? ` (+${combatant.temporaryHp} temp)` : ""}
          </td>
          <td className="px-3 py-2">{defenseLabel}</td>
          <td className="px-3 py-2">{STATUS_LABELS[combatant.status]}</td>
          <td className="px-3 py-2 text-xs">{targetNames.join(", ") || "—"}</td>
          <td className="px-3 py-2">{controls}</td>
        </tr>
      </>
    );
  }

  return (
    <GlassPanel
      className={`p-4 ${isCurrentTurn ? "ring-1 ring-purple-500/40" : ""}`}
      level="secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{combatant.instanceName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Init {combatant.initiative || "—"} · {TEAM_LABELS[combatant.team]} ·{" "}
            {STATUS_LABELS[combatant.status]}
          </p>
        </div>
        {combatant.crLabel ? (
          <span className="rounded-full border border-slate-600/40 px-2 py-0.5 text-xs">
            {combatant.crLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <p>
          HP {combatant.currentHp ?? "—"}/{combatant.maxHp ?? "—"}
        </p>
        <p>{defenseLabel}</p>
        <p className="col-span-2">
          Targets: {targetNames.join(", ") || "none"}
        </p>
      </div>
      <div className="mt-3">{controls}</div>
    </GlassPanel>
  );
}
