"use client";

import type { CombatActionStatus } from "@/lib/combat/combatFlow";

const KIND_STYLES: Record<CombatActionStatus["kind"], string> = {
  idle: "border-slate-700/30 bg-slate-950/35 text-muted-foreground",
  declared: "border-cyan-500/35 bg-cyan-950/30 text-cyan-100",
  resolved: "border-emerald-500/35 bg-emerald-950/25 text-emerald-100",
  error: "border-red-500/35 bg-red-950/30 text-red-100",
  pending_cleared: "border-slate-600/35 bg-slate-900/40 text-slate-200"
};

export function ActionStatusBanner({ status }: { status: CombatActionStatus | null }) {
  if (!status || status.kind === "idle") return null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${KIND_STYLES[status.kind]}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">
        {status.kind === "declared"
          ? "Action submitted"
          : status.kind === "resolved"
            ? "Action resolved"
            : status.kind === "error"
              ? "Action failed"
              : "Combat update"}
      </p>
      <p className="mt-1 text-xs leading-relaxed opacity-90">{status.message}</p>
    </div>
  );
}
