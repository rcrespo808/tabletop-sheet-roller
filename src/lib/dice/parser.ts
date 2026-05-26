import type { ParsedDndExpression } from "./types";

export function parseDndExpression(expression: string): ParsedDndExpression {
  const normalized = expression.replace(/\s+/g, "").toLowerCase();

  if (!normalized) {
    throw new Error("Enter a dice expression.");
  }

  const flatMatch = normalized.match(/^([+-]?\d+)$/);
  if (flatMatch) {
    return {
      kind: "flat",
      modifier: Number(flatMatch[1])
    };
  }

  const diceMatch = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!diceMatch) {
    throw new Error("Use XdY, XdY+Z, XdY-Z, d20+5, or a flat modifier.");
  }

  const dieCount = diceMatch[1] ? Number(diceMatch[1]) : 1;
  const dieSize = Number(diceMatch[2]);
  const modifier = diceMatch[3] ? Number(diceMatch[3]) : 0;

  if (!Number.isInteger(dieCount) || dieCount < 1 || dieCount > 100) {
    throw new Error("Dice count must be between 1 and 100.");
  }

  if (!Number.isInteger(dieSize) || dieSize < 2 || dieSize > 1000) {
    throw new Error("Die size must be between 2 and 1000.");
  }

  return {
    kind: "dice",
    dieCount,
    dieSize,
    modifier
  };
}

export function formatModifier(modifier: number): string {
  if (modifier === 0) {
    return "";
  }

  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}
