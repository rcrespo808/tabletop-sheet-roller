"use client";

import type { CombatLogEntry } from "@/lib/combat/types";

export function CombatHistoryList({
  entries,
  maxEntries = 50,
  className = ""
}: {
  entries: CombatLogEntry[];
  maxEntries?: number;
  className?: string;
}) {
  const visible = entries.slice(0, maxEntries);

  return (
    <div className={`space-y-2 overflow-y-auto pr-1 ${className}`}>
      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
          No combat events recorded yet.
        </p>
      ) : (
        visible.map((entry) => (
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
  );
}
