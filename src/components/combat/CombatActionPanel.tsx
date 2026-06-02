"use client";

import { Dices, FileText, Package, Target } from "lucide-react";
import type { CombatAction, Combatant } from "@/lib/combat/types";
import { canAct } from "@/lib/combat/combatEngine";

type ActionGroup = {
  id: "attacks" | "utility" | "items" | "notes";
  label: string;
  actions: CombatAction[];
};

function isItemPower(action: CombatAction): boolean {
  return Boolean(action.metadata?.itemPowerId);
}

function isNote(action: CombatAction): boolean {
  return action.kind === "utility" && action.action.type === "note";
}

function getActionTags(action: CombatAction): string[] {
  const tags = action.kind !== "utility" ? ["Auto Damage"] : isNote(action) ? ["Note"] : ["Roll Only"];
  if (action.metadata?.itemPowerId) tags.push("Item Power");
  if (action.metadata?.itemPowerConsumesItem) tags.push("Consumes Item");
  if (typeof action.metadata?.itemPowerChargeMax === "number") tags.push("Consumes Charge");
  return tags;
}

function groupActions(actions: CombatAction[]): ActionGroup[] {
  const items = actions.filter(isItemPower);
  const notes = actions.filter(isNote).filter((action) => !isItemPower(action));
  const attacks = actions.filter((action) => action.kind !== "utility" && !isItemPower(action));
  const utility = actions.filter(
    (action) => action.kind === "utility" && !isItemPower(action) && !isNote(action)
  );

  return [
    { id: "attacks", label: "Attacks", actions: attacks },
    { id: "utility", label: "Utility Rolls", actions: utility },
    { id: "items", label: "Item Powers", actions: items },
    { id: "notes", label: "Notes", actions: notes }
  ];
}

function groupIcon(id: ActionGroup["id"]) {
  if (id === "attacks") return <Target className="h-4 w-4" aria-hidden="true" />;
  if (id === "items") return <Package className="h-4 w-4" aria-hidden="true" />;
  if (id === "notes") return <FileText className="h-4 w-4" aria-hidden="true" />;
  return <Dices className="h-4 w-4" aria-hidden="true" />;
}

export function CombatActionPanel({
  activeCombatant,
  canDeclare,
  canResolve,
  selectedTargetId,
  onDeclareAction,
  onResolveAction,
  onRollUtilityAction
}: {
  activeCombatant: Combatant | null;
  canDeclare: boolean;
  canResolve: boolean;
  selectedTargetId: string;
  onDeclareAction: (actionId: string) => void | Promise<void>;
  onResolveAction: (actionId: string) => void | Promise<void>;
  onRollUtilityAction?: (action: CombatAction) => void | Promise<void>;
}) {
  const actions = activeCombatant?.combatActions ?? [];
  const grouped = groupActions(actions);
  const canUseActions = Boolean(activeCombatant && canAct(activeCombatant));

  if (!activeCombatant) {
    return <p className="mt-3 text-sm text-muted-foreground">No active combatant.</p>;
  }

  if (!canUseActions) {
    return <p className="mt-3 text-sm text-muted-foreground">This combatant cannot act right now.</p>;
  }

  return (
    <div className="mt-3 space-y-4">
      {grouped.map((group) => (
        <div className="space-y-2" key={group.id}>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {groupIcon(group.id)}
            {group.label}
          </div>
          {group.actions.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-700/25 p-3 text-xs text-muted-foreground">
              None available.
            </p>
          ) : (
            <div className="grid gap-2">
              {group.actions.map((action) => {
                const isAutoDamage = action.kind !== "utility";
                const requiresTarget = isAutoDamage;
                const missingTarget = requiresTarget && !selectedTargetId;
                return (
                  <div
                    className="rounded-md border border-slate-700/25 bg-slate-900/45 p-3"
                    key={action.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        {action.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">{action.notes}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {getActionTags(action).map((tag) => (
                            <span
                              className="rounded border border-slate-600/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isAutoDamage ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-purple-500/35 bg-purple-600/20 px-3 text-xs font-semibold text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canResolve || missingTarget}
                            onClick={() => void onResolveAction(action.id)}
                            type="button"
                          >
                            <Dices className="h-4 w-4" aria-hidden="true" />
                            Resolve
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!onRollUtilityAction}
                            onClick={() => void onRollUtilityAction?.(action)}
                            type="button"
                          >
                            <Dices className="h-4 w-4" aria-hidden="true" />
                            Roll
                          </button>
                        )}
                        {canDeclare ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/35 bg-cyan-700/20 px-3 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={missingTarget}
                            onClick={() => void onDeclareAction(action.id)}
                            type="button"
                          >
                            <Target className="h-4 w-4" aria-hidden="true" />
                            Declare
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {missingTarget ? (
                      <p className="mt-2 text-xs text-amber-100">Select a target before resolving.</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
