import type {
  CharacterProfile,
  GameSystem,
  InventoryItemPowerReset,
  SheetAction,
  SystemSheet
} from "@/lib/sheets/types";
import { isDnd5eSheet } from "@/lib/sheets/types";

export type RestType = "short_rest" | "long_rest";

function shouldResetCharge(reset: InventoryItemPowerReset | undefined, restType: RestType): boolean {
  if (!reset || reset === "never" || reset === "session") return false;
  if (reset === "short_rest") return true;
  if (reset === "long_rest") return restType === "long_rest";
  return false;
}

export function resetInventoryPowerCharges(
  character: CharacterProfile,
  restType: RestType
): CharacterProfile {
  const inventory = (character.inventory ?? []).map((item) => {
    if (!item.powers?.length) return item;

    return {
      ...item,
      powers: item.powers.map((power) => {
        if (!power.charges || !shouldResetCharge(power.charges.reset, restType)) {
          return power;
        }
        return {
          ...power,
          charges: {
            ...power.charges,
            current: power.charges.max
          }
        };
      })
    };
  });

  return { ...character, inventory };
}

function resetActionCharges(action: SheetAction, restType: RestType): SheetAction {
  const metadata = action.metadata;
  if (!metadata) return action;

  const reset = metadata.chargeReset as InventoryItemPowerReset | undefined;
  if (!shouldResetCharge(reset, restType)) return action;

  const max =
    typeof metadata.chargeMax === "number" ? metadata.chargeMax : metadata.chargesMax;
  if (typeof max !== "number") return action;

  return {
    ...action,
    metadata: {
      ...metadata,
      chargeCurrent: max,
      chargesCurrent: max
    }
  };
}

export function resetSheetActionCharges(
  character: CharacterProfile,
  restType: RestType
): CharacterProfile {
  const sheets = { ...character.sheets };

  for (const system of Object.keys(sheets) as GameSystem[]) {
    const sheet = sheets[system];
    if (!sheet) continue;

    const updated: SystemSheet = {
      ...sheet,
      actions: sheet.actions.map((action) => resetActionCharges(action, restType))
    };
    sheets[system] = updated;
  }

  return { ...character, sheets };
}

function restoreDndHp(character: CharacterProfile): CharacterProfile {
  const sheets = { ...character.sheets };
  const dndSheet = sheets.dnd5e;

  if (!dndSheet || !isDnd5eSheet(dndSheet)) return character;

  const maxHp = dndSheet.stats?.maxHp;
  if (typeof maxHp !== "number") return character;

  sheets.dnd5e = {
    ...dndSheet,
    stats: {
      ...dndSheet.stats,
      currentHp: maxHp
    }
  };

  return { ...character, sheets };
}

export function applyShortRest(character: CharacterProfile): CharacterProfile {
  let updated = resetInventoryPowerCharges(character, "short_rest");
  updated = resetSheetActionCharges(updated, "short_rest");
  return updated;
}

export function applyLongRest(character: CharacterProfile): CharacterProfile {
  let updated = resetInventoryPowerCharges(character, "long_rest");
  updated = resetSheetActionCharges(updated, "long_rest");
  updated = restoreDndHp(updated);
  return updated;
}

export function describeRestEffects(
  character: CharacterProfile,
  restType: RestType
): string[] {
  const effects: string[] = [];

  if (restType === "long_rest") {
    const dndSheet = character.sheets.dnd5e;
    if (dndSheet && isDnd5eSheet(dndSheet) && typeof dndSheet.stats?.maxHp === "number") {
      effects.push(`Restore HP to ${dndSheet.stats.maxHp} (D&D sheet)`);
    }
  } else {
    effects.push("HP unchanged (no hit dice system yet)");
  }

  const powerResets = new Set<string>();
  for (const item of character.inventory ?? []) {
    for (const power of item.powers ?? []) {
      if (power.charges && shouldResetCharge(power.charges.reset, restType)) {
        powerResets.add(`${item.name}: ${power.label}`);
      }
    }
  }

  if (powerResets.size > 0) {
    effects.push(`Reset ${powerResets.size} item power charge(s)`);
  } else {
    effects.push("No item powers reset for this rest type");
  }

  return effects;
}
