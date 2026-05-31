"use client";

import Link from "next/link";
import {
  BookOpen,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import { getAvailableSystems } from "@/data/characters";
import {
  deleteCodexEntry,
  getCodexStorageMode,
  listCodexEntries,
  saveCodexEntry
} from "@/lib/codex/codexRepository";
import {
  CODEX_ENTRY_TYPES,
  CODEX_SYSTEMS,
  CODEX_VISIBILITIES,
  type CodexEntry,
  type CodexEntryType,
  type CodexSystem,
  type CodexVisibility
} from "@/lib/codex/types";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type { CharacterProfile, GameSystem, SheetAction } from "@/lib/sheets/types";
import { listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import { storageStatusForMode, type StorageMode } from "@/lib/storage/types";

type CodexFormState = {
  id?: string;
  system: CodexSystem;
  type: CodexEntryType;
  name: string;
  subtitle: string;
  description: string;
  rulesText: string;
  tags: string;
  visibility: CodexVisibility;
  actionTemplateJson: string;
};

const emptyForm: CodexFormState = {
  system: "generic",
  type: "ability",
  name: "",
  subtitle: "",
  description: "",
  rulesText: "",
  tags: "",
  visibility: "campaign",
  actionTemplateJson: ""
};

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function entryToForm(entry: CodexEntry): CodexFormState {
  return {
    id: entry.id,
    system: entry.system,
    type: entry.type,
    name: entry.name,
    subtitle: entry.subtitle ?? "",
    description: entry.description,
    rulesText: entry.rulesText ?? "",
    tags: formatTags(entry.tags),
    visibility: entry.visibility,
    actionTemplateJson: entry.actionTemplate
      ? JSON.stringify(entry.actionTemplate, null, 2)
      : ""
  };
}

function parseActionTemplate(value: string): SheetAction | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = JSON.parse(trimmed) as Partial<SheetAction>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Action template must be a JSON object.");
  }
  if (typeof parsed.id !== "string" || typeof parsed.label !== "string") {
    throw new Error("Action template requires string id and label fields.");
  }
  if (
    parsed.type !== "dnd-roll" &&
    parsed.type !== "dnd-check" &&
    parsed.type !== "nwod-pool" &&
    parsed.type !== "nwod-check" &&
    parsed.type !== "note"
  ) {
    throw new Error("Action template type is not supported.");
  }

  return parsed as SheetAction;
}

function formToEntry(form: CodexFormState, authState: AuthState): CodexEntry {
  return {
    id: form.id ?? crypto.randomUUID(),
    system: form.system,
    type: form.type,
    name: form.name,
    subtitle: form.subtitle || undefined,
    description: form.description,
    rulesText: form.rulesText || undefined,
    tags: tagsFromInput(form.tags),
    visibility: form.visibility,
    actionTemplate: parseActionTemplate(form.actionTemplateJson),
    metadata: {},
    createdBy: authState.user?.id
  };
}

function buildActionFromEntry(entry: CodexEntry): SheetAction {
  const id = `codex-${entry.id}-${Date.now()}`;

  if (entry.actionTemplate) {
    return {
      ...entry.actionTemplate,
      id,
      label: entry.actionTemplate.label || entry.name,
      source: "custom"
    };
  }

  return {
    id,
    type: "note",
    label: entry.name,
    notes: [entry.description, entry.rulesText].filter(Boolean).join("\n\n"),
    source: "custom"
  };
}

function systemMatches(entrySystem: CodexSystem, selectedSystem: string): boolean {
  return selectedSystem === "all" || entrySystem === selectedSystem;
}

function typeMatches(entryType: CodexEntryType, selectedType: string): boolean {
  return selectedType === "all" || entryType === selectedType;
}

function availableTargetSystems(profile: CharacterProfile, entry: CodexEntry): GameSystem[] {
  const systems = getAvailableSystems(profile);
  if (entry.system === "dnd5e" || entry.system === "nwod") {
    return systems.includes(entry.system) ? [entry.system] : systems;
  }
  return systems;
}

