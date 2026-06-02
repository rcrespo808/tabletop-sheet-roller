"use client";

import { GlassPanel } from "@/components/GlassPanel";
import type { CombatEncounter, Combatant } from "@/lib/combat/types";
import { TEAM_LABELS, STATUS_LABELS } from "@/lib/combat/rpgmDisplay";

export function ActiveActorPanel({
  encounter,
  activeCombatant,
  currentUserId
}: {
  encounter: CombatEncounter;
  activeCombatant: Combatant | null;
  currentUserId?: string | null;
}) {
  const isYourTurn = Boolean(
    activeCombatant?.controlledByUserId &&
      currentUserId &&
      activeCombatant.controlledByUserId === currentUserId
  );

  let waitMessage = "Waiting for the next combatant.";
  if (activeCombatant) {
    if (isYourTurn) {
      waitMessage = "Your turn — choose a command.";
    } else if (activeCombatant.controller?.role === "gm" || activeCombatant.isNpc) {
      waitMessage = "Waiting for GM.";
    } else {
      waitMessage = `Waiting for ${activeCombatant.instanceName}.`;
    }
  }

  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Active Actor
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">Round {encounter.round}</p>
      {activeCombatant ? (
        <>
          <p className="mt-2 text-xl font-bold text-foreground">
            {activeCombatant.instanceName}&apos;s Turn
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {TEAM_LABELS[activeCombatant.team]} · Status: {STATUS_LABELS[activeCombatant.status]}
          </p>
          <p
            className={`mt-3 text-sm font-semibold ${isYourTurn ? "text-emerald-200" : "text-amber-100"}`}
          >
            {waitMessage}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No active combatant.</p>
      )}
    </GlassPanel>
  );
}
