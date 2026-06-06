"use client";

import Link from "next/link";
import {
  BookOpen,
  Download,
  Edit3,
  FileUp,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CampaignShell } from "@/components/campaign/CampaignShell";
import { MasterDetailLayout } from "@/components/campaign/MasterDetailLayout";
import type { SeatMode } from "@/components/campaign/SeatModeTabs";
import { GlassPanel } from "@/components/GlassPanel";
import { useCampaignSeat } from "@/lib/session/useCampaignSeat";
import { getAvailableSystems } from "@/data/characters";
import {
  createCodexEntry,
  deleteCodexEntry,
  getCodexStorageMode,
  importCodexEntries,
  importSeedCodex,
  listCodexEntries,
  updateCodexEntry
} from "@/lib/codex/codexRepository";
import {
  CODEX_ENTRY_TYPES,
  CODEX_SYSTEMS,
  CODEX_VISIBILITIES,
  type CodexEntry,
  type CodexEntryType,
  type CodexGrant,
  type CodexPrerequisite,
  type CodexSystem,
  type CodexVisibility
} from "@/lib/codex/types";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type {
  AbilityKey,
  ActiveCondition,
  CharacterInventoryItem,
  CharacterProfile,
  Dnd5eSkillKey,
  GameSystem,
  NwodAttributeKey,
  NwodSkillKey,
  RewardTransaction,
  SheetAction
} from "@/lib/sheets/types";
import { listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import { storageStatusForMode, type StorageMode } from "@/lib/storage/types";

type ActionKind = "none" | SheetAction["type"];

type CodexFormState = {
  id?: string;
  campaignId: string;
  system: CodexSystem;
  type: CodexEntryType;
  name: string;
  subtitle: string;
  description: string;
  rulesText: string;
  tags: string;
  visibility: CodexVisibility;
  sourceLabel: string;
  actionKind: ActionKind;
  actionLabel: string;
  actionNotes: string;
  actionRoll: string;
  actionAbility: AbilityKey;
  actionDndSkill: "" | Dnd5eSkillKey;
  actionNwodAttribute: NwodAttributeKey;
  actionNwodSkill: "" | NwodSkillKey;
  actionPool: string;
  actionModifier: string;
  actionAgain: "" | "8" | "9" | "10" | "none";
  actionRote: boolean;
  actionChanceDie: boolean;
  grantsJson: string;
  prerequisitesJson: string;
  metadataJson: string;
};

type AddSelection = {
  actionTemplate: boolean;
  grants: boolean;
  note: boolean;
};

const DND_ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const DND_SKILLS: Dnd5eSkillKey[] = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival"
];
const NWOD_ATTRIBUTES: NwodAttributeKey[] = [
  "intelligence",
  "wits",
  "resolve",
  "strength",
  "dexterity",
  "stamina",
  "presence",
  "manipulation",
  "composure"
];
const NWOD_SKILLS: NwodSkillKey[] = [
  "academics",
  "computer",
  "crafts",
  "investigation",
  "medicine",
  "occult",
  "politics",
  "science",
  "athletics",
  "brawl",
  "drive",
  "firearms",
  "larceny",
  "stealth",
  "survival",
  "animalKen",
  "empathy",
  "expression",
  "intimidation",
  "persuasion",
  "socialize",
  "streetwise",
  "subterfuge"
];

const emptyForm: CodexFormState = {
  campaignId: "",
  system: "generic",
  type: "ability",
  name: "",
  subtitle: "",
  description: "",
  rulesText: "",
  tags: "",
  visibility: "campaign",
  sourceLabel: "",
  actionKind: "none",
  actionLabel: "",
  actionNotes: "",
  actionRoll: "",
  actionAbility: "wis",
  actionDndSkill: "",
  actionNwodAttribute: "wits",
  actionNwodSkill: "",
  actionPool: "",
  actionModifier: "",
  actionAgain: "",
  actionRote: false,
  actionChanceDie: false,
  grantsJson: "[]",
  prerequisitesJson: "[]",
  metadataJson: "{}"
};

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function systemLabel(system: CodexSystem | GameSystem): string {
  if (system === "dnd5e") return "D&D 5e";
  if (system === "nwod") return "NWoD";
  return "Generic";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tagsFromInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]): string {
  return tags.join(", ");
}

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function parseJsonArray<T>(value: string, label: string): T[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
  return parsed as T[];
}

function actionTemplateToForm(action: SheetAction | undefined): Partial<CodexFormState> {
  if (!action) return {};

  const base = {
    actionKind: action.type,
    actionLabel: action.label,
    actionNotes: "notes" in action && typeof action.notes === "string" ? action.notes : ""
  } satisfies Partial<CodexFormState>;

  if (action.type === "dnd-roll") return { ...base, actionRoll: action.roll };
  if (action.type === "dnd-check") {
    return {
      ...base,
      actionAbility: action.ability,
      actionDndSkill: action.skill ?? "",
      actionModifier: String(action.modifier ?? "")
    };
  }
  if (action.type === "nwod-pool") {
    return {
      ...base,
      actionPool: String(action.pool),
      actionAgain: action.again === null ? "none" : action.again ? String(action.again) as "8" | "9" | "10" : "",
      actionRote: Boolean(action.rote),
      actionChanceDie: Boolean(action.chanceDie)
    };
  }
  if (action.type === "nwod-check") {
    return {
      ...base,
      actionNwodAttribute: action.attribute,
      actionNwodSkill: action.skill ?? "",
      actionModifier: String(action.modifier ?? ""),
      actionAgain: action.again === null ? "none" : action.again ? String(action.again) as "8" | "9" | "10" : "",
      actionRote: Boolean(action.rote),
      actionChanceDie: Boolean(action.chanceDie)
    };
  }
  return base;
}

