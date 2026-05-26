"use client";

import { useState } from "react";
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

export function ActionButton({ action, character, onRoll }: ActionButtonProps) {
  const [error, setError] = useState<string | null>(null);

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
        className="group w-full rounded-md border border-white/10 bg-panel-soft px-4 py-3 text-left transition hover:border-white/20 hover:bg-zinc-700/60"
        onClick={handleClick}
        type="button"
      >
        <span className="block text-sm font-semibold text-white">{action.label}</span>
        <span className="mt-1 block text-xs text-zinc-400">{getActionExpression(action)}</span>
        {action.notes ? (
          <span className="mt-2 block text-xs leading-5 text-zinc-500">{action.notes}</span>
        ) : null}
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
