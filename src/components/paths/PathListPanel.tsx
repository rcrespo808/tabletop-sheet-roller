"use client";

import type { BranchingPath, PathStatus } from "@/lib/paths/types";

function statusBadgeClass(status: PathStatus): string {
  switch (status) {
    case "active":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-100";
    case "completed":
      return "border-violet-500/40 bg-violet-500/15 text-violet-100";
    case "archived":
      return "border-slate-500/40 bg-slate-500/15 text-slate-200";
    default:
      return "border-amber-500/40 bg-amber-500/15 text-amber-100";
  }
}

export function PathListPanel({
  paths,
  selectedPathId,
  onSelect
}: {
  paths: BranchingPath[];
  selectedPathId: string;
  onSelect: (id: string) => void;
}) {
  if (paths.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No paths yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {paths.map((path) => (
        <button
          className={`w-full rounded-lg border px-3 py-3 text-left transition ${
            selectedPathId === path.id
              ? "border-violet-500/45 bg-violet-500/15"
              : "border-slate-700/25 bg-slate-950/30 hover:bg-slate-900/50"
          }`}
          key={path.id}
          onClick={() => onSelect(path.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-foreground">{path.name}</span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(path.status)}`}
            >
              {path.status}
            </span>
          </div>
          {path.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{path.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full border border-slate-600/40 bg-slate-900/50 px-2 py-0.5 text-[10px] text-slate-300">
              {path.nodes.length} nodes
            </span>
            {path.tags.slice(0, 2).map((tag) => (
              <span
                className="rounded-full border border-violet-500/25 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