function entryToForm(entry: CodexEntry): CodexFormState {
  return {
    ...emptyForm,
    ...actionTemplateToForm(entry.actionTemplate),
    id: entry.id,
    campaignId: entry.campaignId ?? "",
    system: entry.system,
    type: entry.type,
    name: entry.name,
    subtitle: entry.subtitle ?? "",
    description: entry.description,
    rulesText: entry.rulesText ?? "",
    tags: formatTags(entry.tags),
    visibility: entry.visibility,
    sourceLabel: entry.sourceLabel ?? "",
    grantsJson: JSON.stringify(entry.grants ?? [], null, 2),
    prerequisitesJson: JSON.stringify(entry.prerequisites ?? [], null, 2),
    metadataJson: JSON.stringify(entry.metadata ?? {}, null, 2)
  };
}

function buildActionTemplate(form: CodexFormState): SheetAction | undefined {
  if (form.actionKind === "none") return undefined;

  const id = slugify(form.actionLabel || form.name || form.actionKind);
  const label = form.actionLabel.trim() || form.name.trim();
  const notes = form.actionNotes.trim() || undefined;

  if (form.actionKind === "note") {
    return { id, type: "note", label, notes: notes ?? form.description, source: "custom" };
  }
  if (form.actionKind === "dnd-roll") {
    if (!form.actionRoll.trim()) throw new Error("D&D roll actions require a roll expression.");
    return { id, type: "dnd-roll", label, roll: form.actionRoll.trim(), notes, source: "custom" };
  }
  if (form.actionKind === "dnd-check") {
    return {
      id,
      type: "dnd-check",
      label,
      ability: form.actionAbility,
      skill: form.actionDndSkill || undefined,
      modifier: form.actionModifier.trim() ? Number(form.actionModifier) : undefined,
      notes,
      source: "custom"
    };
  }
  if (form.actionKind === "nwod-pool") {
    const again = form.actionAgain === "none" ? null : form.actionAgain ? Number(form.actionAgain) as 8 | 9 | 10 : undefined;
    return {
      id,
      type: "nwod-pool",
      label,
      pool: form.actionPool.trim() ? Number(form.actionPool) : 0,
      again,
      rote: form.actionRote,
      chanceDie: form.actionChanceDie,
      notes,
      source: "custom"
    };
  }

  const again = form.actionAgain === "none" ? null : form.actionAgain ? Number(form.actionAgain) as 8 | 9 | 10 : undefined;
  return {
    id,
    type: "nwod-check",
    label,
    attribute: form.actionNwodAttribute,
    skill: form.actionNwodSkill || undefined,
    modifier: form.actionModifier.trim() ? Number(form.actionModifier) : undefined,
    again,
    rote: form.actionRote,
    chanceDie: form.actionChanceDie,
    notes,
    source: "custom"
  };
}

function formToEntry(form: CodexFormState, authState: AuthState): CodexEntry {
  return {
    id: form.id ?? crypto.randomUUID(),
    campaignId: form.campaignId.trim() || null,
    system: form.system,
    type: form.type,
    name: form.name,
    subtitle: form.subtitle || undefined,
    description: form.description,
    rulesText: form.rulesText || undefined,
    tags: tagsFromInput(form.tags),
    visibility: form.visibility,
    sourceLabel: form.sourceLabel || undefined,
    actionTemplate: buildActionTemplate(form),
    grants: parseJsonArray<CodexGrant>(form.grantsJson, "Grants"),
    prerequisites: parseJsonArray<CodexPrerequisite>(form.prerequisitesJson, "Prerequisites"),
    metadata: parseJsonObject(form.metadataJson),
    createdBy: authState.user?.id
  };
}

function systemMatches(entrySystem: CodexSystem, selectedSystem: string): boolean {
  return selectedSystem === "all" || entrySystem === selectedSystem;
}

function typeMatches(entryType: CodexEntryType, selectedType: string): boolean {
  return selectedType === "all" || entryType === selectedType;
}

function visibilityMatches(entryVisibility: CodexVisibility, selectedVisibility: string): boolean {
  return selectedVisibility === "all" || entryVisibility === selectedVisibility;
}

function availableTargetSystems(profile: CharacterProfile, entry: CodexEntry): GameSystem[] {
  const systems = getAvailableSystems(profile);
  if (entry.system === "dnd5e" || entry.system === "nwod") {
    return systems.includes(entry.system) ? [entry.system] : systems;
  }
  return systems;
}

