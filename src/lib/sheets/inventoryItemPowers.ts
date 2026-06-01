import { executeSheetAction } from "@/lib/sheets/rollAction";
import type {
  CharacterProfile,
  GameSystem,
  InventoryItem,
  InventoryItemPower,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";

export type ExecuteInventoryItemPowerArgs = {
  character: CharacterProfile;
  system: GameSystem;
  sheet: SystemSheet;
  item: InventoryItem;
  power: InventoryItemPower;
};

export type ExecuteInventoryItemPowerResult = {
  logEntry: RollLogEntry;
  updatedCharacter?: CharacterProfile;
};

function appendDetails(entry: RollLogEntry, details: string): RollLogEntry {
  return {
    ...entry,
    details: [entry.details, details].filter(Boolean).join("\n")
  };
}

function decrementPowerCharge(power: InventoryItemPower): InventoryItemPower {
  if (!power.charges) return power;
  return {
    ...power,
    charges: {
      ...power.charges,
      current: Math.max(0, power.charges.current - 1)
    }
  };
}

export function executeInventoryItemPower({
  character,
  system,
  sheet,
  item,
  power
}: ExecuteInventoryItemPowerArgs): ExecuteInventoryItemPowerResult {
  if (item.quantity <= 0) {
    throw new Error(`${item.name} is not available.`);
  }

  if (power.charges && power.charges.current <= 0) {
    throw new Error(`${power.label} has no charges remaining.`);
  }

  const actionLabel = `${item.name}: ${power.label}`;
  const logEntry = executeSheetAction(
    sheet,
    {
      ...power.action,
      label: actionLabel
    },
    character.name,
    system
  );
  const detailedLogEntry = appendDetails(
    {
      ...logEntry,
      actionLabel
    },
    `Item ID: ${item.id}\nPower ID: ${power.id}`
  );

  if (!power.consumesItem && !power.charges) {
    return { logEntry: detailedLogEntry };
  }

  const updatedInventory = (character.inventory ?? []).map((currentItem) => {
    if (currentItem.id !== item.id) return currentItem;

    return {
      ...currentItem,
      quantity: power.consumesItem ? Math.max(0, currentItem.quantity - 1) : currentItem.quantity,
      powers: currentItem.powers?.map((currentPower) =>
        currentPower.id === power.id ? decrementPowerCharge(currentPower) : currentPower
      )
    };
  });

  return {
    logEntry: detailedLogEntry,
    updatedCharacter: {
      ...character,
      inventory: updatedInventory
    }
  };
}
