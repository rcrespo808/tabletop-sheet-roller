"use client";

import type { RollLogEntry } from "@/lib/sheets/types";
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
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Roll Log</h2>
        <button
          className="h-9 rounded-md border border-white/10 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={entries.length === 0}
          onClick={onClear}
          type="button"
        >
          Clear Log
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-zinc-500">
            No rolls yet.
          </p>
        ) : (
          entries.map((entry) => (
            <article
              className="rounded-md border border-white/10 bg-zinc-950/50 p-3"
              key={entry.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">{formatTime(entry.createdAt)}</span>
                <SystemBadge system={entry.system} />
              </div>
              <div className="mt-3">
                <p className="text-sm font-semibold text-white">{entry.resultText}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {[entry.characterName, entry.actionLabel].filter(Boolean).join(" - ")}
                </p>
              </div>
              <p className="mt-3 break-words rounded bg-black/30 px-2 py-1 text-xs text-zinc-300">
                {entry.expression}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{entry.details}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
