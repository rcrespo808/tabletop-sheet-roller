"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Table2 } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import type { CampaignSeat } from "@/lib/session/useCampaignSeat";
import type { SeatRole } from "@/lib/session/permissions";

const ROLE_LABELS: Record<SeatRole, string> = {
  gm: "GM",
  player: "Player",
  spectator: "Spectator"
};

const ROLE_STYLES: Record<SeatRole, string> = {
  gm: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  player: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  spectator: "border-slate-600/40 bg-slate-700/30 text-slate-300"
};

export function ActiveTableBar({
  seat,
  requireTable = false
}: {
  seat: CampaignSeat;
  requireTable?: boolean;
}) {
  if (!seat.activeTableId) {
    if (!requireTable) return null;
    return (
      <GlassPanel level="tertiary" className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">No active table</p>
            <p className="text-xs text-muted-foreground">
              Select a table from the lobby to use this module at a campaign table.
            </p>
          </div>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            href="/tables"
          >
            <Table2 className="h-4 w-4" aria-hidden="true" />
            Choose table
          </Link>
        </div>
      </GlassPanel>
    );
  }

  const tableName = seat.table?.name ?? "Active table";

  return (
    <GlassPanel level="tertiary" className="mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Table2 className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{tableName}</p>
            <p className="text-xs text-muted-foreground">Active campaign table</p>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${ROLE_STYLES[seat.role]}`}
          >
            {ROLE_LABELS[seat.role]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            href={`/tables/${seat.activeTableId}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open lobby
          </Link>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            href="/tables"
          >
            Change table
          </Link>
        </div>
      </div>
    </GlassPanel>
  );
}
