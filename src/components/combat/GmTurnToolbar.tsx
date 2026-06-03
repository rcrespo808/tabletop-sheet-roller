"use client";

import { GlassPanel } from "@/components/GlassPanel";

export function GmTurnToolbar({
  activeName,
  round,
  onEndTurn,
  onNextTurn,
  disabled
}: {
  activeName?: string;
  round: number;
  onEndTurn: () => void | Promise<void>;
  onNextTurn: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-purple-200">GM controls</p>
          <p className="mt-1 text-sm text-foreground">
            Active: <span className="font-semibold">{activeName ?? "—"}</span>
            <span className="text-muted-foreground"> · Round {round}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="h-10 rounded-md border border-slate-600/40 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={() => void onEndTurn()}
            type="button"
          >
            End Turn
          </button>
          <button
            className="h-10 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={() => void onNextTurn()}
            type="button"
          >
            Next Turn
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