function withCodexMetadata(action: SheetAction, entry: CodexEntry, suffix = action.id): SheetAction {
  return {
    ...action,
    id: `codex-${entry.id}-${slugify(suffix || action.label)}`,
    label: action.label || entry.name,
    source: "custom",
    metadata: {
      ...(action.metadata ?? {}),
      sourceCodexEntryId: entry.id,
      sourceCodexName: entry.name,
      sourceCodexSystem: entry.system,
      sourceCodexType: entry.type
    }
  };
}

function noteActionFromEntry(entry: CodexEntry): SheetAction {
  return withCodexMetadata(
    {
      id: "notes",
      type: "note",
      label: `${entry.name} Notes`,
      notes: [entry.description, entry.rulesText].filter(Boolean).join("\n\n"),
      source: "custom"
    },
    entry,
    "notes"
  );
}

function noteActionFromGrant(entry: CodexEntry, grant: Extract<CodexGrant, { type: "note" }>): SheetAction {
  return withCodexMetadata(
    {
      id: slugify(grant.title),
      type: "note",
      label: grant.title,
      notes: grant.body,
      source: "custom"
    },
    entry,
    `grant-${grant.title}`
  );
}

function statModifierNote(entry: CodexEntry, grant: Extract<CodexGrant, { type: "stat_modifier" }>): SheetAction {
  return withCodexMetadata(
    {
      id: `stat-${slugify(grant.target)}`,
      type: "note",
      label: `${entry.name}: ${grant.target}`,
      notes: `${grant.mode === "set" ? "Set" : "Add"} ${grant.target} ${grant.mode === "set" ? "to" : "by"} ${grant.value}. Apply manually until stat automation exists.`,
      source: "custom"
    },
    entry,
    `stat-${grant.target}`
  );
}

function appendUniqueAction(actions: SheetAction[], action: SheetAction): { actions: SheetAction[]; added: boolean } {
  const duplicate = actions.some((existing) => {
    return (
      existing.id === action.id ||
      (existing.metadata?.sourceCodexEntryId === action.metadata?.sourceCodexEntryId &&
        existing.type === action.type &&
        existing.label.trim().toLowerCase() === action.label.trim().toLowerCase())
    );
  });

  if (duplicate) return { actions, added: false };
  return { actions: [...actions, action], added: true };
}

function appendUniqueInventory(
  inventory: CharacterInventoryItem[] = [],
  item: CharacterInventoryItem
): { inventory: CharacterInventoryItem[]; added: boolean } {
  const duplicate = inventory.some((existing) => {
    return (
      existing.id === item.id ||
      (existing.sourceCodexEntryId &&
        existing.sourceCodexEntryId === item.sourceCodexEntryId &&
        existing.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
  });

  if (duplicate) return { inventory, added: false };
  return { inventory: [...inventory, item], added: true };
}

function isConditionEntry(entry: CodexEntry): boolean {
  return (
    entry.type === "condition" ||
    entry.type === "disease" ||
    entry.type === "curse" ||
    entry.type === "blessing"
  );
}

function appendUniqueCondition(
  conditions: ActiveCondition[] = [],
  entry: CodexEntry
): { conditions: ActiveCondition[]; added: boolean } {
  const duplicate = conditions.some((condition) => {
    return (
      condition.codexEntryId === entry.id ||
      condition.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
    );
  });

  if (duplicate) return { conditions, added: false };

  return {
    conditions: [
      {
        id: `codex-${entry.id}`,
        codexEntryId: entry.id,
        name: entry.name,
        description: [entry.description, entry.rulesText].filter(Boolean).join("\n\n"),
        source: entry.sourceLabel ?? "Codex",
        expiresAt: null
      },
      ...conditions
    ],
    added: true
  };
}

function buildRewardTransaction(
  characterId: string,
  entry: CodexEntry,
  delta: Record<string, unknown>
): RewardTransaction {
  return {
    id: crypto.randomUUID(),
    characterId,
    source: entry.name,
    type: "codex",
    description: `Added Codex Feature: ${entry.name}`,
    delta,
    createdAt: new Date().toISOString()
  };
}

function isEntryShape(value: unknown): value is CodexEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<CodexEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.description === "string" &&
    typeof entry.system === "string" &&
    CODEX_SYSTEMS.includes(entry.system as CodexSystem) &&
    typeof entry.type === "string" &&
    CODEX_ENTRY_TYPES.includes(entry.type as CodexEntryType) &&
    typeof entry.visibility === "string" &&
    CODEX_VISIBILITIES.includes(entry.visibility as CodexVisibility) &&
    Array.isArray(entry.tags)
  );
}

function defaultAddSelection(entry: CodexEntry | undefined): AddSelection {
  if (!entry) return { actionTemplate: false, grants: false, note: false };
  const hasAction = Boolean(entry.actionTemplate);
  const hasGrants = Boolean(entry.grants?.length);
  return {
    actionTemplate: hasAction,
    grants: !hasAction && hasGrants,
    note: !hasAction && !hasGrants
  };
}

