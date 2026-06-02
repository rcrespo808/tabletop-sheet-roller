"use client";

import { Target } from "lucide-react";
import type { Combatant } from "@/lib/combat/types";
import { TEAM_LABELS, defenseLabel, formatHp, hpResourceLabel } from "@/lib/combat/rpgmDisplay";

export function SelectedTargetBanner({
  selectedTarget,
  needsTarget,
  onClearTarget
}: {
  selectedTarget: Combatant | null;
  needsTarget?: boolean;
  onClearTarget?: () => void;
}) {
  if (!selectedTarget) {
    return (
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          needsTarget
            ? "border-amber-500/40 bg-amber-950/25 text-amber-100"
            : "border-slate-700/30 bg-slate-950/35 text-muted-foreground"
        }`}
      >
        {needsTarget
          ? "Select a target in the grid above before declaring an attack."
          : "No target selected."}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-950/20 px-4 py-3">
      <Target className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase text-amber-200">Selected Target</p>
        <p className="text-sm font-semibold text-foreground">{selectedTarget.instanceName}</p>
        <p className="text-xs text-muted-foreground">
          {TEAM_LABELS[selectedTarget.team]} · {hpResourceLabel(selectedTarget)}{" "}
          {formatHp(selectedTarget)} · {defenseLabel(selectedTarget)}
        </p>
      </div>
      {onClearTarget ? (
        <button
          className="rounded-md border border-slate-600/40 px-2 py-1 text-xs font-semibold text-slate-200"
          onClick={onClearTarget}
          type="button"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
