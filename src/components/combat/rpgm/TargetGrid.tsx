"use client";

import { TargetCard } from "@/components/combat/rpgm/TargetCard";
import { GlassPanel } from "@/components/GlassPanel";
import type { Combatant } from "@/lib/combat/types";
import { TEAM_LABELS } from "@/lib/combat/rpgmDisplay";
import { getHpHighlight, type CombatUiFeedback } from "@/lib/combat/rpgmCombatFeedback";

export function TargetGrid({
  validTargets,
  selectedTargetId,
  combatFeedback,
  flashToken,
  onSelectTarget
}: {
  validTargets: Combatant[];
  selectedTargetId: string | null;
  combatFeedback?: CombatUiFeedback | null;
  flashToken?: number | string;
  onSelectTarget: (targetId: string | null) => void;
}) {
  const targetableIds = new Set(validTargets.map((entry) => entry.id));
  const uniqueTargets = validTargets;

  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
            Select Target
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap a card or use the dropdown to lock your target before declaring attacks.
          </p>
        </div>
        <label className="sr-only" htmlFor="combat-target-select">
          Target selector
        </label>
        <select
          className="h-10 min-w-[12rem] rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
          id="combat-target-select"
          onChange={(event) => onSelectTarget(event.target.value || null)}
          value={selectedTargetId ?? ""}
        >
          <option value="">No target selected</option>
          {validTargets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.instanceName} ({TEAM_LABELS[target.team]})
            </option>
          ))}
        </select>
      </div>

      {validTargets.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
          No valid targets for the active combatant right now.
        </p>
      ) : (
        <div
          className="mt-4 flex gap-3 overflow-x-auto pb-1"
          role="listbox"
          aria-label="Valid targets"
        >
          {uniqueTargets.map((target) => (
            <TargetCard
              combatant={target}
              flashToken={flashToken}
              hpHighlight={getHpHighlight(combatFeedback ?? null, target.id)}
              isSelected={selectedTargetId === target.id}
              isTargetable={targetableIds.has(target.id)}
              key={target.id}
              onSelect={() =>
                onSelectTarget(selectedTargetId === target.id ? null : target.id)
              }
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
