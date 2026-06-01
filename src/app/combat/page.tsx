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
  createCombatantFromCharacter,
  createCombatantFromNpcTemplate,
  createEncounter,
  nextTurn,
  previousTurn,
  setCombatantStatus,
  startEncounter,
  toggleTarget,
  updateCombatant
} from "@/lib/combat/combatEngine";
import {
  deleteEncounter,
  getCombatStorageMode,
  listEncounters,
  saveEncounter
} from "@/lib/combat/combatRepository";
import { listNpcTemplates } from "@/lib/combat/npcTemplates";
import type { Combatant, CombatEncounter, CombatStatus, CombatTeam } from "@/lib/combat/types";
import { createRollLogEntry } from "@/lib/dice/log";
import { executeSheetAction } from "@/lib/sheets/rollAction";
import type {
  Dnd5eAttributes,
  GameSystem,
  NwodAttributes,
  NwodSkills,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";
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

function combatantToSheet(combatant: Combatant): SystemSheet {
  if (combatant.system === "dnd5e") {
    return {
      system: "dnd5e",
      actions: combatant.actions,
      attributes: (combatant.metadata?.stats as Dnd5eAttributes | undefined) ?? undefined
    };
  }

  return {
    system: "nwod",
    actions: combatant.actions,
    attributes: (combatant.metadata?.stats as NwodAttributes | undefined) ?? undefined,
    skills: (combatant.metadata?.skills as NwodSkills | undefined) ?? undefined
  };
}

function formatTargetNames(encounter: CombatEncounter, combatant: Combatant): string {
  if (combatant.targetIds.length === 0) return "";
  const names = combatant.targetIds
    .map((id) => encounter.combatants.find((entry) => entry.id === id)?.instanceName)
    .filter(Boolean);
  return names.length > 0 ? ` → ${names.join(", ")}` : "";
}

export default function CombatPage() {
  const [encounters, setEncounters] = useState<CombatEncounter[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<CombatEncounter | null>(null);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [rollLogOpen, setRollLogOpen] = useState(false);
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [targetingFromId, setTargetingFromId] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});

  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedNpcId, setSelectedNpcId] = useState("kobold-cr1-dnd5e");
  const [npcQuantity, setNpcQuantity] = useState("1");
  const [selectedTeam, setSelectedTeam] = useState<CombatTeam>("enemies");
  const [selectedSystem, setSelectedSystem] = useState<GameSystem>("dnd5e");

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

  async function persistEncounter(encounter: CombatEncounter) {
    const saved = await saveEncounter(encounter);
    setActiveEncounter(saved);
    setEncounters((current) => {
      const without = current.filter((entry) => entry.id !== saved.id);
      return [saved, ...without];
    });
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

  const npcTemplates = useMemo(() => listNpcTemplates(selectedSystem), [selectedSystem]);

  async function handleAddCharacter() {
    if (!activeEncounter || !selectedCharacterId) return;
    const character = characters.find((entry) => entry.id === selectedCharacterId);
    if (!character) return;

    const system =
      character.sheets[selectedSystem] ? selectedSystem : character.defaultSystem;
    const combatant = createCombatantFromCharacter(character, system, "players");
    await persistEncounter({
      ...activeEncounter,
      combatants: [...activeEncounter.combatants, combatant],
      system: activeEncounter.system ?? system
    });
  }

  async function handleAddNpcs() {
    if (!activeEncounter || !selectedNpcId) return;
    const template = npcTemplates.find((entry) => entry.id === selectedNpcId);
    if (!template) return;

    const quantity = Math.max(1, Math.min(20, Number(npcQuantity) || 1));
    const additions = Array.from({ length: quantity }, (_, index) =>
      createCombatantFromNpcTemplate(template, index + 1, selectedTeam)
    );

    await persistEncounter({
      ...activeEncounter,
      combatants: [...activeEncounter.combatants, ...additions],
      system:
        activeEncounter.system && activeEncounter.system !== "mixed"
          ? activeEncounter.system
          : template.system
    });
  }

  async function patchCombatant(combatantId: string, updater: (combatant: Combatant) => Combatant) {
    if (!activeEncounter) return;
    await persistEncounter(updateCombatant(activeEncounter, combatantId, updater));
  }

  async function handleCombatRoll(combatant: Combatant, actionId: string) {
    const action = combatant.actions.find((entry) => entry.id === actionId);
    if (!action || !activeEncounter) return;

    const sheet = combatantToSheet(combatant);
    const baseEntry = executeSheetAction(
      sheet,
      action,
      combatant.instanceName,
      combatant.system
    );
    const targetNote = formatTargetNames(activeEncounter, combatant);

    await addLogEntry(
      createRollLogEntry({
        ...baseEntry,
        actionLabel: `${combatant.instanceName}: ${action.label}${targetNote}`,
        details: [baseEntry.details, targetNote ? `Targets:${targetNote}` : ""]
          .filter(Boolean)
          .join("\n")
      })
    );
  }

  async function handleTargetClick(combatantId: string) {
    if (!activeEncounter) return;

    if (targetingFromId === null) {
      setTargetingFromId(combatantId);
      return;
    }

    if (targetingFromId === combatantId) {
      setTargetingFromId(null);
      return;
    }

    await patchCombatant(targetingFromId, (combatant) => toggleTarget(combatant, combatantId));
    setTargetingFromId(null);
  }

  const currentCombatant =
    activeEncounter && activeEncounter.combatants.length > 0
      ? activeEncounter.combatants[activeEncounter.turnIndex]
      : null;

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
        <AuthPanel onAuthChange={() => void refresh()} />

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
            <button
              className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100"
              onClick={() => void handleNewEncounter()}
              type="button"
            >
              New Encounter
            </button>
            {activeEncounter ? (
              <button
                className="h-10 rounded-md border border-red-500/30 bg-red-950/30 px-4 text-sm font-semibold text-red-100"
                onClick={() => void handleDeleteEncounter()}
                type="button"
              >
                Delete
              </button>
            ) : null}
          </div>
        </GlassPanel>

        {activeEncounter ? (
          <>
            <EncounterHeader
              currentName={currentCombatant?.instanceName}
              encounter={activeEncounter}
              onEnd={async () =>
                persistEncounter({ ...activeEncounter, status: "completed" })
              }
              onNext={async () => persistEncounter(nextTurn(activeEncounter))}
              onPrevious={async () => persistEncounter(previousTurn(activeEncounter))}
              onRename={async (name) => persistEncounter({ ...activeEncounter, name })}
              onStart={async () => persistEncounter(startEncounter(activeEncounter))}
            />

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
                      onChange={(event) => setSelectedCharacterId(event.target.value)}
                      value={selectedCharacterId}
                    >
                      <option value="">Select character…</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
                      onChange={(event) => setSelectedSystem(event.target.value as GameSystem)}
                      value={selectedSystem}
                    >
                      <option value="dnd5e">D&amp;D 5e</option>
                      <option value="nwod">NWoD</option>
                    </select>
                    <button
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/25 px-4 text-sm font-semibold text-cyan-100"
                      disabled={!selectedCharacterId}
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
                      onChange={(event) => setSelectedNpcId(event.target.value)}
                      value={selectedNpcId}
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
                        min={1}
                        onChange={(event) => setNpcQuantity(event.target.value)}
                        type="number"
                        value={npcQuantity}
                      />
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
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
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-red-500/40 bg-red-700/25 px-4 text-sm font-semibold text-red-100"
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

            {targetingFromId ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                Targeting mode: select a combatant to toggle target.{" "}
                <button
                  className="font-semibold underline"
                  onClick={() => setTargetingFromId(null)}
                  type="button"
                >
                  Cancel
                </button>
              </p>
            ) : null}

            <CombatRoster
              encounter={activeEncounter}
              expandedActions={expandedActions}
              onDamage={(id, amount) =>
                patchCombatant(id, (combatant) => applyDamage(combatant, amount))
              }
              onHeal={(id, amount) =>
                patchCombatant(id, (combatant) => applyHealing(combatant, amount))
              }
              onRoll={handleCombatRoll}
              onStatus={(id, status) =>
                patchCombatant(id, (combatant) => setCombatantStatus(combatant, status))
              }
              onTarget={handleTargetClick}
              onToggleActions={(id) =>
                setExpandedActions((current) => ({ ...current, [id]: !current[id] }))
              }
              targetingFromId={targetingFromId}
            />
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
  onRename,
  onStart,
  onNext,
  onPrevious,
  onEnd
}: {
  encounter: CombatEncounter;
  currentName?: string;
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
            className="bg-transparent text-2xl font-bold text-foreground outline-none"
            defaultValue={encounter.name}
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
        </div>
        <div className="flex flex-wrap gap-2">
          {encounter.status === "draft" ? (
            <button
              className="h-10 rounded-md border border-emerald-500/40 bg-emerald-700/25 px-4 text-sm font-semibold text-emerald-100"
              onClick={() => void onStart()}
              type="button"
            >
              Start Encounter
            </button>
          ) : null}
          {encounter.status === "active" ? (
            <>
              <button
                className="h-10 rounded-md border border-slate-600/40 px-4 text-sm font-semibold"
                onClick={() => void onPrevious()}
                type="button"
              >
                Previous
              </button>
              <button
                className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100"
                onClick={() => void onNext()}
                type="button"
              >
                Next Turn
              </button>
              <button
                className="h-10 rounded-md border border-red-500/30 px-4 text-sm font-semibold text-red-100"
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
  targetingFromId,
  expandedActions,
  onTarget,
  onDamage,
  onHeal,
  onStatus,
  onRoll,
  onToggleActions
}: {
  encounter: CombatEncounter;
  targetingFromId: string | null;
  expandedActions: Record<string, boolean>;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
  onRoll: (combatant: Combatant, actionId: string) => void | Promise<void>;
  onToggleActions: (id: string) => void;
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
                expanded={Boolean(expandedActions[combatant.id])}
                isCurrentTurn={
                  encounter.status === "active" && encounter.turnIndex === index
                }
                isTargeting={targetingFromId === combatant.id}
                key={combatant.id}
                layout="table"
                onDamage={onDamage}
                onHeal={onHeal}
                onRoll={onRoll}
                onStatus={onStatus}
                onTarget={onTarget}
                onToggleActions={onToggleActions}
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
            expanded={Boolean(expandedActions[combatant.id])}
            isCurrentTurn={encounter.status === "active" && encounter.turnIndex === index}
            isTargeting={targetingFromId === combatant.id}
            key={combatant.id}
            layout="card"
            onDamage={onDamage}
            onHeal={onHeal}
            onRoll={onRoll}
            onStatus={onStatus}
            onTarget={onTarget}
            onToggleActions={onToggleActions}
          />
        ))}
      </div>
    </div>
  );
}

