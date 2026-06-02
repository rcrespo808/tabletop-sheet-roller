"use client";

import { ChevronLeft } from "lucide-react";
import type { CombatAction } from "@/lib/combat/types";
import {
  actionRequiresTarget,
  getActionBadges,
  splitSkillActions
} from "@/lib/combat/rpgmDisplay";
import type { RpgCommandId } from "@/lib/combat/rpgmDisplay";

function ActionListItem({
  action,
  canDeclare,
  missingTarget,
  onSelect
}: {
  action: CombatAction;
  canDeclare: boolean;
  missingTarget: boolean;
  onSelect: () => void;
}) {
  const badges = getActionBadges(action);

  return (
    <li>
      <button
        className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-700/25 bg-slate-900/45 px-3 py-3 text-left transition hover:border-slate-500/40"
        onClick={onSelect}
        type="button"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{action.label}</p>
          {action.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.notes}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.map((tag) => (
              <span
                className="rounded border border-slate-600/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-cyan-200">
          {canDeclare && !missingTarget ? "Choose" : "View"}
        </span>
      </button>
    </li>
  );
}

export function ActionSubmenu({
  actions,
  commandId,
  commandLabel,
  onBack,
  onSelectAction
}: {
  actions: CombatAction[];
  commandId: RpgCommandId;
  commandLabel: string;
  onBack: () => void;
  onSelectAction: (action: CombatAction) => void;
}) {
  const { checks, notes } = splitSkillActions(actions);

  return (
    <div className="mt-4 rounded-lg border border-slate-700/30 bg-slate-950/50 p-3">
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-8 items-center gap-1 rounded border border-slate-600/40 px-2 text-xs font-semibold text-slate-200"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <p className="text-sm font-semibold text-foreground">{commandLabel}</p>
      </div>

      {actions.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-slate-700/25 p-3 text-xs text-muted-foreground">
          No actions in this category. Add sheet actions with{" "}
          <code className="text-[10px]">metadata.combatCategory</code> to refine grouping.
        </p>
      ) : commandId === "skills" && (checks.length > 0 || notes.length > 0) ? (
        <div className="mt-3 space-y-4">
          {checks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Checks</p>
              <ul className="mt-2 space-y-2">
                {checks.map((action) => (
                  <ActionListItem
                    action={action}
                    canDeclare
                    key={action.id}
                    missingTarget={false}
                    onSelect={() => onSelectAction(action)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {notes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
              <ul className="mt-2 space-y-2">
                {notes.map((action) => (
                  <ActionListItem
                    action={action}
                    canDeclare
                    key={action.id}
                    missingTarget={false}
                    onSelect={() => onSelectAction(action)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {actions.map((action) => (
            <ActionListItem
              action={action}
              canDeclare
              key={action.id}
              missingTarget={actionRequiresTarget(action)}
              onSelect={() => onSelectAction(action)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
