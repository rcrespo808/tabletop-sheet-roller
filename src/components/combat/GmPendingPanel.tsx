"use client";

import { isResolvablePendingAction } from "@/lib/combat/combatFlow";
import type { CombatEncounter, Combatant } from "@/lib/combat/types";

export function GmPendingPanel({
  pendingAction,
  activeCombatant,
  selectedTarget,
  pendingActionLabel,
  canManage,
  onClearPendingAction,
  onResolvePendingAction
}: {
  pendingAction: NonNullable<CombatEncounter["pendingAction"]>;
  activeCombatant: Combatant | null;
  selectedTarget: Combatant | null;
  pendingActionLabel?: string;
  canManage: boolean;
  onClearPendingAction: () => void | Promise<void>;
  onResolvePendingAction: () => void | Promise<void>;
}) {
  const resolvable = isResolvablePendingAction(pendingAction);

  return (
    <div className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-cyan-50">Pending player action</p>
          <p className="mt-1 text-xs text-cyan-100/85">
            {activeCombatant?.instanceName ?? "Combatant"} →{" "}
            {selectedTarget?.instanceName ?? pendingAction.targetId ?? "target"} ·{" "}
            {pendingActionLabel ?? pendingAction.actionLabel ?? pendingAction.actionId ?? "action"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resolvable ? (
            <button
              className="h-9 rounded-md border border-emerald-500/40 bg-emerald-700/25 px-3 text-xs font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canManage}
              onClick={() => void onResolvePendingAction()}
              type="button"
            >
              Resolve pending
            </button>
          ) : null}
          <button
            className="h-9 rounded-md border border-cyan-400/40 px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canManage}
            onClick={() => void onClearPendingAction()}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
      {resolvable ? (
        <p className="mt-2 text-xs text-emerald-100">
          Rolls attack vs defense and applies damage to the pending target.
        </p>
      ) : (
        <p className="mt-2 text-xs text-cyan-100/75">
          This declaration has no auto-resolve rule. Clear it or resolve manually from the roster.
        </p>
      )}
    </div>
  );
}
