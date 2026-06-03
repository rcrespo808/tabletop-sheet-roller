"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { PlayerTurnBar } from "@/components/combat/PlayerTurnBar";
import { RpgCombatShell } from "@/components/combat/rpgm/RpgCombatShell";
import { GlassPanel } from "@/components/GlassPanel";
import type { BuiltinCommandId } from "@/lib/combat/rpgmActionCatalog";
import type { CombatEncounter, Combatant } from "@/lib/combat/types";
import type { CombatActionStatus, CombatFlowPhase } from "@/lib/combat/combatFlow";
import type { RpgRecentResult } from "@/lib/combat/rpgmCombatFeedback";

export function PlayerCombatScreen({
  activeCombatant,
  canDeclare,
  currentUserId,
  encounter,
  onDeclareAction,
  onDeclareBuiltIn,
  onRefresh,
  onEndTurn,
  onSelectedTargetIdChange,
  ownedCombatants,
  canEndTurn,
  recentResult,
  selectedTargetId,
  validTargets,
  flowPhase,
  actionStatus
}: {
  activeCombatant: Combatant | null;
  canDeclare: boolean;
  currentUserId?: string | null;
  encounter: CombatEncounter;
  onDeclareAction: (actionId: string, targetId?: string | null) => void | Promise<void>;
  onDeclareBuiltIn: (command: BuiltinCommandId, targetId?: string | null) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onEndTurn: () => void | Promise<void>;
  onSelectedTargetIdChange: (value: string) => void;
  canEndTurn: boolean;
  ownedCombatants: Combatant[];
  recentResult?: RpgRecentResult | null;
  selectedTargetId: string;
  validTargets: Combatant[];
  flowPhase: CombatFlowPhase;
  actionStatus: CombatActionStatus | null;
}) {
  return (
    <section className="space-y-4 sm:space-y-6" aria-label="Player combat screen">
      <GlassPanel level="secondary" className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Player combat</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{encounter.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Round {encounter.round} · Status: {encounter.status}
            </p>
            {ownedCombatants.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Your combatants: {ownedCombatants.map((c) => c.instanceName).join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-100">
                No assigned combatants detected for your account.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 px-3 text-sm font-semibold text-slate-100"
              onClick={() => void onRefresh()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh Combat State
            </button>
            {ownedCombatants.some((c) => c.sourceId) ? (
              <Link
                className="inline-flex h-10 items-center rounded-md border border-slate-600/40 px-3 text-sm font-semibold text-slate-100"
                href={`/characters/${ownedCombatants.find((c) => c.sourceId)?.sourceId}`}
              >
                Character Sheet
              </Link>
            ) : null}
          </div>
        </div>
      </GlassPanel>

      <PlayerTurnBar
        activeName={activeCombatant?.instanceName}
        canEndTurn={canEndTurn}
        encounterActive={encounter.status === "active"}
        onEndTurn={onEndTurn}
      />

      <RpgCombatShell
        activeCombatant={activeCombatant}
        canDeclare={canDeclare}
        currentUserId={currentUserId}
        encounter={encounter}
        onDeclareAction={(actionId, targetId) => void onDeclareAction(actionId, targetId)}
        onDeclareBuiltIn={(command, targetId) => void onDeclareBuiltIn(command, targetId)}
        onSelectTarget={(targetId) => onSelectedTargetIdChange(targetId ?? "")}
        actionStatus={actionStatus}
        flowPhase={flowPhase}
        recentResult={recentResult}
        selectedTargetId={selectedTargetId || null}
        validTargets={validTargets}
      />
    </section>
  );
}
