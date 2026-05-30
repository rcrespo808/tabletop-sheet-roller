"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCopy, Clock, Download, Search, Trash2 } from "lucide-react";
import {
  copyEntriesAsText,
  downloadEntriesAsJson,
  entryMatchesSearch,
  formatLogTime,
  formatSystemLabel,
  normalizeRollLogEntry
} from "@/lib/rollLog/export";
import type { GameSystem, RollLogEntry, RollLogEntryKind } from "@/lib/sheets/types";
import type { StorageMode } from "@/lib/storage/types";
import { GlassPanel } from "./GlassPanel";
import { StorageStatusBadge } from "./StorageStatusBadge";
import { SystemBadge } from "./SystemBadge";

type RollLogProps = {
  entries: RollLogEntry[];
  onClear: () => void | Promise<void>;
  loading?: boolean;
  storageMode?: StorageMode;
};

type SystemFilter = "all" | GameSystem;
type KindFilter = "all" | RollLogEntryKind;

export function RollLog({ entries, onClear, loading = false, storageMode = "local" }: RollLogProps) {
  const [systemFilter, setSystemFilter] = useState<SystemFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [characterFilter, setCharacterFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const characterNames = useMemo(() => {
    const names = new Set<string>();
    for (const entry of entries) {
      if (entry.characterName) names.add(entry.characterName);
    }
    return Array.from(names).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const normalized = normalizeRollLogEntry(entry);

      if (systemFilter !== "all" && normalized.system !== systemFilter) return false;
      if (kindFilter !== "all" && normalized.kind !== kindFilter) return false;
      if (characterFilter !== "all" && normalized.characterName !== characterFilter) return false;
      if (!entryMatchesSearch(entry, search)) return false;

      return true;
    });
  }, [entries, systemFilter, kindFilter, characterFilter, search]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopy() {
    try {
      await copyEntriesAsText(filteredEntries);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopyMessage("Copy failed.");
    }
  }

  function handleExport() {
    downloadEntriesAsJson(filteredEntries);
  }

  async function handleClear() {
    setClearing(true);
    try {
      await onClear();
    } finally {
      setClearing(false);
    }
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Roll Log</h2>
          <StorageStatusBadge mode={storageMode} scope="roll-log" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            disabled={filteredEntries.length === 0}
            onClick={handleCopy}
            title="Copy as text"
            type="button"
            aria-label="Copy log as text"
          >
            <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            disabled={filteredEntries.length === 0}
            onClick={handleExport}
            title="Export JSON"
            type="button"
            aria-label="Export log as JSON"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            disabled={entries.length === 0 || clearing || loading}
            onClick={handleClear}
            title="Clear all"
            type="button"
            aria-label="Clear log"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 pl-9 pr-3 text-sm text-foreground outline-none focus:border-purple-500/60"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search log..."
            value={search}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            className="h-9 rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 text-xs text-foreground"
            onChange={(event) => setSystemFilter(event.target.value as SystemFilter)}
            value={systemFilter}
          >
            <option value="all">All systems</option>
            <option value="dnd5e">D&D 5e</option>
            <option value="nwod">NWoD</option>
          </select>
          <select
            className="h-9 rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 text-xs text-foreground"
            onChange={(event) => setKindFilter(event.target.value as KindFilter)}
            value={kindFilter}
          >
            <option value="all">All kinds</option>
            <option value="roll">Rolls</option>
            <option value="note">Notes</option>
            <option value="system">System</option>
          </select>
          <select
            className="h-9 rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 text-xs text-foreground"
            disabled={characterNames.length === 0}
            onChange={(event) => setCharacterFilter(event.target.value)}
            value={characterFilter}
          >
            <option value="all">All characters</option>
            {characterNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-2 text-xs text-muted-foreground">
            <input
              checked={compactMode}
              className="accent-purple-400"
              onChange={(event) => setCompactMode(event.target.checked)}
              type="checkbox"
            />
            Compact
          </label>
        </div>
      </div>

      {copyMessage ? <p className="mt-2 text-xs text-emerald-300">{copyMessage}</p> : null}

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="rounded-lg border border-dashed border-slate-700/25 p-6 text-center text-sm text-muted-foreground">
            Loading roll log…
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700/25 p-6 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "No rolls yet. Start rolling to see your history."
              : "No entries match the current filters."}
          </p>
        ) : (
          filteredEntries.map((entry) => {
            const normalized = normalizeRollLogEntry(entry);
            const expanded = expandedIds.has(entry.id);
            const headerParts = [
              normalized.characterName,
              normalized.kind === "note" ? "Note" : formatSystemLabel(normalized.system),
              normalized.actionLabel
            ].filter(Boolean);

            return (
              <article
                className={`rounded-lg border border-slate-700/20 bg-slate-900/40 transition hover:border-slate-600/30 ${
                  compactMode ? "p-2" : "p-3"
                }`}
                key={entry.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {normalized.kind === "note" ? (
                      <span className="inline-flex rounded-full border border-slate-500/40 bg-slate-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-200">
                        Note
                      </span>
                    ) : normalized.system ? (
                      <SystemBadge system={normalized.system} />
                    ) : null}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatLogTime(normalized.createdAt)}
                    </span>
                  </div>
                  {normalized.details && !compactMode ? (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-800/50"
                      onClick={() => toggleExpanded(entry.id)}
                      type="button"
                      aria-label={expanded ? "Collapse details" : "Expand details"}
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                </div>

                <p className={`mt-2 text-xs text-muted-foreground ${compactMode ? "truncate" : ""}`}>
                  {headerParts.join(" · ")}
                </p>

                {normalized.kind === "note" ? (
                  <p className={`mt-2 text-sm text-foreground ${compactMode ? "line-clamp-2" : ""}`}>
                    {normalized.details ?? normalized.resultText}
                  </p>
                ) : (
                  <>
                    <p className={`mt-2 font-semibold text-purple-100 ${compactMode ? "text-sm" : "text-base"}`}>
                      {normalized.resultText}
                    </p>
                    {!compactMode && normalized.expression ? (
                      <p className="mt-1 break-words text-xs text-slate-300">{normalized.expression}</p>
                    ) : null}
                    {normalized.details && (compactMode || expanded) ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                        {normalized.details}
                      </p>
                    ) : null}
                  </>
                )}
              </article>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