export default function CodexPage() {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState<CodexSystem | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CodexEntryType | "all">("all");
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextEntries, nextCharacters] = await Promise.all([listCodexEntries(), listCharacters()]);
    setEntries(nextEntries);
    setCharacters(nextCharacters);
    setStorageMode(getCodexStorageMode());
    setLoading(false);
    setSelectedEntryId((current) => current ?? nextEntries[0]?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listCodexEntries(), listCharacters()]).then(([nextEntries, nextCharacters]) => {
      if (cancelled) return;
      setEntries(nextEntries);
      setCharacters(nextCharacters);
      setStorageMode(getCodexStorageMode());
      setLoading(false);
      setSelectedEntryId((current) => current ?? nextEntries[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const canManage = !isSupabaseConfigured() || authState.profile?.userLevel === "gm";
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];

  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId);
  const targetSystems = selectedCharacter && selectedEntry
    ? availableTargetSystems(selectedCharacter, selectedEntry)
    : [];
  const effectiveTargetSystem =
    targetSystem && targetSystems.includes(targetSystem) ? targetSystem : targetSystems[0] ?? "";

  const allTags = useMemo(() => {
    return Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tagFilter.trim().toLowerCase();

    return entries.filter((entry) => {
      const text = [entry.name, entry.subtitle, entry.description, entry.rulesText, ...entry.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        systemMatches(entry.system, systemFilter) &&
        typeMatches(entry.type, typeFilter) &&
        (!normalizedTag || entry.tags.some((tag) => tag.toLowerCase() === normalizedTag)) &&
        (!normalizedQuery || text.includes(normalizedQuery))
      );
    });
  }, [entries, query, systemFilter, tagFilter, typeFilter]);

  function openCreateForm() {
    setForm(emptyForm);
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

      const saved = await saveCodexEntry(formToEntry(form, authState));
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

  async function handleAddToCharacter() {
    setError(null);
    setMessage(null);

    if (!selectedEntry || !selectedCharacter || !effectiveTargetSystem) {
      setError("Select an entry, character, and target system.");
      return;
    }

    const sheet = selectedCharacter.sheets[effectiveTargetSystem];
    if (!sheet) {
      setError(`${selectedCharacter.name} does not have a ${effectiveTargetSystem} sheet.`);
      return;
    }

    const action = buildActionFromEntry(selectedEntry);
    const saved = await saveCharacter({
      ...selectedCharacter,
      sheets: {
        ...selectedCharacter.sheets,
        [effectiveTargetSystem]: {
          ...sheet,
          actions: [...sheet.actions, action]
        }
      }
    });

    setCharacters((current) =>
      current.map((character) => (character.id === saved.id ? saved : character))
    );
    setMessage(`Added ${selectedEntry.name} to ${saved.name}.`);
  }

  function updateForm<K extends keyof CodexFormState>(key: K, value: CodexFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/35">
                <BookOpen className="h-6 w-6 text-cyan-100" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-cyan-200">Ability Codex</p>
                <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
                  Reusable Table Content
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={storageMode} />
              <Link
                className="inline-flex h-10 items-center rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                href="/"
              >
                Characters
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AuthPanel onAuthChange={setAuthState} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <GlassPanel level="secondary" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Codex</h2>
                {canManage ? (
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60"
                    onClick={openCreateForm}
                    type="button"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New
                  </button>
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
                    onChange={(event) =>
                      setSystemFilter(event.target.value as CodexSystem | "all")
                    }
                  >
                    <option value="all">All systems</option>
                    {CODEX_SYSTEMS.map((system) => (
                      <option key={system} value={system}>
                        {system}
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

            <div className="space-y-3">
              {loading ? (
                <GlassPanel level="tertiary" className="p-5 text-sm text-muted-foreground">
                  Loading codex...
                </GlassPanel>
              ) : null}

              {!loading && filteredEntries.length === 0 ? (
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
                  onClick={() => setSelectedEntryId(entry.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.system} · {titleCase(entry.type)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-slate-700/30 px-2 py-1 text-xs text-muted-foreground">
                      {entry.visibility}
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
          </aside>

          <section className="space-y-4">
            {selectedEntry ? (
              <GlassPanel level="secondary" glow="medium" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-100">
                        {selectedEntry.system}
                      </span>
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-100">
                        {titleCase(selectedEntry.type)}
                      </span>
                      <span className="rounded-md border border-slate-700/30 bg-slate-900/60 px-2 py-1 text-xs text-muted-foreground">
                        {selectedEntry.visibility}
                      </span>
                    </div>
                    <h2 className="mt-4 text-3xl font-bold text-foreground">
                      {selectedEntry.name}
                    </h2>
                    {selectedEntry.subtitle ? (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedEntry.subtitle}</p>
                    ) : null}
                  </div>

                  {canManage ? (
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

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
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
                        {characters.map((character) => (
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
                            {system}
                          </option>
                        ))}
                      </select>
                      <button
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!selectedCharacterId || !effectiveTargetSystem}
                        onClick={handleAddToCharacter}
                        type="button"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {selectedEntry.actionTemplate ? "Action template" : "Note action"}
                    </p>
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
          </section>
        </section>
      </div>

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
                      {system}
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
                      {visibility}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                  placeholder="tags, comma separated"
                  value={form.tags}
                  onChange={(event) => updateForm("tags", event.target.value)}
                />
              </div>

              <textarea
                className="mt-4 min-h-32 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                placeholder="Description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
              <textarea
                className="mt-4 min-h-32 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
                placeholder="Rules text"
                value={form.rulesText}
                onChange={(event) => updateForm("rulesText", event.target.value)}
              />
              <textarea
                className="mt-4 min-h-40 w-full rounded-md border border-slate-700/30 bg-slate-900/70 p-3 font-mono text-xs text-foreground outline-none focus:border-cyan-500/50"
                placeholder='Optional SheetAction JSON, e.g. {"id":"fire-bolt","type":"dnd-roll","label":"Fire Bolt","roll":"1d20+6"}'
                value={form.actionTemplateJson}
                onChange={(event) => updateForm("actionTemplateJson", event.target.value)}
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
    </main>
  );
}
