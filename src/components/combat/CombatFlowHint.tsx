"use client";

import type { CombatFlowPhase } from "@/lib/combat/combatFlow";
import { COMBAT_FLOW_PHASE_LABELS } from "@/lib/combat/combatFlow";

export function CombatFlowHint({ phase }: { phase: CombatFlowPhase }) {
  if (phase === "idle" || phase === "resolved") return null;

  return (
    <p className="rounded-md border border-slate-700/25 bg-slate-950/40 px-3 py-2 text-xs text-muted-foreground">
      {COMBAT_FLOW_PHASE_LABELS[phase]}
    </p>
  );
}
