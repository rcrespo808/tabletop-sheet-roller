import type { LootRollResult, LootTable } from "@/lib/loot/types";

export function rollLootTable(table: LootTable): LootRollResult {
  const validEntries = table.entries.filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);
  const totalWeight = validEntries.reduce((total, entry) => total + entry.weight, 0);

  if (validEntries.length === 0 || totalWeight <= 0) {
    throw new Error(`${table.name} has no loot entries with weight greater than 0.`);
  }

  const roll = Math.random() * totalWeight;
  let cursor = 0;

  for (const entry of validEntries) {
    cursor += entry.weight;
    if (roll < cursor) {
      return {
        entry,
        roll,
        threshold: cursor,
        totalWeight,
        validEntryCount: validEntries.length
      };
    }
  }

  const fallback = validEntries[validEntries.length - 1];
  return {
    entry: fallback,
    roll,
    threshold: totalWeight,
    totalWeight,
    validEntryCount: validEntries.length
  };
}

export function formatLootRollDetails(result: LootRollResult): string {
  return [
    `Weighted roll: ${result.roll.toFixed(2)} / ${result.totalWeight}`,
    `Selected threshold: ${result.threshold}`,
    `Eligible entries: ${result.validEntryCount}`
  ].join("\n");
}
