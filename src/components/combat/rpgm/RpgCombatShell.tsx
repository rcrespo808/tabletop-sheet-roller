"use client";

import { useMemo } from "react";
import { ActiveActorPanel } from "@/components/combat/rpgm/ActiveActorPanel";
import { CombatMessageWindow } from "@/components/combat/rpgm/CombatMessageWindow";
import { CommandMenu } from "@/components/combat/rpgm/CommandMenu";
import { EnemyField } from "@/components/combat/rpgm/EnemyField";
import { PartyStatusPanel } from "@/components/combat/rpgm/PartyStatusPanel";
import { SelectedTargetBanner } from "@/components/combat/rpgm/SelectedTargetBanner";
import { TargetGrid } from "@/components/combat/rpgm/TargetGrid";
import type { CombatEncounter, Combatant } from "@/lib/combat/types";
import type { BuiltinCommandId } from "@/lib/combat/rpgmActionCatalog";
import {
  resolveCombatFeedback,
  type RpgRecentResult
} from "@/lib/combat/rpgmCombatFeedback";

export type RpgCombatShellProps = {
  encounter: CombatEncounter;
  activeCombatant: Combatant | null;
  selectedTargetId: string | null;
  validTargets: Combatant[];
  onSelectTarget: (targetId: string | null) => void;
  onDeclareAction?: (actionId: string, targetId?: string | null) => void;
  onDeclareBuiltIn?: (command: BuiltinCommandId, targetId?: string | null) => void;
  currentUserId?: string | null;
  canDeclare?: boolean;
  recentResult?: RpgRecentResult | null;
};

export function RpgCombatShell({
  encounter,
  activeCombatant,
  selectedTargetId,
  validTargets,
  onSelectTarget,
  onDeclareAction,
  onDeclareBuiltIn,
  currentUserId,
  canDeclare = false,
  recentResult
}: RpgCombatShellProps) {
  const combatFeedback = useMemo(
    () => resolveCombatFeedback(recentResult, encounter.actionHistory ?? []),
    [recentResult, encounter.actionHistory]
  );

  const flashToken = useMemo(() => {
    if (
      !combatFeedback?.combatantId ||
      combatFeedback.hpBefore === undefined ||
      combatFeedback.hpAfter === undefined ||
      combatFeedback.hpBefore === combatFeedback.hpAfter
    ) {
      return 0;
    }
    return `${combatFeedback.id}-${combatFeedback.hpBefore}-${combatFeedback.hpAfter}`;
  }, [combatFeedback]);

  const enemies = useMemo(
    () => encounter.combatants.filter((c) => c.team === "enemies"),
    [encounter.combatants]
  );
  const party = useMemo(
    () => encounter.combatants.filter((c) => c.team === "players" || c.team === "allies"),
    [encounter.combatants]
  );
  const targetableIds = useMemo(
    () => new Set(validTargets.map((target) => target.id)),
    [validTargets]
  );
  const selectedTarget = useMemo(
    () => encounter.combatants.find((entry) => entry.id === selectedTargetId) ?? null,
    [encounter.combatants, selectedTargetId]
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6" aria-label="RPG combat interface">
      <EnemyField
        combatFeedback={combatFeedback}
        enemies={enemies}
        flashToken={flashToken}
        onSelectTarget={onSelectTarget}
        selectedTargetId={selectedTargetId}
        targetableIds={targetableIds}
      />
      <TargetGrid
        allCombatants={encounter.combatants}
        combatFeedback={combatFeedback}
        flashToken={flashToken}
        onSelectTarget={onSelectTarget}
        selectedTargetId={selectedTargetId}
        validTargets={validTargets}
      />
      <SelectedTargetBanner
        needsTarget={!selectedTargetId}
        onClearTarget={() => onSelectTarget(null)}
        selectedTarget={selectedTarget}
      />
      <PartyStatusPanel
        activeCombatantId={activeCombatant?.id ?? null}
        combatFeedback={combatFeedback}
        flashToken={flashToken}
        party={party}
      />
      <ActiveActorPanel
        activeCombatant={activeCombatant}
        currentUserId={currentUserId}
        encounter={encounter}
      />
      <CommandMenu
        key={activeCombatant?.id ?? "no-active-combatant"}
        activeCombatant={activeCombatant}
        canDeclare={canDeclare}
        onDeclareAction={onDeclareAction}
        onDeclareBuiltIn={onDeclareBuiltIn}
        selectedTargetId={selectedTargetId}
      />
      <CombatMessageWindow
        actionHistory={encounter.actionHistory ?? []}
        recentResult={recentResult}
      />
      {encounter.pendingAction ? (
        <p className="rounded-md border border-cyan-500/30 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">
          Pending declaration is waiting for GM review.
        </p>
      ) : null}
    </div>
  );
}
