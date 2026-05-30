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

export type DndRollMode = "normal" | "advantage" | "disadvantage";

export function rollDndWithAdvantage(
  expression: string,
  mode: Exclude<DndRollMode, "normal">,
  random: RandomSource = defaultRandom
): DndRollResult {
  const parsed = parseDndExpression(expression);
  const normalized = expression.replace(/\s+/g, "").toLowerCase();

  if (parsed.kind === "flat") {
    return rollDndExpression(expression, random);
  }

  if (parsed.dieCount !== 1 || parsed.dieSize !== 20) {
    return rollDndExpression(expression, random);
  }

  const first = rollDie(20, random);
  const second = rollDie(20, random);
  const chosen = mode === "advantage" ? Math.max(first, second) : Math.min(first, second);
  const total = chosen + parsed.modifier;
  const modifierText = formatModifier(parsed.modifier);

  return {
    expression: `1d20${modifierText}`,
    total,
    dice: [first, second],
    dieCount: 1,
    dieSize: 20,
    modifier: parsed.modifier,
    details: `[${first}, ${second}] keep ${chosen}${modifierText ? ` ${modifierText}` : ""} = ${total}`
  };
}
