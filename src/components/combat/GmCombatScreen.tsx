"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ActionStatusBanner } from "@/components/combat/ActionStatusBanner";
import { GmCombatRoster } from "@/components/combat/GmCombatRoster";
import { GmTurnToolbar } from "@/components/combat/GmTurnToolbar";
import { RpgCombatShell } from "@/components/combat/rpgm/RpgCombatShell";
import { GlassPanel } from "@/components/GlassPanel";
import type { BuiltinCommandId } from "@/lib/combat/rpgmActionCatalog";
import type { CombatActionStatus, CombatFlowPhase } from "@/lib/combat/combatFlow";
import type { RpgRecentResult } from "@/lib/combat/rpgmCombatFeedback";
import type {
  CombatAction,
  CombatEncounter,
  Combatant,
  CombatStatus
} from "@/lib/combat/types";

export function GmCombatScreen({
  encounter,
  activeCombatant,
  selectedTargetId,
  validTargets,
  flowPhase,
  actionStatus,
  recentResult,
  showAllTargets,
  onShowAllTargetsChange,
  onSelectTarget,
  onDeclareAction,
  onDeclareBuiltIn,
  onResolveAction,
  onResolvePendingAction,
  onClearPendingAction,
  onRollUtilityAction,
  onEndTurn,
  onNextTurn,
  onMakeActive,
  onDamage,
  onHeal,
  onStatus,
  onOpenCombatLog,
  canManage = true
}: {
  encounter: CombatEncounter;
  activeCombatant: Combatant | null;
  selectedTargetId: string;
  validTargets: Combatant[];
  flowPhase: CombatFlowPhase;
  actionStatus: CombatActionStatus | null;
  recentResult?: RpgRecentResult | null;
  showAllTargets: boolean;
  onShowAllTargetsChange: (value: boolean) => void;
  onSelectTarget: (targetId: string) => void;
  onDeclareAction: (actionId: string, targetId?: string | null) => void | Promise<void>;
  onDeclareBuiltIn: (command: BuiltinCommandId, targetId?: string | null) => void | Promise<void>;
  onResolveAction: (actionId: string) => void | Promise<void>;
  onResolvePendingAction: () => void | Promise<void>;
  onClearPendingAction: () => void | Promise<void>;
  onRollUtilityAction: (action: CombatAction) => void | Promise<void>;
  onEndTurn: () => void | Promise<void>;
  onNextTurn: () => void | Promise<void>;
  onMakeActive: (combatantId: string) => void | Promise<void>;
  onDamage: (combatantId: string, amount: number) => void | Promise<void>;
  onHeal: (combatantId: string, amount: number) => void | Promise<void>;
  onStatus: (combatantId: string, status: CombatStatus) => void | Promise<void>;
  onOpenCombatLog: () => void;
  canManage?: boolean;
}) {
  const [rosterOpen, setRosterOpen] = useState(true);

  return (
    <section className="space-y-4 sm:space-y-6" aria-label="GM combat screen">
      <GlassPanel level="secondary" className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-purple-200">GM combat</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{encounter.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Round {encounter.round} · {encounter.status} · {encounter.combatants.length} combatants
            </p>
          </div>
          <button
            className="text-xs font-semibold text-cyan-200 hover:underline"
            onClick={onOpenCombatLog}
            type="button"
          >
            Open combat log
          </button>
        </div>
      </GlassPanel>

      <GmTurnToolbar
        activeName={activeCombatant?.instanceName}
        disabled={!canManage || encounter.status !== "active"}
        onEndTurn={onEndTurn}
        onNextTurn={onNextTurn}
        round={encounter.round}
      />

      <ActionStatusBanner status={actionStatus} />

      <RpgCombatShell
        activeCombatant={activeCombatant}
        canDeclare={canManage}
        canResolve={canManage}
        encounter={encounter}
        flowPhase={flowPhase}
        mode="gm"
        onClearPendingAction={onClearPendingAction}
        onDeclareAction={(actionId, targetId) =>
          void onDeclareAction(actionId, targetId)
        }
        onDeclareBuiltIn={(command, targetId) => void onDeclareBuiltIn(command, targetId)}
        onMakeActive={(id) => void onMakeActive(id)}
        onResolveAction={(actionId) => void onResolveAction(actionId)}
        onResolvePendingAction={() => void onResolvePendingAction()}
        onRollUtilityAction={(action) => void onRollUtilityAction(action)}
        onSelectTarget={(targetId) => onSelectTarget(targetId ?? "")}
        onShowAllTargetsChange={onShowAllTargetsChange}
        recentResult={recentResult}
        selectedTargetId={selectedTargetId || null}
        showAllTargets={showAllTargets}
        validTargets={validTargets}
      />

      <GlassPanel level="secondary" className="p-4 sm:p-5">
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setRosterOpen((current) => !current)}
          type="button"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Combat roster &amp; manual controls
          </span>
          {rosterOpen ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
        {rosterOpen ? (
          <div className="mt-4">
            <GmCombatRoster
              canManage={canManage}
              encounter={encounter}
              onDamage={onDamage}
              onHeal={onHeal}
              onMakeActive={onMakeActive}
              onStatus={onStatus}
              onTarget={onSelectTarget}
            />
          </div>
        ) : null}
      </GlassPanel>
    </section>
  );
}
