"use client";

import { ScrollText, X } from "lucide-react";
import { CombatHistoryList } from "@/components/combat/CombatHistoryList";
import type { CombatLogEntry } from "@/lib/combat/types";

export function CombatLogDrawer({
  open,
  onClose,
  entries,
  encounterName
}: {
  open: boolean;
  onClose: () => void;
  entries: CombatLogEntry[];
  encounterName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-700/30 bg-background/95 p-4 shadow-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Combat log"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-red-300" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold">Combat Log</h2>
              {encounterName ? (
                <p className="text-xs text-muted-foreground">{encounterName}</p>
              ) : null}
            </div>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-800/70"
            onClick={onClose}
            type="button"
            aria-label="Close combat log"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {entries.length} event{entries.length === 1 ? "" : "s"} · newest first
        </p>
        <CombatHistoryList
          className="min-h-0 flex-1 max-h-[calc(100vh-12rem)]"
          entries={entries}
          maxEntries={100}
        />
      </aside>
    </div>
  );
}
