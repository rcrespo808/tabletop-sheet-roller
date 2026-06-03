"use client";

import { TargetCard } from "@/components/combat/rpgm/TargetCard";
import { GlassPanel } from "@/components/GlassPanel";
import type { Combatant } from "@/lib/combat/types";
import { getHpHighlight, type CombatUiFeedback } from "@/lib/combat/rpgmCombatFeedback";

export function EnemyField({
  enemies,
  selectedTargetId,
  targetableIds,
  combatFeedback,
  flashToken,
  onSelectTarget,
  displayOnly = false
}: {
  enemies: Combatant[];
  selectedTargetId: string | null;
  targetableIds: Set<string>;
  combatFeedback?: CombatUiFeedback | null;
  flashToken?: number | string;
  onSelectTarget?: (targetId: string | null) => void;
  /** When true, selection happens only in Target panel (no duplicate click targets). */
  displayOnly?: boolean;
}) {
  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-200">Enemy Field</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {displayOnly
          ? "Enemy overview. Select your target in the panel below."
          : "Overview of enemies. Valid attack targets also appear in Select Target below."}
      </p>
      {enemies.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
          No enemies on the field.
        </p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {enemies.map((enemy) => (
            <TargetCard
              combatant={enemy}
              flashToken={flashToken}
              hpHighlight={getHpHighlight(combatFeedback ?? null, enemy.id)}
              isSelected={selectedTargetId === enemy.id}
              isTargetable={!displayOnly && targetableIds.has(enemy.id)}
              key={enemy.id}
              onSelect={
                displayOnly
                  ? undefined
                  : () =>
                      onSelectTarget?.(selectedTargetId === enemy.id ? null : enemy.id)
              }
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
