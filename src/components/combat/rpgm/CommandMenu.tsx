"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ActionSubmenu } from "@/components/combat/rpgm/ActionSubmenu";
import { GlassPanel } from "@/components/GlassPanel";
import { canAct } from "@/lib/combat/combatEngine";
import type { CombatAction, Combatant } from "@/lib/combat/types";
import {
  RPG_COMMANDS,
  type RpgCommandId,
  actionRequiresTarget,
  getActionBadges,
  getActionsForCommand,
  getBuiltinCommand,
  getCommandActionCount,
  isBuiltinCommand
} from "@/lib/combat/rpgmDisplay";
import type { BuiltinCommandId } from "@/lib/combat/rpgmActionCatalog";

type MenuPhase = "root" | "list" | "confirm";

export function CommandMenu({
  activeCombatant,
  canDeclare,
  selectedTargetId,
  onDeclareAction,
  onDeclareBuiltIn
}: {
  activeCombatant: Combatant | null;
  canDeclare: boolean;
  selectedTargetId: string | null;
  onDeclareAction?: (actionId: string, targetId?: string | null) => void;
  onDeclareBuiltIn?: (command: BuiltinCommandId, targetId?: string | null) => void;
}) {
  const [phase, setPhase] = useState<MenuPhase>("root");
  const [activeCommand, setActiveCommand] = useState<RpgCommandId | null>(null);
  const [selectedAction, setSelectedAction] = useState<CombatAction | null>(null);

  const actions = activeCombatant?.combatActions ?? [];
  const canUseActions = Boolean(activeCombatant && canAct(activeCombatant));

  function resetToRoot() {
    setPhase("root");
    setActiveCommand(null);
    setSelectedAction(null);
  }

  function openCommand(commandId: RpgCommandId) {
    setActiveCommand(commandId);
    setSelectedAction(null);
    if (isBuiltinCommand(commandId)) {
      setPhase("confirm");
      return;
    }
    setPhase("list");
  }

  function openActionConfirm(action: CombatAction) {
    setSelectedAction(action);
    setPhase("confirm");
  }

  const commandLabel =
    activeCommand && RPG_COMMANDS.find((entry) => entry.id === activeCommand)?.label;

  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Command Menu
      </h2>

      {!activeCombatant ? (
        <p className="mt-4 text-sm text-muted-foreground">No active combatant.</p>
      ) : !canUseActions ? (
        <p className="mt-4 text-sm text-muted-foreground">This combatant cannot act right now.</p>
      ) : (
        <>
          {phase !== "root" ? (
            <nav aria-label="Command breadcrumbs" className="mt-3 flex flex-wrap items-center gap-1 text-xs">
              <button
                className="font-semibold text-cyan-200 hover:underline"
                onClick={resetToRoot}
                type="button"
              >
                Commands
              </button>
              {commandLabel ? (
                <>
                  <span className="text-muted-foreground">/</span>
                  <button
                    className={`font-semibold hover:underline ${
                      phase === "list" ? "text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      if (isBuiltinCommand(activeCommand!)) {
                        setPhase("confirm");
                      } else {
                        setPhase("list");
                        setSelectedAction(null);
                      }
                    }}
                    type="button"
                  >
                    {commandLabel}
                  </button>
                </>
              ) : null}
              {phase === "confirm" && selectedAction ? (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-semibold text-foreground">{selectedAction.label}</span>
                </>
              ) : null}
            </nav>
          ) : null}

          {phase === "root" ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RPG_COMMANDS.map((command) => {
                const count = getCommandActionCount(actions, command.id);
                const empty = !isBuiltinCommand(command.id) && count === 0;

                return (
                  <button
                    className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                      empty
                        ? "border-slate-700/25 bg-slate-950/30 text-muted-foreground"
                        : "border-slate-600/40 bg-slate-900/50 text-slate-100 hover:border-red-500/40 hover:bg-red-950/30"
                    }`}
                    key={command.id}
                    onClick={() => openCommand(command.id)}
                    type="button"
                  >
                    {command.label}
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      {isBuiltinCommand(command.id) ? "Declare" : empty ? "Empty" : `${count} action${count === 1 ? "" : "s"}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {phase === "list" && activeCommand && !isBuiltinCommand(activeCommand) ? (
            <ActionSubmenu
              actions={getActionsForCommand(actions, activeCommand)}
              commandId={activeCommand}
              commandLabel={commandLabel ?? ""}
              onBack={resetToRoot}
              onSelectAction={openActionConfirm}
            />
          ) : null}

          {phase === "confirm" && activeCommand ? (
            <ConfirmPanel
              activeCommand={activeCommand}
              canDeclare={canDeclare}
              commandLabel={commandLabel ?? ""}
              onBack={() => {
                if (isBuiltinCommand(activeCommand)) {
                  resetToRoot();
                } else {
                  setPhase("list");
                  setSelectedAction(null);
                }
              }}
              onDeclareAction={onDeclareAction}
              onDeclareBuiltIn={onDeclareBuiltIn}
              selectedAction={selectedAction}
              selectedTargetId={selectedTargetId}
            />
          ) : null}
        </>
      )}
    </GlassPanel>
  );
}

function ConfirmPanel({
  activeCommand,
  canDeclare,
  commandLabel,
  onBack,
  onDeclareAction,
  onDeclareBuiltIn,
  selectedAction,
  selectedTargetId
}: {
  activeCommand: RpgCommandId;
  canDeclare: boolean;
  commandLabel: string;
  onBack: () => void;
  onDeclareAction?: (actionId: string, targetId?: string | null) => void;
  onDeclareBuiltIn?: (command: BuiltinCommandId, targetId?: string | null) => void;
  selectedAction: CombatAction | null;
  selectedTargetId: string | null;
}) {
  if (isBuiltinCommand(activeCommand)) {
    const builtin = getBuiltinCommand(activeCommand);
    if (!builtin) return null;

    return (
      <div className="mt-4 rounded-lg border border-slate-700/30 bg-slate-950/50 p-4">
        <button
          className="mb-3 inline-flex h-8 items-center gap-1 rounded border border-slate-600/40 px-2 text-xs font-semibold text-slate-200"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <p className="text-lg font-semibold text-foreground">{builtin.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">{builtin.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          No automatic rules yet — this sends a declaration to the GM.
        </p>
        <button
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-cyan-500/35 bg-cyan-700/20 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canDeclare}
          onClick={() => void onDeclareBuiltIn?.(activeCommand, selectedTargetId ?? undefined)}
          type="button"
        >
          Declare {builtin.label}
        </button>
        {!canDeclare ? (
          <p className="mt-2 text-xs text-muted-foreground">
            You cannot declare for this combatant right now.
          </p>
        ) : null}
      </div>
    );
  }

  if (!selectedAction) return null;

  const requiresTarget = actionRequiresTarget(selectedAction);
  const missingTarget = requiresTarget && !selectedTargetId;
  const badges = getActionBadges(selectedAction);

  return (
    <div className="mt-4 rounded-lg border border-slate-700/30 bg-slate-950/50 p-4">
      <button
        className="mb-3 inline-flex h-8 items-center gap-1 rounded border border-slate-600/40 px-2 text-xs font-semibold text-slate-200"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back to {commandLabel}
      </button>
      <p className="text-lg font-semibold text-foreground">{selectedAction.label}</p>
      {selectedAction.notes ? (
        <p className="mt-2 text-sm text-muted-foreground">{selectedAction.notes}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1">
        {badges.map((tag) => (
          <span
            className="rounded border border-slate-600/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
      {missingTarget ? (
        <p className="mt-4 text-sm text-amber-100">Select a target before declaring this attack.</p>
      ) : null}
      <button
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-cyan-500/35 bg-cyan-700/20 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canDeclare || missingTarget}
        onClick={() =>
          void onDeclareAction?.(selectedAction.id, selectedTargetId ?? undefined)
        }
        type="button"
      >
        Declare {selectedAction.label}
      </button>
      {!canDeclare ? (
        <p className="mt-2 text-xs text-muted-foreground">
          You cannot declare for this combatant right now.
        </p>
      ) : null}
    </div>
  );
}
