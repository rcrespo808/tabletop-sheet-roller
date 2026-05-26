import { formatModifier, parseDndExpression } from "./parser";
import type { DndRollResult, RandomSource } from "./types";

const defaultRandom: RandomSource = Math.random;

function rollDie(size: number, random: RandomSource): number {
  return Math.floor(random() * size) + 1;
}

export function rollDndExpression(
  expression: string,
  random: RandomSource = defaultRandom
): DndRollResult {
  const parsed = parseDndExpression(expression);
  const normalized = expression.replace(/\s+/g, "").toLowerCase();

  if (parsed.kind === "flat") {
    return {
      expression: normalized,
      total: parsed.modifier,
      dice: [],
      dieCount: 0,
      dieSize: null,
      modifier: parsed.modifier,
      details: `Flat modifier ${parsed.modifier}`
    };
  }

  const dice = Array.from({ length: parsed.dieCount }, () =>
    rollDie(parsed.dieSize, random)
  );
  const diceTotal = dice.reduce((sum, roll) => sum + roll, 0);
  const total = diceTotal + parsed.modifier;
  const modifierText = formatModifier(parsed.modifier);

  return {
    expression: `${parsed.dieCount}d${parsed.dieSize}${modifierText}`,
    total,
    dice,
    dieCount: parsed.dieCount,
    dieSize: parsed.dieSize,
    modifier: parsed.modifier,
    details: `[${dice.join(", ")}]${modifierText ? ` ${modifierText}` : ""} = ${total}`
  };
}
