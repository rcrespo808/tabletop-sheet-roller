"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Shield, Zap } from "lucide-react";
import { createRollLogEntry } from "@/lib/dice/log";
import { rollDndExpression } from "@/lib/dice/dnd";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { CharacterSheet, RollLogEntry, SheetAction } from "@/lib/sheets/types";

type ActionButtonProps = {
  action: SheetAction;
  character: CharacterSheet;
  onRoll: (entry: RollLogEntry) => void;
};

function getActionExpression(action: SheetAction): string {
  if (action.type === "dnd-roll") {
    return action.roll;
  }

  const again = action.again === undefined ? 10 : action.again;
  const againText = again === null ? "no-again" : `${again}-again`;
  return `${action.pool}d10 ${againText}${action.rote ? " rote" : ""}${
    action.chanceDie ? " chance" : ""
  }`;
}

function getActionVisual(action: SheetAction) {
  const label = action.label.toLowerCase();

  if (label.includes("save") || label.includes("ward")) {
    return {
      icon: Shield,
      className: "border-blue-500/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
    };
  }

  if (
    label.includes("silence") ||
    label.includes("resonance") ||
    label.includes("projection") ||
    label.includes("hijack") ||
    label.includes("emotional")
  ) {
    return {
      icon: BookOpen,
      className:
        "border-purple-500/40 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
    };
  }

  if (action.type === "dnd-roll") {
    return {
      icon: Zap,
      className: "border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
    };
  }

  return {
    icon: ChevronDown,
    className: "border-green-500/40 bg-green-500/15 text-green-100 hover:bg-green-500/25"
  };
}

export function ActionButton({ action, character, onRoll }: ActionButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const visual = getActionVisual(action);
  const Icon = visual.icon;

  function handleClick() {
    setError(null);

    try {
      if (action.type === "dnd-roll") {
        const result = rollDndExpression(action.roll);
        onRoll(
          createRollLogEntry({
            characterName: character.name,
            actionLabel: action.label,
            system: "dnd5e",
            expression: result.expression,
            resultText: `Total ${result.total}`,
            details: result.details
          })
        );
        return;
      }

      const result = rollNwodPool({
        pool: action.pool,
        again: action.again,
        rote: action.rote,
        chanceDie: action.chanceDie
      });
      onRoll(
        createRollLogEntry({
          characterName: character.name,
          actionLabel: action.label,
          system: "nwod",
          expression: result.expression,
          resultText: result.dramaticFailure
            ? "Dramatic failure"
            : `${result.successes} ${result.successes === 1 ? "success" : "successes"}`,
          details: result.details
        })
      );
    } catch (rollError) {
      setError(rollError instanceof Error ? rollError.message : "Roll failed.");
    }
  }

  return (
    <div>
      <button
        className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${visual.className}`}
        onClick={handleClick}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950/35">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{action.label}</span>
          <span className="mt-1 block text-xs opacity-75">{getActionExpression(action)}</span>
          {action.notes ? (
            <span className="mt-2 block text-xs leading-5 opacity-70">{action.notes}</span>
          ) : null}
        </span>
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
