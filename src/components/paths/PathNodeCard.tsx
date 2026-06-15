"use client";

import type { PathNode, PathNodeKind, PathNodeStatus } from "@/lib/paths/types";

function kindClass(kind: PathNodeKind): string {
  if (kind === "combat" || kind === "boss") return "border-red-500/30 bg-red-950/30 text-red-100";
  if (kind === "loot" || kind === "reward") return "border-amber-500/30 bg-amber-950/30 text-amber-100";
  if (kind === "choice") return "border-cyan-500/30 bg-cyan-950/30 text-cyan-100";
  return "border-violet-500/30 bg-violet-950/30 text-violet-100";
}

function statusClass(status: PathNodeStatus): string {
  switch (status) {
    case "available":
      return "border-emerald-500/40 text-emerald-100";
    case "visited":
      return "border-sky-500/40 text-sky-100";
    case "resolved":
      return "border-violet-500/40 text-violet-100";
    case "locked":
      return "border-red-500/40 text-red-100";
    case "failed":
      return "border-orange-500/40 text-orange-100";
    case "skipped":
      return "border-slate-500/40 text-slate-300";
    default:
      return "border-slate-600/40 text-slate-400";
  }
}

export function PathNodeCard({
  node,
  edgeCount,
  selected,
  onSelect
}: {
  node: PathNode;
  edgeCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
        selected
          ? "border-violet-500/45 bg-violet-500/15"
          : "border-slate-700/25 bg-slate-950/30 hover:bg-slate-900/50"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{node.title}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(node.status)}`}
        >
          {node.status}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${kindClass(node.kind)}`}
        >
          {node.kind.replace("_", " ")}
        </span>
        <span className="rounded-full border border-slate-600/30 px-2 py-0.5 text-[10px] text-slate-400">
          {edgeCount} link{edgeCount === 1 ? "" : "s"}
        </span>
        {(node.outcomes?.length ?? 0) > 0 ? (
          <span className="rounded-full border border-slate-600/30 px-2 py-0.5 text-[10px] text-slate-400">
            {node.outcomes!.length} outcome{node.outcomes!.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </button>
  );
}
