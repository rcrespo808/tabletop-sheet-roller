"use client";

import Link from "next/link";
import {
  BookOpen,
  Coins,
  Dice5,
  Gift,
  Home,
  PackagePlus,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import { listCodexEntries } from "@/lib/codex/codexRepository";
import type { CodexEntry } from "@/lib/codex/types";
import { createRollLogEntry } from "@/lib/dice/log";
import { applyRewardGrant } from "@/lib/loot/applyRewardGrant";
import {
  deleteLootTable,
  getLootStorageMode,
  importStarterLootTables,
  listLootTables,
  saveLootTable
} from "@/lib/loot/lootTableRepository";
import { formatLootRollDetails, rollLootTable } from "@/lib/loot/rollLootTable";
import {
  LOCAL_DEMO_CAMPAIGN_ID,
  SUPABASE_STARTER_LOOT_CAMPAIGN_ID,
  type LootRollResult,
  type LootTable,
  type LootTableEntry,
  type LootTableVisibility,
  type RewardGrant
} from "@/lib/loot/types";
import { DEFAULT_ROOM_SLUG } from "@/lib/rollLog/constants";
import type { CharacterProfile } from "@/lib/sheets/types";
import { listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { saveRollLog } from "@/lib/storage/rollLogRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type { StorageMode } from "@/lib/storage/types";

type TableFormState = {
  id: string;
  name: string;
  description: string;
  visibility: LootTableVisibility;
};

type EntryFormState = {
  id: string;
  label: string;
  weight: string;
  rewardType: RewardGrant["type"];
  rewardJson: string;
  notes: string;
};

const EMPTY_TABLE_FORM: TableFormState = {
  id: "",
  name: "",
  description: "",
  visibility: "gm_only"
};

const DEFAULT_LOOT_CAMPAIGN_ID = isSupabaseConfigured()
  ? SUPABASE_STARTER_LOOT_CAMPAIGN_ID
  : LOCAL_DEMO_CAMPAIGN_ID;

const DEFAULT_REWARD_BY_TYPE: Record<RewardGrant["type"], RewardGrant> = {
  currency: { type: "currency", walletDelta: { gp: 1 } },
  xp: { type: "xp", amount: 1 },
  item: {
    type: "item",
    item: {
      id: "loot-item",
      name: "Loot Item",
      quantity: 1,
      rarity: "common"
    }
  },
  condition: {
    type: "condition",
    condition: {
      id: "loot-condition",
      name: "Loot Condition",
      description: "",
      expiresAt: null
    }
  },
  codex: { type: "codex", codexEntryId: "" },
  note: { type: "note", title: "Loot Note", body: "" }
};

function emptyEntryForm(): EntryFormState {
  return {
    id: "",
    label: "",
    weight: "1",
    rewardType: "currency",
    rewardJson: JSON.stringify(DEFAULT_REWARD_BY_TYPE.currency, null, 2),
    notes: ""
  };
}

function tableToForm(table: LootTable): TableFormState {
  return {
    id: table.id,
    name: table.name,
    description: table.description ?? "",
    visibility: table.visibility
  };
}

function entryToForm(entry: LootTableEntry): EntryFormState {
  return {
    id: entry.id,
    label: entry.label,
    weight: String(entry.weight),
    rewardType: entry.reward.type,
    rewardJson: JSON.stringify(entry.reward, null, 2),
    notes: entry.notes ?? ""
  };
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseRewardGrant(raw: string, expectedType: RewardGrant["type"]): RewardGrant {
  const parsed = JSON.parse(raw) as RewardGrant;
  if (!parsed || typeof parsed !== "object" || parsed.type !== expectedType) {
    throw new Error(`Reward JSON must be an object with type "${expectedType}".`);
  }

  if (parsed.type === "currency") {
    if (!parsed.walletDelta || typeof parsed.walletDelta !== "object") {
      throw new Error("Currency rewards need walletDelta.");
    }
    return parsed;
  }
  if (parsed.type === "xp") {
    if (typeof parsed.amount !== "number") throw new Error("XP rewards need numeric amount.");
    return parsed;
  }
  if (parsed.type === "item") {
    if (!parsed.item?.name) throw new Error("Item rewards need item.name.");
    return parsed;
  }
  if (parsed.type === "condition") {
    if (!parsed.condition?.name) throw new Error("Condition rewards need condition.name.");
    return parsed;
  }
  if (parsed.type === "codex") {
    if (!parsed.codexEntryId) throw new Error("Codex rewards need codexEntryId.");
    return parsed;
  }
  if (parsed.type === "note") {
    if (!parsed.title) throw new Error("Note rewards need title.");
    return parsed;
  }

  return parsed;
}

function describeReward(grant: RewardGrant, codexEntries: CodexEntry[]): string {
  if (grant.type === "currency") {
    return Object.entries(grant.walletDelta)
      .map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${titleCase(key)}`)
      .join(", ");
  }
  if (grant.type === "xp") return `${grant.amount > 0 ? "+" : ""}${grant.amount} XP`;
  if (grant.type === "item") return `${grant.item.quantity ?? 1}x ${grant.item.name}`;
  if (grant.type === "condition") return `Condition: ${grant.condition.name}`;
  if (grant.type === "codex") {
    const codex = codexEntries.find((entry) => entry.id === grant.codexEntryId);
    return `Codex: ${codex?.name ?? grant.codexEntryId}`;
  }
  return `Note: ${grant.title}`;
}

function buildLootTable(form: TableFormState, existing: LootTable | null, campaignId: string): LootTable {
  const now = new Date().toISOString();
  return {
    id: form.id || existing?.id || crypto.randomUUID(),
    campaignId,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    visibility: form.visibility,
    entries: existing?.entries ?? [],
    createdBy: existing?.createdBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function buildEntry(form: EntryFormState): LootTableEntry {
  const weight = Number(form.weight);
  if (!form.label.trim()) throw new Error("Entry label is required.");
  if (!Number.isFinite(weight)) throw new Error("Entry weight must be a number.");
  return {
    id: form.id || crypto.randomUUID(),
    label: form.label.trim(),
    weight,
    reward: parseRewardGrant(form.rewardJson, form.rewardType),
    notes: form.notes.trim() || undefined
  };
}

export default function LootPage() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const [campaignId, setCampaignId] = useState(DEFAULT_LOOT_CAMPAIGN_ID);
  const [tables, setTables] = useState<LootTable[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [tableForm, setTableForm] = useState<TableFormState>(EMPTY_TABLE_FORM);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);
  const [editingEntryId, setEditingEntryId] = useState<string>("");
  const [targetCharacterIds, setTargetCharacterIds] = useState<string[]>([]);
  const [rollVisibility, setRollVisibility] = useState<"gm_only" | "campaign">("gm_only");
  const [rollResult, setRollResult] = useState<LootRollResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStarterLootCampaign = campaignId === SUPABASE_STARTER_LOOT_CAMPAIGN_ID;
  const canManage = !isSupabaseConfigured() || authState.profile?.userLevel === "gm";
  const canApplyRewards = canManage || isStarterLootCampaign;
  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables]
  );

  const visibleTables = useMemo(() => {
    if (canManage) return tables;
    return tables.filter((table) => table.visibility === "campaign");
  }, [canManage, tables]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextTables, nextCharacters, nextCodex] = await Promise.all([
      listLootTables(campaignId),
      listCharacters(),
      listCodexEntries()
    ]);
    setTables(nextTables);
    setCharacters(nextCharacters);
    setCodexEntries(nextCodex);
    setStorageMode(getLootStorageMode());
    setSelectedTableId((current) => {
      if (current && nextTables.some((table) => table.id === current)) return current;
      return nextTables[0]?.id ?? "";
    });
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listLootTables(campaignId), listCharacters(), listCodexEntries()]).then(
      ([nextTables, nextCharacters, nextCodex]) => {
        if (cancelled) return;
        setTables(nextTables);
        setCharacters(nextCharacters);
        setCodexEntries(nextCodex);
        setStorageMode(getLootStorageMode());
        setSelectedTableId((current) => {
          if (current && nextTables.some((table) => table.id === current)) return current;
          return nextTables[0]?.id ?? "";
        });
        setTableForm((current) => {
          if (current.id && nextTables.some((table) => table.id === current.id)) return current;
          return nextTables[0] ? tableToForm(nextTables[0]) : EMPTY_TABLE_FORM;
        });
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  function updateTableForm<K extends keyof TableFormState>(key: K, value: TableFormState[K]) {
    setTableForm((current) => ({ ...current, [key]: value }));
  }

  function updateEntryForm<K extends keyof EntryFormState>(key: K, value: EntryFormState[K]) {
    setEntryForm((current) => ({ ...current, [key]: value }));
  }

  function startNewTable() {
    setSelectedTableId("");
    setTableForm(EMPTY_TABLE_FORM);
    setEntryForm(emptyEntryForm());
    setEditingEntryId("");
    setRollResult(null);
  }

  async function handleSaveTable() {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    if (!tableForm.name.trim()) {
      setError("Table name is required.");
      return;
    }

    const saved = await saveLootTable(buildLootTable(tableForm, selectedTable, campaignId));
    await refresh();
    setSelectedTableId(saved.id);
    setMessage(`Saved loot table: ${saved.name}`);
  }

  async function handleDeleteTable() {
    if (!canManage || !selectedTable) return;
    setError(null);
    setMessage(null);
    await deleteLootTable(selectedTable.id);
    await refresh();
    startNewTable();
    setMessage(`Deleted loot table: ${selectedTable.name}`);
  }

  async function handleImportStarter() {
    if (!canManage) return;
    setError(null);
    setMessage(null);
    const result = await importStarterLootTables(campaignId);
    await refresh();
    setMessage(`Imported ${result.inserted} loot table(s). Skipped ${result.skipped} duplicate(s).`);
  }

  async function handleSaveEntry() {
    if (!canManage || !selectedTable) return;
    setError(null);
    setMessage(null);

    try {
      const entry = buildEntry(entryForm);
      const entries = editingEntryId
        ? selectedTable.entries.map((current) => (current.id === editingEntryId ? entry : current))
        : [...selectedTable.entries, entry];
      const saved = await saveLootTable({
        ...selectedTable,
        entries
      });
      await refresh();
      setSelectedTableId(saved.id);
      setEntryForm(emptyEntryForm());
      setEditingEntryId("");
      setMessage(`Saved entry: ${entry.label}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save entry.");
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!canManage || !selectedTable) return;
    const saved = await saveLootTable({
      ...selectedTable,
      entries: selectedTable.entries.filter((entry) => entry.id !== entryId)
    });
    await refresh();
    setSelectedTableId(saved.id);
    setMessage("Deleted loot entry.");
  }

  function handleRewardTypeChange(type: RewardGrant["type"]) {
    setEntryForm((current) => ({
      ...current,
      rewardType: type,
      rewardJson: JSON.stringify(DEFAULT_REWARD_BY_TYPE[type], null, 2)
    }));
  }

  function handleRoll() {
    if (!selectedTable) return;
    setError(null);
    setMessage(null);
    try {
      setRollResult(rollLootTable(selectedTable));
    } catch (rollError) {
      setError(rollError instanceof Error ? rollError.message : "Unable to roll loot table.");
    }
  }

  async function handleApplyReward() {
    if (!canApplyRewards || !selectedTable || !rollResult) return;
    setError(null);
    setMessage(null);
    if (targetCharacterIds.length === 0) {
      setError("Select at least one target character.");
      return;
    }

    const targetNames: string[] = [];
    const savedCharacters: CharacterProfile[] = [];
    const source = {
      lootTableId: selectedTable.id,
      lootTableName: selectedTable.name,
      entryId: rollResult.entry.id,
      entryLabel: rollResult.entry.label
    };

    for (const characterId of targetCharacterIds) {
      const character = characters.find((entry) => entry.id === characterId);
      if (!character) continue;

      const reward = rollResult.entry.reward;
      const codexEntry =
        reward.type === "codex"
          ? codexEntries.find((entry) => entry.id === reward.codexEntryId)
          : undefined;
      const nextCharacter = applyRewardGrant(character, reward, source, {
        codexEntry
      });
      const saved = await saveCharacter(nextCharacter);
      savedCharacters.push(saved);
      targetNames.push(saved.name);
    }

    if (rollVisibility === "campaign") {
      await saveRollLog(
        DEFAULT_ROOM_SLUG,
        createRollLogEntry({
          kind: "system",
          characterName: targetNames.join(", "),
          actionLabel: `Loot: ${selectedTable.name}`,
          resultText: `${rollResult.entry.label} -> ${describeReward(rollResult.entry.reward, codexEntries)}`,
          details: [
            formatLootRollDetails(rollResult),
            `Targets: ${targetNames.join(", ") || "None"}`,
            rollResult.entry.notes ? `Notes: ${rollResult.entry.notes}` : ""
          ]
            .filter(Boolean)
            .join("\n")
        })
      );
    }

    setCharacters((current) =>
      current.map((character) => savedCharacters.find((saved) => saved.id === character.id) ?? character)
    );
    setMessage(
      `Applied ${rollResult.entry.label} to ${targetNames.length} character(s). ${
        rollVisibility === "campaign" ? "Logged to campaign roll log." : "Kept out of campaign roll log."
      }`
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-700 shadow-lg shadow-amber-500/20">
                <Gift className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-amber-200">
                  Rewards Engine
                </p>
                <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
                  Loot Tables
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={storageMode} />
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Characters
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/codex"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Codex
              </Link>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Reusable weighted reward tables that grant currency, items, XP, conditions, notes, and
            codex features to selected characters.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AuthPanel onAuthChange={setAuthState} />

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-200">Campaign ID</span>
            <input
              className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
              onChange={(event) => {
                setLoading(true);
                setCampaignId(event.target.value.trim() || DEFAULT_LOOT_CAMPAIGN_ID);
              }}
              placeholder={DEFAULT_LOOT_CAMPAIGN_ID}
              value={campaignId}
            />
          </label>
          {canManage ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-600/20 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-600/30"
              onClick={handleImportStarter}
              type="button"
            >
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              Import Starter Loot Tables
            </button>
          ) : null}
        </div>

        {message ? (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <GlassPanel level="secondary" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Tables</h2>
                {canManage ? (
                  <button
                    className="rounded-md border border-slate-700/40 bg-slate-900/60 p-2 text-slate-100 transition hover:bg-slate-800/80"
                    onClick={startNewTable}
                    type="button"
                    aria-label="Create loot table"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {loading ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                    Loading loot tables...
                  </p>
                ) : visibleTables.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                    No loot tables yet.
                  </p>
                ) : (
                  visibleTables.map((table) => (
                    <button
                      className={[
                        "w-full rounded-md border p-3 text-left transition",
                        selectedTableId === table.id
                          ? "border-amber-500/45 bg-amber-500/15"
                          : "border-slate-700/25 bg-slate-950/30 hover:bg-slate-900/50"
                      ].join(" ")}
                      key={table.id}
                      onClick={() => {
                        setSelectedTableId(table.id);
                        setTableForm(tableToForm(table));
                        setRollResult(null);
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{table.name}</span>
                        <span className="rounded-full border border-slate-700/30 px-2 py-0.5 text-xs text-muted-foreground">
                          {titleCase(table.visibility)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {table.description || `${table.entries.length} weighted entries`}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </GlassPanel>
          </aside>

          <section className="space-y-6">
            {canManage ? (
              <GlassPanel level="secondary" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedTable ? "Edit Table" : "Create Table"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/45"
                      onClick={handleSaveTable}
                      type="button"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save
                    </button>
                    {selectedTable ? (
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/35 bg-red-950/35 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/45"
                        onClick={handleDeleteTable}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
                  <input
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) => updateTableForm("name", event.target.value)}
                    placeholder="Table name"
                    value={tableForm.name}
                  />
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) =>
                      updateTableForm("visibility", event.target.value as LootTableVisibility)
                    }
                    value={tableForm.visibility}
                  >
                    <option value="gm_only">GM Only</option>
                    <option value="campaign">Campaign</option>
                  </select>
                </div>
                <textarea
                  className="mt-3 min-h-20 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500/50"
                  onChange={(event) => updateTableForm("description", event.target.value)}
                  placeholder="Description"
                  value={tableForm.description}
                />
              </GlassPanel>
            ) : null}

            <GlassPanel level="secondary" className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedTable?.name ?? "Select a loot table"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedTable?.description ?? "Import starter tables or create one as GM."}
                  </p>
                </div>
                {selectedTable ? (
                  <span className="rounded-full border border-slate-700/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {selectedTable.entries.length} entries
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {!selectedTable ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-6 text-center text-sm text-muted-foreground">
                    No table selected.
                  </p>
                ) : selectedTable.entries.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-6 text-center text-sm text-muted-foreground">
                    No entries yet.
                  </p>
                ) : (
                  selectedTable.entries.map((entry) => (
                    <article
                      className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4"
                      key={entry.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{entry.label}</h3>
                            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-100">
                              Weight {entry.weight}
                            </span>
                            <span className="rounded-full border border-slate-700/25 px-2 py-0.5 text-xs text-muted-foreground">
                              {titleCase(entry.reward.type)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">
                            {describeReward(entry.reward, codexEntries)}
                          </p>
                          {entry.notes ? (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.notes}</p>
                          ) : null}
                        </div>
                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-md border border-slate-700/35 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800/80"
                              onClick={() => {
                                setEntryForm(entryToForm(entry));
                                setEditingEntryId(entry.id);
                              }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-md border border-red-500/35 bg-red-950/35 p-2 text-red-100 transition hover:bg-red-900/45"
                              onClick={() => handleDeleteEntry(entry.id)}
                              type="button"
                              aria-label={`Delete ${entry.label}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </GlassPanel>

            {canManage && selectedTable ? (
              <GlassPanel level="secondary" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingEntryId ? "Edit Entry" : "Add Entry"}
                  </h2>
                  {editingEntryId ? (
                    <button
                      className="text-sm font-semibold text-muted-foreground hover:text-slate-100"
                      onClick={() => {
                        setEntryForm(emptyEntryForm());
                        setEditingEntryId("");
                      }}
                      type="button"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_100px_160px]">
                  <input
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) => updateEntryForm("label", event.target.value)}
                    placeholder="Entry label"
                    value={entryForm.label}
                  />
                  <input
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) => updateEntryForm("weight", event.target.value)}
                    placeholder="Weight"
                    type="number"
                    value={entryForm.weight}
                  />
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) => handleRewardTypeChange(event.target.value as RewardGrant["type"])}
                    value={entryForm.rewardType}
                  >
                    <option value="currency">Currency</option>
                    <option value="xp">XP</option>
                    <option value="item">Item</option>
                    <option value="condition">Condition</option>
                    <option value="codex">Codex</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <textarea
                  className="mt-3 min-h-40 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-amber-500/50"
                  onChange={(event) => updateEntryForm("rewardJson", event.target.value)}
                  spellCheck={false}
                  value={entryForm.rewardJson}
                />
                {entryForm.rewardType === "codex" && codexEntries.length > 0 ? (
                  <select
                    className="mt-3 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        rewardJson: JSON.stringify(
                          { type: "codex", codexEntryId: event.target.value },
                          null,
                          2
                        )
                      }))
                    }
                    value={
                      (() => {
                        try {
                          const parsed = JSON.parse(entryForm.rewardJson) as RewardGrant;
                          return parsed.type === "codex" ? parsed.codexEntryId : "";
                        } catch {
                          return "";
                        }
                      })()
                    }
                  >
                    <option value="">Select codex entry...</option>
                    {codexEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.system} / {entry.type})
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  className="mt-3 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                  onChange={(event) => updateEntryForm("notes", event.target.value)}
                  placeholder="Entry notes"
                  value={entryForm.notes}
                />
                <button
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-600/20 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-600/30"
                  onClick={handleSaveEntry}
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Save Entry
                </button>
              </GlassPanel>
            ) : null}

            <GlassPanel level="secondary" className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Roll and Apply</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    GM-only application writes to character reward history and optionally to the roll log.
                  </p>
                </div>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-600/20 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedTable || !canApplyRewards}
                  onClick={handleRoll}
                  type="button"
                >
                  <Dice5 className="h-4 w-4" aria-hidden="true" />
                  Roll
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                  {rollResult ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Result</p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">
                        {rollResult.entry.label}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {describeReward(rollResult.entry.reward, codexEntries)}
                      </p>
                      <pre className="mt-3 whitespace-pre-wrap rounded-md border border-slate-700/25 bg-slate-900/60 p-3 text-xs text-muted-foreground">
                        {formatLootRollDetails(rollResult)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No roll result yet.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <select
                    className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-amber-500/50"
                    onChange={(event) =>
                      setRollVisibility(event.target.value as "gm_only" | "campaign")
                    }
                    value={rollVisibility}
                  >
                    <option value="gm_only">GM Only</option>
                    <option value="campaign">Campaign Log</option>
                  </select>

                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                    {characters.map((character) => (
                      <label
                        className="flex items-center gap-2 text-sm text-slate-200"
                        key={character.id}
                      >
                        <input
                          checked={targetCharacterIds.includes(character.id)}
                          className="accent-amber-400"
                          disabled={!canApplyRewards}
                          onChange={(event) => {
                            setTargetCharacterIds((current) =>
                              event.target.checked
                                ? [...current, character.id]
                                : current.filter((id) => id !== character.id)
                            );
                          }}
                          type="checkbox"
                        />
                        <span className="min-w-0 truncate">{character.name}</span>
                      </label>
                    ))}
                    {characters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No characters available.</p>
                    ) : null}
                  </div>

                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/55 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canApplyRewards || !rollResult}
                    onClick={handleApplyReward}
                    type="button"
                  >
                    <Coins className="h-4 w-4" aria-hidden="true" />
                    Apply Reward
                  </button>
                </div>
              </div>
            </GlassPanel>
          </section>
        </div>
      </div>
    </main>
  );
}