function CombatantRow({
  combatant,
  encounter,
  layout,
  isCurrentTurn,
  isTargeting,
  expanded,
  onTarget,
  onDamage,
  onHeal,
  onStatus,
  onRoll,
  onToggleActions
}: {
  combatant: Combatant;
  encounter: CombatEncounter;
  layout: "table" | "card";
  isCurrentTurn: boolean;
  isTargeting: boolean;
  expanded: boolean;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
  onRoll: (combatant: Combatant, actionId: string) => void | Promise<void>;
  onToggleActions: (id: string) => void;
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
        onClick={() => onDamage(combatant.id, 5)}
        type="button"
      >
        -5
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        onChange={(event) => setDamageInput(event.target.value)}
        type="number"
        value={damageInput}
      />
      <button
        className="h-8 rounded border border-red-500/30 px-2 text-xs text-red-100"
        onClick={() => onDamage(combatant.id, Number(damageInput) || 0)}
        type="button"
      >
        Dmg
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        onChange={(event) => setHealInput(event.target.value)}
        type="number"
        value={healInput}
      />
      <button
        className="h-8 rounded border border-emerald-500/30 px-2 text-xs text-emerald-100"
        onClick={() => onHeal(combatant.id, Number(healInput) || 0)}
        type="button"
      >
        Heal
      </button>
      <button
        className={`h-8 rounded border px-2 text-xs ${isTargeting ? "border-amber-400 bg-amber-500/20 text-amber-100" : "border-slate-600/40 text-slate-200"}`}
        onClick={() => onTarget(combatant.id)}
        type="button"
      >
        <Target className="inline h-3 w-3" /> Target
      </button>
      {(["down", "dead", "fled", "hidden", "active"] as CombatStatus[]).map((status) => (
        <button
          className="h-8 rounded border border-slate-600/40 px-2 text-[10px] uppercase"
          key={status}
          onClick={() => onStatus(combatant.id, status)}
          type="button"
        >
          {status}
        </button>
      ))}
      {combatant.actions.length > 0 ? (
        <button
          className="h-8 rounded border border-purple-500/30 px-2 text-xs text-purple-100"
          onClick={() => onToggleActions(combatant.id)}
          type="button"
        >
          <Dices className="inline h-3 w-3" /> Actions
        </button>
      ) : null}
    </div>
  );

  const actionsPanel =
    expanded && combatant.actions.length > 0 ? (
      <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-700/25 pt-2">
        {combatant.actions.map((action) => (
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-purple-500/35 bg-purple-600/20 px-3 text-xs font-semibold text-purple-100"
            key={action.id}
            onClick={() => onRoll(combatant, action.id)}
            type="button"
          >
            <Dices className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    ) : null;

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
        {expanded ? (
          <tr>
            <td className="px-3 pb-3" colSpan={8}>
              {actionsPanel}
            </td>
          </tr>
        ) : null}
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
      {actionsPanel}
    </GlassPanel>
  );
}
