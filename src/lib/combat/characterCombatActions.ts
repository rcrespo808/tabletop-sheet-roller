import { getSystemSheet } from "@/data/characters";
import type {
  CharacterProfile,
  InventoryItem,
  InventoryItemPower,
  SheetAction
} from "@/lib/sheets/types";
import type {
  CombatAction,
  CombatEncounterSystem
} from "@/lib/combat/types";

function isExplicitAttack(metadata: Record<string, unknown>): boolean {
  return metadata.combatKind === "attack";
}

function getActionMetadata(action: SheetAction): Record<string, unknown> {
  return action.metadata ?? {};
}

function withMetadata(
  action: SheetAction,
  metadata: Record<string, string | number | boolean | null | undefined>
): SheetAction {
  return {
    ...action,
    metadata: {
      ...(action.metadata ?? {}),
      ...metadata
    }
  } as SheetAction;
}

function toUtilityAction(
  action: SheetAction,
  system: CombatEncounterSystem,
  options?: {
    id?: string;
    label?: string;
    notes?: string;
    sourceActionId?: string;
  }
): CombatAction {
  const metadata = getActionMetadata(action);
  return {
    id: options?.id ?? action.id,
    label: options?.label ?? action.label,
    system,
    kind: "utility",
    action,
    notes: options?.notes ?? action.notes,
    sourceActionId: options?.sourceActionId ?? action.id,
    metadata
  };
}

function convertSheetAction(
  action: SheetAction,
  system: CombatEncounterSystem,
  options?: {
    id?: string;
    label?: string;
    notes?: string;
    sourceActionId?: string;
  }
): CombatAction | null {
  const metadata = getActionMetadata(action);
  const id = options?.id ?? action.id;
  const label = options?.label ?? action.label;
  const notes = options?.notes ?? action.notes;
  const sourceActionId = options?.sourceActionId ?? action.id;

  if (system === "dnd5e") {
    if (
      action.type === "dnd-roll" &&
      isExplicitAttack(metadata) &&
      typeof metadata.attackRoll === "string" &&
      metadata.attackRoll.trim() &&
      typeof metadata.damageRoll === "string" &&
      metadata.damageRoll.trim()
    ) {
      return {
        id,
        label,
        system: "dnd5e",
        kind: "attack",
        attackRoll: metadata.attackRoll,
        damageRoll: metadata.damageRoll,
        damageType: typeof metadata.damageType === "string" ? metadata.damageType : undefined,
        notes,
        sourceActionId,
        metadata
      };
    }

    if (action.type === "dnd-roll" || action.type === "dnd-check" || action.type === "note") {
      return toUtilityAction(action, system, { id, label, notes, sourceActionId });
    }
  }

  if (system === "nwod") {
    if (action.type === "nwod-check" && isExplicitAttack(metadata)) {
      return {
        id,
        label,
        system: "nwod",
        kind: "attack",
        attribute: action.attribute,
        skill: action.skill,
        modifier: action.modifier ?? 0,
        damage: typeof metadata.damage === "number" ? metadata.damage : 0,
        again: action.again,
        rote: action.rote,
        notes,
        sourceActionId,
        metadata
      };
    }

    if (action.type === "nwod-pool" || action.type === "nwod-check" || action.type === "note") {
      return toUtilityAction(action, system, { id, label, notes, sourceActionId });
    }
  }

  return null;
}

function getInventoryPowerAction(
  item: InventoryItem,
  power: InventoryItemPower,
  system: CombatEncounterSystem
): CombatAction | null {
  const id = `${item.id}:${power.id}`;
  const label = `${item.name}: ${power.label}`;
  const action = withMetadata(power.action, {
    itemId: item.id,
    itemName: item.name,
    itemPowerId: power.id,
    itemPowerLabel: power.label,
    itemPowerConsumesItem: power.consumesItem ?? false,
    itemPowerChargeCurrent: power.charges?.current,
    itemPowerChargeMax: power.charges?.max,
    itemPowerChargeReset: power.charges?.reset
  });

  return convertSheetAction(action, system, {
    id,
    label,
    notes: power.description ?? power.action.notes,
    sourceActionId: power.action.id
  });
}

export function getCombatActionsFromSheetActions(
  actions: SheetAction[],
  system: CombatEncounterSystem
): CombatAction[] {
  return actions
    .map((action) => convertSheetAction(action, system))
    .filter((action): action is CombatAction => Boolean(action));
}

export function getCombatActionsFromInventory(
  character: CharacterProfile,
  system: CombatEncounterSystem
): CombatAction[] {
  return (character.inventory ?? [])
    .filter((item) => item.quantity > 0)
    .flatMap((item) =>
      (item.powers ?? [])
        .map((power) => getInventoryPowerAction(item, power, system))
        .filter((action): action is CombatAction => Boolean(action))
    );
}

export function getCombatActionsFromCharacter(
  character: CharacterProfile,
  system: CombatEncounterSystem
): CombatAction[] {
  const sheet = getSystemSheet(character, system);
  if (!sheet) return [];

  return [
    ...getCombatActionsFromSheetActions(sheet.actions ?? [], system),
    ...getCombatActionsFromInventory(character, system)
  ];
}
