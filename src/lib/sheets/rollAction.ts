import { createRollLogEntry } from "@/lib/dice/log";
import { rollDndExpression, rollDndWithAdvantage } from "@/lib/dice/dnd";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { DndRollResult } from "@/lib/dice/types";
import { resolveDndCheckAction } from "@/lib/sheets/dnd";
import { buildNwodPoolExpression, resolveNwodCheckPool } from "@/lib/sheets/nwod";
import type { GameSystem, RollLogEntry, SheetAction, SystemSheet } from "@/lib/sheets/types";

export type DndRollMode = "normal" | "advantage" | "disadvantage";

export function formatDndRollLog(
  result: DndRollResult,
  mode: DndRollMode = "normal"
): Pick<RollLogEntry, "resultText" | "details"> {
  const modifierLabel =
    result.modifier >= 0 ? `+${result.modifier}` : `${result.modifier}`;

  if (result.dieSize === 20 && result.dice.length >= 1) {
    const modeNote =
      mode === "advantage"
        ? " (advantage)"
        : mode === "disadvantage"
          ? " (disadvantage)"
          : "";
    const diceNote =
      result.dice.length > 1
        ? `d20: [${result.dice.join(", ")}]${modeNote}, modifier: ${modifierLabel}`
        : `d20: ${result.dice[0]}, modifier: ${modifierLabel}`;

    return {
      resultText: `${result.expression} → ${result.total}`,
      details: diceNote
    };
  }

  return {
    resultText: `${result.expression} → ${result.total}`,
    details: result.details
  };
}

export function formatNwodRollLog(
  label: string,
  pool: number,
  result: ReturnType<typeof rollNwodPool>
): Pick<RollLogEntry, "resultText" | "details"> {
  const poolLabel = result.expression === "chance die" ? label : label;
  const successText = result.dramaticFailure
    ? "dramatic failure"
    : `${result.successes} ${result.successes === 1 ? "success" : "successes"}`;

  const rollPreview =
    result.rolls.length > 8
      ? `${result.rolls.slice(0, 8).join(", ")}...`
      : result.rolls.join(", ");

  const detailsParts = [`Rolls: ${rollPreview}`];
  if (result.explodedRolls.length > 0) {
    detailsParts.push(`Exploded: ${result.explodedRolls.join(", ")}`);
  }
  if (result.roteRerolls.length > 0) {
    detailsParts.push(`Rote: ${result.roteRerolls.join(", ")}`);
  }

  return {
    resultText: `Pool ${pool} → ${successText}`,
    details: detailsParts.join("\n")
  };
}

export function executeSheetAction(
  sheet: SystemSheet,
  action: SheetAction,
  characterName: string,
  selectedSystem: GameSystem,
  options?: { dndRollMode?: DndRollMode }
): RollLogEntry {
  const dndRollMode = options?.dndRollMode ?? "normal";

  if (action.type === "note") {
    return createRollLogEntry({
      kind: "note",
      characterName,
      actionLabel: action.label,
      system: selectedSystem,
      resultText: action.label,
      details: action.notes
    });
  }

  if (action.type === "dnd-roll") {
    const result =
      dndRollMode === "normal"
        ? rollDndExpression(action.roll)
        : rollDndWithAdvantage(action.roll, dndRollMode);
    const formatted = formatDndRollLog(result, dndRollMode);
    return createRollLogEntry({
      kind: "roll",
      characterName,
      actionLabel: action.label,
      system: "dnd5e",
      expression: result.expression,
      ...formatted
    });
  }

  if (action.type === "dnd-check") {
    const roll = resolveDndCheckAction(sheet, action);
    const result =
      dndRollMode === "normal"
        ? rollDndExpression(roll)
        : rollDndWithAdvantage(roll, dndRollMode);
    const formatted = formatDndRollLog(result, dndRollMode);
    return createRollLogEntry({
      kind: "roll",
      characterName,
      actionLabel: action.label,
      system: "dnd5e",
      expression: result.expression,
      ...formatted
    });
  }

  if (action.type === "nwod-check") {
    const built = buildNwodPoolExpression({
      sheet,
      attribute: action.attribute,
      skill: action.skill,
      modifier: action.modifier ?? 0
    });
    const pool = resolveNwodCheckPool(sheet, action);
    const result = rollNwodPool({
      pool: built.chanceDie ? 0 : pool,
      again: action.again,
      rote: action.rote,
      chanceDie: action.chanceDie ?? built.chanceDie
    });
    const formatted = formatNwodRollLog(built.label, built.chanceDie ? 0 : pool, result);
    return createRollLogEntry({
      kind: "roll",
      characterName,
      actionLabel: built.label,
      system: "nwod",
      expression: built.label,
      ...formatted
    });
  }

  const result = rollNwodPool({
    pool: action.pool,
    again: action.again,
    rote: action.rote,
    chanceDie: action.chanceDie
  });
  const formatted = formatNwodRollLog(action.label, action.pool, result);
  return createRollLogEntry({
    kind: "roll",
    characterName,
    actionLabel: action.label,
    system: "nwod",
    expression: action.label,
    ...formatted
  });
}
