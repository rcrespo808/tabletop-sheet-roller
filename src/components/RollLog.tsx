"use client";

import { Clock, Trash2 } from "lucide-react";
import type { RollLogEntry } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";
import { SystemBadge } from "./SystemBadge";

type RollLogProps = {
  entries: RollLogEntry[];
  onClear: () => void;
};

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoDate));
}

export function RollLog({ entries, onClear }: RollLogProps) {
  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Roll Log</h2>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          disabled={entries.length === 0}
          onClick={onClear}
          type="button"
          aria-label="Clear log"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700/25 p-6 text-center text-sm text-muted-foreground">
            No rolls yet. Start rolling to see your history.
          </p>
        ) : (
          entries.map((entry) => (
            <article
              className="rounded-lg border border-slate-700/20 bg-slate-900/40 p-3 transition hover:border-slate-600/30"
              key={entry.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SystemBadge system={entry.system} />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatTime(entry.createdAt)}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-lg font-bold text-purple-100">{entry.resultText}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[entry.characterName, entry.actionLabel].filter(Boolean).join(" - ")}
                </p>
              </div>
              <p className="mt-3 break-words rounded-md bg-slate-950/50 px-2 py-1 text-xs text-slate-300">
                {entry.expression}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.details}</p>
            </article>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