export default function CodexPage() {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState<CodexSystem | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CodexEntryType | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<CodexVisibility | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CodexFormState>(emptyForm);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [targetSystem, setTargetSystem] = useState<GameSystem | "">("");
  const [addSelection, setAddSelection] = useState<AddSelection>(defaultAddSelection(undefined));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seatMode, setSeatMode] = useState<SeatMode>("play");
  const campaignSeat = useCampaignSeat(authState);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const [nextEntries, nextCharacters] = await Promise.all([listCodexEntries(), listCharacters()]);
    setEntries(nextEntries);
    setCharacters(nextCharacters);
    setStorageMode(getCodexStorageMode());
    setLoading(false);
    const nextId = selectedEntryId ?? nextEntries[0]?.id ?? null;
    const nextEntry = nextEntries.find((entry) => entry.id === nextId);
    setSelectedEntryId(nextId);
    setAddSelection(defaultAddSelection(nextEntry));
  }, [selectedEntryId]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listCodexEntries(), listCharacters()]).then(([nextEntries, nextCharacters]) => {
      if (cancelled) return;
      setEntries(nextEntries);
      setCharacters(nextCharacters);
      setStorageMode(getCodexStorageMode());
      setLoading(false);
      const nextId = nextEntries[0]?.id ?? null;
      setSelectedEntryId(nextId);
      setAddSelection(defaultAddSelection(nextEntries[0]));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const canManage = campaignSeat.canManage;
  const isManageMode = seatMode === "manage" && canManage;
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];

  function selectEntry(entry: CodexEntry) {
    setSelectedEntryId(entry.id);
    setAddSelection(defaultAddSelection(entry));
    setSelectedCharacterId("");
    setTargetSystem("");
  }

  const selectableCharacters = useMemo(() => {
    if (isManageMode || !isSupabaseConfigured()) return characters;
    if (campaignSeat.activeTableId && campaignSeat.controlledCharacterIds.length > 0) {
      return characters.filter((character) =>
        campaignSeat.controlledCharacterIds.includes(character.id)
      );
    }
    return characters.filter((character) => {
      return !character.ownerUserId || character.ownerUserId === authState.user?.id;
    });
  }, [
    authState.user?.id,
    campaignSeat.activeTableId,
    campaignSeat.controlledCharacterIds,
    characters,
    isManageMode
  ]);

  const selectedCharacter = selectableCharacters.find(
    (character) => character.id === selectedCharacterId
  );
  const targetSystems =
    selectedCharacter && selectedEntry ? availableTargetSystems(selectedCharacter, selectedEntry) : [];
  const effectiveTargetSystem =
    targetSystem && targetSystems.includes(targetSystem) ? targetSystem : targetSystems[0] ?? "";

  const allTags = useMemo(() => {
    return Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tagFilter.trim().toLowerCase();
    const applyPlayerVisibility = seatMode === "play" || !canManage;

    return entries.filter((entry) => {
      if (applyPlayerVisibility) {
        if (entry.visibility === "gm_only") return false;
        if (
          entry.visibility === "campaign" &&
          campaignSeat.activeTableId &&
          entry.campaignId &&
          entry.campaignId !== campaignSeat.activeTableId
        ) {
          return false;
        }
      }
      const text = [
        entry.name,
        entry.subtitle,
        entry.description,
        entry.rulesText,
        entry.sourceLabel,
        ...entry.tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        systemMatches(entry.system, systemFilter) &&
        typeMatches(entry.type, typeFilter) &&
        visibilityMatches(entry.visibility, visibilityFilter) &&
        (!normalizedTag || entry.tags.some((tag) => tag.toLowerCase() === normalizedTag)) &&
        (!normalizedQuery || text.includes(normalizedQuery))
      );
    });
  }, [
    campaignSeat.activeTableId,
    canManage,
    entries,
    query,
    seatMode,
    systemFilter,
    tagFilter,
    typeFilter,
    visibilityFilter
  ]);

  function openCreateForm() {
    setForm({
      ...emptyForm,
      campaignId: campaignSeat.activeTableId ?? ""
    });
    setFormOpen(true);
    setError(null);
    setMessage(null);
  }

  function openEditForm(entry: CodexEntry) {
    setForm(entryToForm(entry));
    setFormOpen(true);
    setError(null);
    setMessage(null);
  }

  async function handleSaveForm() {
    setError(null);
    setMessage(null);

    try {
      if (!form.name.trim() || !form.description.trim()) {
        setError("Name and description are required.");
        return;
      }

      const entry = formToEntry(form, authState);
      const saved = form.id ? await updateCodexEntry(entry) : await createCodexEntry(entry);
      await refresh();
      setSelectedEntryId(saved.id);
      setFormOpen(false);
      setMessage(`Saved ${saved.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save codex entry.");
    }
  }

  async function handleDelete(entry: CodexEntry) {
    setError(null);
    setMessage(null);

    await deleteCodexEntry(entry.id);
    await refresh();
    setSelectedEntryId(null);
    setMessage(`Deleted ${entry.name}.`);
  }

  async function handleImportStarterCodex() {
    setError(null);
    setMessage(null);

    try {
      const result = await importSeedCodex(null);
      await refresh();
      setMessage(`Imported starter codex: ${result.inserted} inserted, ${result.skipped} skipped.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import starter codex.");
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || !parsed.every(isEntryShape)) {
        throw new Error("Import file must be a JSON array of valid codex entries.");
      }

      const result = await importCodexEntries(parsed, null);
      await refresh();
      setMessage(`Imported codex JSON: ${result.inserted} inserted, ${result.skipped} skipped.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import codex JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function handleExportVisible() {
    const payload = JSON.stringify(filteredEntries, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codex-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddToCharacter() {
    setError(null);
    setMessage(null);

    if (!selectedEntry || !selectedCharacter || !effectiveTargetSystem) {
      setError("Select an entry, character, and target system.");
      return;
    }

    if (!addSelection.actionTemplate && !addSelection.grants && !addSelection.note) {
      setError("Choose at least one thing to add.");
      return;
    }

    const sheet = selectedCharacter.sheets[effectiveTargetSystem];
    if (!sheet) {
      setError(`${selectedCharacter.name} does not have a ${effectiveTargetSystem} sheet.`);
      return;
    }

    let nextActions = sheet.actions;
    let nextInventory = selectedCharacter.inventory ?? [];
    let nextConditions = selectedCharacter.conditions ?? [];
    const rewardDeltas: Record<string, unknown>[] = [];
    let added = 0;
    let skipped = 0;

    if (addSelection.actionTemplate && selectedEntry.actionTemplate) {
      const templateAction = withCodexMetadata(selectedEntry.actionTemplate, selectedEntry);
      const result = appendUniqueAction(nextActions, templateAction);
      nextActions = result.actions;
      result.added ? (added += 1) : (skipped += 1);
      if (result.added) rewardDeltas.push({ action: templateAction.label });
    }

    if (addSelection.grants) {
      for (const grant of selectedEntry.grants ?? []) {
        if (grant.type === "action") {
          const result = appendUniqueAction(
            nextActions,
            withCodexMetadata(grant.action, selectedEntry, grant.action.id)
          );
          nextActions = result.actions;
          result.added ? (added += 1) : (skipped += 1);
          if (result.added) rewardDeltas.push({ action: grant.action.label });
        }
        if (grant.type === "note") {
          const result = appendUniqueAction(nextActions, noteActionFromGrant(selectedEntry, grant));
          nextActions = result.actions;
          result.added ? (added += 1) : (skipped += 1);
          if (result.added) rewardDeltas.push({ note: grant.title });
        }
        if (grant.type === "stat_modifier") {
          const result = appendUniqueAction(nextActions, statModifierNote(selectedEntry, grant));
          nextActions = result.actions;
          result.added ? (added += 1) : (skipped += 1);
          if (result.added) rewardDeltas.push({ statModifier: grant });
        }
        if (grant.type === "inventory_item") {
          const result = appendUniqueInventory(nextInventory, {
            ...grant.item,
            codexEntryId: selectedEntry.id,
            quantity: grant.item.quantity ?? 1,
            sourceCodexEntryId: selectedEntry.id
          });
          nextInventory = result.inventory;
          result.added ? (added += 1) : (skipped += 1);
          if (result.added) rewardDeltas.push({ item: grant.item.name });
        }
      }
    }

    if (addSelection.note) {
      const result = isConditionEntry(selectedEntry)
        ? appendUniqueCondition(nextConditions, selectedEntry)
        : appendUniqueAction(nextActions, noteActionFromEntry(selectedEntry));
      if ("conditions" in result) nextConditions = result.conditions;
      else nextActions = result.actions;
      result.added ? (added += 1) : (skipped += 1);
      if (result.added) {
        rewardDeltas.push(isConditionEntry(selectedEntry) ? { condition: selectedEntry.name } : { note: selectedEntry.name });
      }
    }

    const nextRewardHistory =
      added > 0
        ? [
            buildRewardTransaction(selectedCharacter.id, selectedEntry, {
              grants: rewardDeltas
            }),
            ...(selectedCharacter.rewardHistory ?? [])
          ]
        : selectedCharacter.rewardHistory ?? [];

    const saved = await saveCharacter({
      ...selectedCharacter,
      inventory: nextInventory,
      conditions: nextConditions,
      rewardHistory: nextRewardHistory,
      sheets: {
        ...selectedCharacter.sheets,
        [effectiveTargetSystem]: {
          ...sheet,
          actions: nextActions
        }
      }
    });

    setCharacters((current) =>
      current.map((character) => (character.id === saved.id ? saved : character))
    );
    setMessage(`Added ${added} from ${selectedEntry.name} to ${saved.name}. ${skipped} duplicate(s) skipped.`);
  }

  function updateForm<K extends keyof CodexFormState>(key: K, value: CodexFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <CampaignShell
      error={error}
      header={{
        icon: BookOpen,
        iconGradient: "from-cyan-600/80 to-cyan-900/80 shadow-cyan-500/20",
        eyebrow: "Ability Codex",
        title: "Reusable Table Content",
        description: "Campaign abilities, items, conditions, and lore entries shared across characters.",
        storageMode,
        moduleLinks: [{ href: "/", label: "Characters", icon: UserPlus }],
        actions: (
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            onClick={handleExportVisible}
            type="button"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
        )
      }}
      message={message}
      mode={seatMode}
      onAuthChange={setAuthState}
      onModeChange={setSeatMode}
      seat={campaignSeat}
    >
      <MasterDetailLayout
        aside={
          <>
            <GlassPanel level="secondary" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Codex</h2>
                {isManageMode ? (
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/35 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/55"
                      onClick={handleImportStarterCodex}
                      type="button"
                    >
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                      Import Starter
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60"
                      onClick={openCreateForm}
                      type="button"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 pl-9 pr-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    placeholder="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    value={systemFilter}
                    onChange={(event) => setSystemFilter(event.target.value as CodexSystem | "all")}
                  >
                    <option value="all">All systems</option>
                    {CODEX_SYSTEMS.map((system) => (
                      <option key={system} value={system}>
                        {systemLabel(system)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as CodexEntryType | "all")}
                  >
                    <option value="all">All types</option>
                    {CODEX_ENTRY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    value={visibilityFilter}
                    onChange={(event) =>
                      setVisibilityFilter(event.target.value as CodexVisibility | "all")
                    }
                  >
                    <option value="all">All visibility</option>
                    {CODEX_VISIBILITIES.map((visibility) => (
                      <option key={visibility} value={visibility}>
                        {titleCase(visibility)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                  >
                    <option value="">All tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassPanel>

            {isManageMode ? (
              <input
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
                ref={importInputRef}
                type="file"
              />
            ) : null}

            {isManageMode ? (
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                onClick={() => importInputRef.current?.click()}
                type="button"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Import Codex JSON
              </button>
            ) : null}

            <div className="space-y-3">
              {loading ? (
                <GlassPanel level="tertiary" className="p-5 text-sm text-muted-foreground">
                  Loading codex...
                </GlassPanel>
              ) : null}

              {!loading && entries.length === 0 ? (
                <GlassPanel level="tertiary" className="p-5 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">No codex entries yet</p>
                  <p className="mt-2">Import the starter codex or create a custom entry.</p>
                  {isManageMode ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center rounded-md border border-emerald-500/40 bg-emerald-700/35 px-3 text-sm font-semibold text-emerald-100"
                        onClick={handleImportStarterCodex}
                        type="button"
                      >
                        Import Starter Codex
                      </button>
                      <button
                        className="inline-flex h-9 items-center rounded-md border border-cyan-500/40 bg-cyan-700/40 px-3 text-sm font-semibold text-cyan-100"
                        onClick={openCreateForm}
                        type="button"
                      >
                        Create Entry
                      </button>
                    </div>
                  ) : null}
                </GlassPanel>
              ) : null}

              {!loading && entries.length > 0 && filteredEntries.length === 0 ? (
                <GlassPanel level="tertiary" className="p-5 text-sm text-muted-foreground">
                  No entries match the current filters.
                </GlassPanel>
              ) : null}

              {filteredEntries.map((entry) => (
                <button
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedEntry?.id === entry.id
                      ? "border-cyan-500/50 bg-cyan-950/30"
                      : "border-slate-700/25 bg-slate-950/30 hover:border-slate-600/50"
                  }`}
                  key={entry.id}
                  onClick={() => selectEntry(entry)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {systemLabel(entry.system)} / {titleCase(entry.type)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-slate-700/30 px-2 py-1 text-xs text-muted-foreground">
                      {titleCase(entry.visibility)}
                    </span>
                  </div>
                  {entry.subtitle ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">{entry.subtitle}</p>
                  ) : null}
                  {entry.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.tags.slice(0, 4).map((tag) => (
                        <span
                          className="rounded-md bg-slate-800/70 px-2 py-1 text-xs text-slate-300"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        }
      >
            {selectedEntry ? (
              <GlassPanel level="secondary" glow="medium" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-100">
                        {systemLabel(selectedEntry.system)}
                      </span>
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-100">
                        {titleCase(selectedEntry.type)}
                      </span>
                      <span className="rounded-md border border-slate-700/30 bg-slate-900/60 px-2 py-1 text-xs text-muted-foreground">
                        {titleCase(selectedEntry.visibility)}
                      </span>
                    </div>
                    <h2 className="mt-4 text-3xl font-bold text-foreground">
                      {selectedEntry.name}
                    </h2>
                    {selectedEntry.subtitle ? (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedEntry.subtitle}</p>
                    ) : null}
                    {selectedEntry.sourceLabel ? (
                      <p className="mt-2 text-xs text-muted-foreground">{selectedEntry.sourceLabel}</p>
                    ) : null}
                  </div>

                  {isManageMode ? (
                    <div className="flex gap-2">
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                        onClick={() => openEditForm(selectedEntry)}
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500/30 bg-red-950/30 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/40"
                        onClick={() => handleDelete(selectedEntry)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {selectedEntry.tags.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedEntry.tags.map((tag) => (
                      <span
                        className="rounded-md bg-slate-800/70 px-2 py-1 text-xs text-slate-300"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                        {selectedEntry.description}
                      </p>
                    </div>

                    {selectedEntry.rulesText ? (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Rules
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                          {selectedEntry.rulesText}
                        </p>
                      </div>
                    ) : null}

                    {selectedEntry.prerequisites?.length ? (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Prerequisites
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm text-slate-200">
                          {selectedEntry.prerequisites.map((item) => (
                            <li key={`${item.label}-${item.rule ?? ""}`}>
                              {item.label}
                              {item.rule ? <span className="text-muted-foreground">: {item.rule}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {selectedEntry.grants?.length ? (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Grants
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm text-slate-200">
                          {selectedEntry.grants.map((grant, index) => (
                            <li key={`${grant.type}-${index}`}>
                              {titleCase(grant.type)}
                              {grant.type === "action" ? `: ${grant.action.label}` : null}
                              {grant.type === "inventory_item" ? `: ${grant.item.name}` : null}
                              {grant.type === "note" ? `: ${grant.title}` : null}
                              {grant.type === "stat_modifier" ? `: ${grant.mode} ${grant.target} ${grant.value}` : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <GlassPanel level="tertiary" className="p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Add to Character
                    </h3>
                    <div className="mt-3 space-y-3">
                      <select
                        className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={selectedCharacterId}
                        onChange={(event) => {
                          setSelectedCharacterId(event.target.value);
                          setTargetSystem("");
                        }}
                      >
                        <option value="">Select character</option>
                        {selectableCharacters.map((character) => (
                          <option key={character.id} value={character.id}>
                            {character.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        disabled={targetSystems.length === 0}
                        value={effectiveTargetSystem}
                        onChange={(event) => setTargetSystem(event.target.value as GameSystem)}
                      >
                        <option value="">System</option>
                        {targetSystems.map((system) => (
                          <option key={system} value={system}>
                            {systemLabel(system)}
                          </option>
                        ))}
                      </select>

                      <div className="space-y-2 rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            checked={addSelection.actionTemplate}
                            disabled={!selectedEntry.actionTemplate}
                            onChange={(event) =>
                              setAddSelection((current) => ({
                                ...current,
                                actionTemplate: event.target.checked
                              }))
                            }
                            type="checkbox"
                          />
                          Action template
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            checked={addSelection.grants}
                            disabled={!selectedEntry.grants?.length}
                            onChange={(event) =>
                              setAddSelection((current) => ({ ...current, grants: event.target.checked }))
                            }
                            type="checkbox"
                          />
                          Grants
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            checked={addSelection.note}
                            onChange={(event) =>
                              setAddSelection((current) => ({ ...current, note: event.target.checked }))
                            }
                            type="checkbox"
                          />
                          Note
                        </label>
                      </div>

                      <button
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!selectedCharacterId || !effectiveTargetSystem}
                        onClick={handleAddToCharacter}
                        type="button"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add to Character
                      </button>
                    </div>
                  </GlassPanel>
                </div>
              </GlassPanel>
            ) : (
              <GlassPanel level="secondary" className="p-8 text-center text-sm text-muted-foreground">
                Select or create a codex entry.
              </GlassPanel>
            )}

            {message ? (
              <GlassPanel level="tertiary" className="p-4 text-sm text-cyan-200">
                {message}
              </GlassPanel>
            ) : null}
            {error ? (
              <GlassPanel level="tertiary" className="p-4 text-sm text-red-300">
                {error}
              </GlassPanel>
            ) : null}

            <GlassPanel level="tertiary" className="p-4 text-center text-xs text-muted-foreground">
              {storageStatusForMode(storageMode).message}
            </GlassPanel>

      {formOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <GlassPanel level="primary" glow="strong" className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {form.id ? "Edit Entry" : "New Entry"}
                </h2>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/40 bg-slate-900/60 text-slate-100 transition hover:bg-slate-800/70"
                  onClick={() => setFormOpen(false)}
                  type="button"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Subtitle"
                  value={form.subtitle}
                  onChange={(event) => updateForm("subtitle", event.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  value={form.system}
                  onChange={(event) => updateForm("system", event.target.value as CodexSystem)}
                >
                  {CODEX_SYSTEMS.map((system) => (
                    <option key={system} value={system}>
                      {systemLabel(system)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  value={form.type}
                  onChange={(event) => updateForm("type", event.target.value as CodexEntryType)}
                >
                  {CODEX_ENTRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {titleCase(type)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  value={form.visibility}
                  onChange={(event) =>
                    updateForm("visibility", event.target.value as CodexVisibility)
                  }
                >
                  {CODEX_VISIBILITIES.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {titleCase(visibility)}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Source label"
                  value={form.sourceLabel}
                  onChange={(event) => updateForm("sourceLabel", event.target.value)}
                />
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="tags, comma separated"
                  value={form.tags}
                  onChange={(event) => updateForm("tags", event.target.value)}
                />
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Campaign UUID optional"
                  value={form.campaignId}
                  onChange={(event) => updateForm("campaignId", event.target.value)}
                />
              </div>

              <textarea
                className="mt-4 min-h-28 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                placeholder="Description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
              <textarea
                className="mt-4 min-h-28 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                placeholder="Rules text"
                value={form.rulesText}
                onChange={(event) => updateForm("rulesText", event.target.value)}
              />

              <div className="mt-4 rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">Action Template</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    value={form.actionKind}
                    onChange={(event) => updateForm("actionKind", event.target.value as ActionKind)}
                  >
                    <option value="none">None</option>
                    <option value="note">Note</option>
                    <option value="dnd-roll">D&D roll</option>
                    <option value="dnd-check">D&D check</option>
                    <option value="nwod-pool">NWoD pool</option>
                    <option value="nwod-check">NWoD check</option>
                  </select>
                  <input
                    className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                    placeholder="Action label"
                    value={form.actionLabel}
                    onChange={(event) => updateForm("actionLabel", event.target.value)}
                  />
                  {form.actionKind === "dnd-roll" ? (
                    <input
                      className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                      placeholder="Roll, e.g. 8d6"
                      value={form.actionRoll}
                      onChange={(event) => updateForm("actionRoll", event.target.value)}
                    />
                  ) : null}
                  {form.actionKind === "dnd-check" ? (
                    <>
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={form.actionAbility}
                        onChange={(event) => updateForm("actionAbility", event.target.value as AbilityKey)}
                      >
                        {DND_ABILITIES.map((ability) => (
                          <option key={ability} value={ability}>
                            {ability.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={form.actionDndSkill}
                        onChange={(event) =>
                          updateForm("actionDndSkill", event.target.value as "" | Dnd5eSkillKey)
                        }
                      >
                        <option value="">No skill</option>
                        {DND_SKILLS.map((skill) => (
                          <option key={skill} value={skill}>
                            {titleCase(skill)}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {form.actionKind === "nwod-check" ? (
                    <>
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={form.actionNwodAttribute}
                        onChange={(event) =>
                          updateForm("actionNwodAttribute", event.target.value as NwodAttributeKey)
                        }
                      >
                        {NWOD_ATTRIBUTES.map((attribute) => (
                          <option key={attribute} value={attribute}>
                            {titleCase(attribute)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={form.actionNwodSkill}
                        onChange={(event) =>
                          updateForm("actionNwodSkill", event.target.value as "" | NwodSkillKey)
                        }
                      >
                        <option value="">No skill</option>
                        {NWOD_SKILLS.map((skill) => (
                          <option key={skill} value={skill}>
                            {titleCase(skill)}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {form.actionKind === "nwod-pool" ? (
                    <input
                      className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                      placeholder="Pool"
                      value={form.actionPool}
                      onChange={(event) => updateForm("actionPool", event.target.value)}
                    />
                  ) : null}
                  {form.actionKind === "dnd-check" || form.actionKind === "nwod-check" ? (
                    <input
                      className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                      placeholder="Modifier"
                      value={form.actionModifier}
                      onChange={(event) => updateForm("actionModifier", event.target.value)}
                    />
                  ) : null}
                  {form.actionKind === "nwod-pool" || form.actionKind === "nwod-check" ? (
                    <>
                      <select
                        className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                        value={form.actionAgain}
                        onChange={(event) =>
                          updateForm("actionAgain", event.target.value as CodexFormState["actionAgain"])
                        }
                      >
                        <option value="">Default again</option>
                        <option value="10">10-again</option>
                        <option value="9">9-again</option>
                        <option value="8">8-again</option>
                        <option value="none">No again</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          checked={form.actionRote}
                          onChange={(event) => updateForm("actionRote", event.target.checked)}
                          type="checkbox"
                        />
                        Rote
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          checked={form.actionChanceDie}
                          onChange={(event) => updateForm("actionChanceDie", event.target.checked)}
                          type="checkbox"
                        />
                        Chance die
                      </label>
                    </>
                  ) : null}
                </div>
                <textarea
                  className="mt-3 min-h-20 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Action notes"
                  value={form.actionNotes}
                  onChange={(event) => updateForm("actionNotes", event.target.value)}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <textarea
                  className="min-h-32 rounded-md border border-slate-700/30 bg-slate-900/70 p-3 font-mono text-xs text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Grants JSON"
                  value={form.grantsJson}
                  onChange={(event) => updateForm("grantsJson", event.target.value)}
                />
                <textarea
                  className="min-h-32 rounded-md border border-slate-700/30 bg-slate-900/70 p-3 font-mono text-xs text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="Prerequisites JSON"
                  value={form.prerequisitesJson}
                  onChange={(event) => updateForm("prerequisitesJson", event.target.value)}
                />
              </div>
              <textarea
                className="mt-4 min-h-28 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 font-mono text-xs text-foreground outline-none focus:border-cyan-500/50"
                placeholder="Metadata JSON"
                value={form.metadataJson}
                onChange={(event) => updateForm("metadataJson", event.target.value)}
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="inline-flex h-10 items-center rounded-md border border-slate-700/40 bg-slate-900/60 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                  onClick={() => setFormOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60"
                  onClick={handleSaveForm}
                  type="button"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      ) : null}
      </MasterDetailLayout>
    </CampaignShell>
  );
}
