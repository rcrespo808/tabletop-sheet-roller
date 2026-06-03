import type { PendingCombatAction } from "@/lib/combat/types";

/** UI phase for targeting and action confirmation (player + GM). */
export type CombatFlowPhase =
  | "idle"
  | "targeting"
  | "target_ready"
  | "pending"
  | "resolved";

export type CombatActionStatusKind =
  | "idle"
  | "declared"
  | "resolved"
  | "error"
  | "pending_cleared";

export type CombatActionStatus = {
  kind: CombatActionStatusKind;
  message: string;
  timestamp: number;
};

export function createCombatActionStatus(
  kind: CombatActionStatusKind,
  message: string
): CombatActionStatus {
  return { kind, message, timestamp: Date.now() };
}

export function isResolvablePendingAction(
  pending: PendingCombatAction | null | undefined
): pending is PendingCombatAction & {
  actionId: string;
  combatantId: string;
  targetId: string;
} {
  return Boolean(
    pending?.actionId?.trim() &&
      pending.combatantId?.trim() &&
      pending.targetId?.trim()
  );
}

export function deriveCombatFlowPhase(input: {
  hasActiveEncounter: boolean;
  selectedTargetId: string;
  pendingAction: PendingCombatAction | null | undefined;
  activeCombatantId?: string;
  showResolvedFeedback?: boolean;
}): CombatFlowPhase {
  const {
    hasActiveEncounter,
    selectedTargetId,
    pendingAction,
    activeCombatantId,
    showResolvedFeedback
  } = input;

  if (!hasActiveEncounter) return "idle";

  if (
    pendingAction &&
    activeCombatantId &&
    pendingAction.combatantId === activeCombatantId
  ) {
    return "pending";
  }

  if (showResolvedFeedback) {
    return "resolved";
  }

  if (selectedTargetId) return "target_ready";
  return "targeting";
}

export const COMBAT_FLOW_PHASE_LABELS: Record<CombatFlowPhase, string> = {
  idle: "No encounter",
  targeting: "Step 1 — Select a target",
  target_ready: "Step 2 — Choose a command",
  pending: "Declared — waiting for GM",
  resolved: "Last action resolved"
};
