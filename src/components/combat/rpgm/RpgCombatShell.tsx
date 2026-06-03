"use client";

import { useMemo } from "react";
import { ActiveActorPanel } from "@/components/combat/rpgm/ActiveActorPanel";
import { ActionStatusBanner } from "@/components/combat/ActionStatusBanner";
import { CombatFlowHint } from "@/components/combat/CombatFlowHint";
import { CommandMenu, type CommandMenuMode } from "@/components/combat/rpgm/CommandMenu";
import { GmPendingPanel } from "@/components/combat/GmPendingPanel";
import { EnemyField } from "@/components/combat/rpgm/EnemyField";
import { PartyStatusPanel } from "@/components/combat/rpgm/PartyStatusPanel";
import { SelectedTargetBanner } from "@/components/combat/rpgm/SelectedTargetBanner";
import { TargetGrid } from "@/components/combat/rpgm/TargetGrid";
import type { CombatAction, CombatEncounter, Combatant } from "@/lib/combat/types";
import type { CombatActionStatus, CombatFlowPhase } from "@/lib/combat/combatFlow";
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
  flowPhase?: CombatFlowPhase;
  actionStatus?: CombatActionStatus | null;
  mode?: CommandMenuMode;
  canResolve?: boolean;
  onResolveAction?: (actionId: string) => void | Promise<void>;
  onRollUtilityAction?: (action: CombatAction) => void | Promise<void>;
  onResolvePendingAction?: () => void | Promise<void>;
  onClearPendingAction?: () => void | Promise<void>;
  showAllTargets?: boolean;
  onShowAllTargetsChange?: (value: boolean) => void;
  onMakeActive?: (combatantId: string) => void | Promise<void>;
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
  recentResult,
  flowPhase = "idle",
  actionStatus = null,
  mode = "player",
  canResolve = false,
  onResolveAction,
  onRollUtilityAction,
  onResolvePendingAction,
  onClearPendingAction,
  showAllTargets,
  onShowAllTargetsChange,
  onMakeActive
}: RpgCombatShellProps) {
  const isGm = mode === "gm";
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
      <CombatFlowHint phase={flowPhase} />
      <ActionStatusBanner status={actionStatus} />
      <EnemyField
        combatFeedback={combatFeedback}
        displayOnly
        enemies={enemies}
        flashToken={flashToken}
        selectedTargetId={selectedTargetId}
        targetableIds={targetableIds}
      />
      <TargetGrid
        combatFeedback={combatFeedback}
        flashToken={flashToken}
        onSelectTarget={onSelectTarget}
        onShowAllTargetsChange={isGm ? onShowAllTargetsChange : undefined}
        selectedTargetId={selectedTargetId}
        showAllTargets={showAllTargets}
        validTargets={validTargets}
      />
      <SelectedTargetBanner
        needsTarget={flowPhase === "targeting"}
        onClearTarget={() => onSelectTarget(null)}
        selectedTarget={selectedTarget}
      />
      <PartyStatusPanel
        activeCombatantId={activeCombatant?.id ?? null}
        combatFeedback={combatFeedback}
        flashToken={flashToken}
        onSelectCombatant={onMakeActive}
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
        canResolve={canResolve}
        mode={mode}
        onDeclareAction={onDeclareAction}
        onDeclareBuiltIn={onDeclareBuiltIn}
        onResolveAction={onResolveAction}
        onResolvePendingAction={onResolvePendingAction}
        onRollUtilityAction={onRollUtilityAction}
        pendingAction={encounter.pendingAction}
        selectedTargetId={selectedTargetId}
      />
      {isGm && encounter.pendingAction ? (
        <GmPendingPanel
          activeCombatant={activeCombatant}
          canManage={canResolve}
          onClearPendingAction={() => void onClearPendingAction?.()}
          onResolvePendingAction={() => void onResolvePendingAction?.()}
          pendingAction={encounter.pendingAction}
          pendingActionLabel={
            activeCombatant?.combatActions.find(
              (action) => action.id === encounter.pendingAction?.actionId
            )?.label
          }
          selectedTarget={selectedTarget}
        />
      ) : null}
      {!isGm && encounter.pendingAction ? (
        <p className="rounded-md border border-cyan-500/30 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">
          Pending declaration is waiting for GM review. Open Combat Log in the header for full
          history.
        </p>
      ) : null}
    </div>
  );
}
