import type {
  NwodAgain,
  NwodRollOptions,
  NwodRollResult,
  NwodSequenceRollResult,
  RandomSource
} from "./types";

const defaultRandom: RandomSource = Math.random;
const successThreshold = 8;
const maxExplosions = 1000;

function rollD10(random: RandomSource): number {
  return Math.floor(random() * 10) + 1;
}

export function randomSourceFromD10Sequence(sequence: number[]): RandomSource {
  let index = 0;
  return () => {
    const next = sequence[index];
    index += 1;
    if (!Number.isInteger(next) || next < 1 || next > 10) {
      throw new Error("NWoD dice sequence exhausted or contains a non-d10 value.");
    }
    return (next - 1) / 10;
  };
}

export function rollNwodPoolWithSequence(
  options: NwodRollOptions,
  sequence: number[]
): NwodSequenceRollResult {
  const consumedRolls: number[] = [];
  const random = randomSourceFromD10Sequence(sequence);
  const result = rollNwodPool(options, () => {
    const value = rollD10(random);
    consumedRolls.push(value);
    return (value - 1) / 10;
  });

  return {
    ...result,
    consumedRolls
  };
}

function shouldExplode(roll: number, again: NwodAgain): boolean {
  return again !== null && roll >= again;
}

function rollWithAgain(
  again: NwodAgain,
  random: RandomSource
): { first: number; all: number[]; exploded: number[] } {
  const first = rollD10(random);
  const all = [first];
  const exploded: number[] = [];
  let current = first;
  let guard = 0;

  while (shouldExplode(current, again) && guard < maxExplosions) {
    current = rollD10(random);
    all.push(current);
    exploded.push(current);
    guard += 1;
  }

  return { first, all, exploded };
}

function describeAgain(again: NwodAgain): string {
  return again === null ? "no-again" : `${again}-again`;
}

export function rollNwodPool(
  options: NwodRollOptions,
  random: RandomSource = defaultRandom
): NwodRollResult {
  const again = options.again === undefined ? 10 : options.again;
  const pool = Math.max(0, Math.floor(options.pool));

  if (options.chanceDie || pool <= 0) {
    const roll = rollD10(random);
    const successes = roll === 10 ? 1 : 0;
    const dramaticFailure = roll === 1;

    return {
      expression: "chance die",
      successes,
      rolls: [roll],
      explodedRolls: [],
      roteRerolls: [],
      dramaticFailure,
      details:
        roll === 10
          ? "Chance die: 10 = 1 success"
          : roll === 1
            ? "Chance die: 1 = dramatic failure"
            : `Chance die: ${roll} = failure`
    };
  }

  const initial = Array.from({ length: pool }, () => rollWithAgain(again, random));
  const rolls = initial.flatMap((entry) => entry.all);
  const explodedRolls = initial.flatMap((entry) => entry.exploded);
  const failedInitialDice = initial.filter((entry) => entry.first < successThreshold).length;
  const roteResults = options.rote
    ? Array.from({ length: failedInitialDice }, () => rollWithAgain(again, random))
    : [];
  const roteRerolls = roteResults.flatMap((entry) => entry.all);
  const roteExplosions = roteResults.flatMap((entry) => entry.exploded);
  const allScoredRolls = [...rolls, ...roteRerolls];
  const successes = allScoredRolls.filter((roll) => roll >= successThreshold).length;
  const expression = `${pool}d10 ${describeAgain(again)}${options.rote ? " rote" : ""}`;
  const detailsParts = [
    `Rolls [${rolls.join(", ")}]`,
    explodedRolls.length > 0 ? `explosions [${explodedRolls.join(", ")}]` : null,
    options.rote ? `rote rerolls [${roteRerolls.join(", ") || "none"}]` : null,
    roteExplosions.length > 0 ? `rote explosions [${roteExplosions.join(", ")}]` : null,
    `${successes} ${successes === 1 ? "success" : "successes"}`
  ].filter(Boolean);

  return {
    expression,
    successes,
    rolls,
    explodedRolls: [...explodedRolls, ...roteExplosions],
    roteRerolls,
    dramaticFailure: false,
    details: detailsParts.join("; ")
  };
}
