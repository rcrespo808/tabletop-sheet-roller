"use client";

import { SkipForward } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";

export function PlayerTurnBar({
  activeName,
  canEndTurn,
  onEndTurn,
  encounterActive
}: {
  activeName?: string;
  canEndTurn: boolean;
  onEndTurn: () => void | Promise<void>;
  encounterActive: boolean;
}) {
  if (!encounterActive) {
    return (
      <GlassPanel level="tertiary" className="p-4 text-sm text-muted-foreground">
        Turn passing is available once the GM starts the encounter.
      </GlassPanel>
    );
  }

  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-200">Your turn</p>
          <p className="mt-1 text-sm text-foreground">
            {activeName ? (
              <>
                Playing as <span className="font-semibold">{activeName}</span>
              </>
            ) : (
              "Waiting for initiative…"
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            When you are done acting, pass the turn to the next combatant.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canEndTurn}
          onClick={() => void onEndTurn()}
          type="button"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          End My Turn
        </button>
      </div>
      {!canEndTurn ? (
        <p className="mt-3 text-xs text-amber-100">
          You can only end the turn when it is your combatant&apos;s initiative and the encounter is
          active.
        </p>
      ) : null}
    </GlassPanel>
  );
}
