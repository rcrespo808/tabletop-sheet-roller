import type { InventoryItem, InventoryItemPower, InventoryItemPowerReset, SheetAction } from "@/lib/sheets/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isSheetActionType(value: unknown): value is SheetAction["type"] {
  return (
    value === "dnd-roll" ||
    value === "dnd-check" ||
    value === "nwod-pool" ||
    value === "nwod-check" ||
    value === "note"
  );
}

function isPowerReset(value: unknown): value is InventoryItemPowerReset {
  return value === "short_rest" || value === "long_rest" || value === "session" || value === "never";
}

export function normalizeSheetAction(
  value: unknown,
  fallbackId: string,
  fallbackLabel: string
): SheetAction | null {
  if (!isRecord(value) || !isSheetActionType(value.type)) return null;

  const label = typeof value.label === "string" && value.label.trim() ? value.label : fallbackLabel;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : fallbackId;

  return {
    ...value,
    id,
    label
  } as SheetAction;
}

export function normalizeInventoryItemPower(
  value: unknown,
  index = 0
): InventoryItemPower | null {
  if (!isRecord(value)) return null;

  const label = typeof value.label === "string" && value.label.trim() ? value.label.trim() : "";
  if (!label) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id
      : `power-${slugify(label) || index + 1}`;
  const action = normalizeSheetAction(value.action, `action-${slugify(label) || id}`, label);
  if (!action) return null;

  const charges = isRecord(value.charges)
    ? {
        current:
          typeof value.charges.current === "number" && Number.isFinite(value.charges.current)
            ? value.charges.current
            : 0,
        max:
          typeof value.charges.max === "number" && Number.isFinite(value.charges.max)
            ? value.charges.max
            : 0,
        reset: isPowerReset(value.charges.reset) ? value.charges.reset : undefined
      }
    : undefined;

  return {
    id,
    label,
    description: typeof value.description === "string" ? value.description : undefined,
    action,
    charges,
    consumesItem: typeof value.consumesItem === "boolean" ? value.consumesItem : undefined
  };
}

export function normalizeInventoryItem(value: unknown, fallbackIndex = 0): InventoryItem | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id
      : name
        ? `item-${slugify(name)}`
        : `item-${fallbackIndex + 1}`;

  if (!name && !id) return null;

  const powers = Array.isArray(value.powers)
    ? value.powers
        .map((power, index) => normalizeInventoryItemPower(power, index))
        .filter((power): power is InventoryItemPower => Boolean(power))
    : undefined;

  return {
    id,
    name: name || id,
    codexEntryId:
      typeof value.codexEntryId === "string"
        ? value.codexEntryId
        : typeof value.sourceCodexEntryId === "string"
          ? value.sourceCodexEntryId
          : undefined,
    quantity: typeof value.quantity === "number" && Number.isFinite(value.quantity) ? value.quantity : 1,
    equipped: typeof value.equipped === "boolean" ? value.equipped : false,
    rarity: typeof value.rarity === "string" ? value.rarity : undefined,
    notes:
      typeof value.notes === "string"
        ? value.notes
        : typeof value.description === "string"
          ? value.description
          : undefined,
    powers: powers && powers.length > 0 ? powers : undefined,
    sourceCodexEntryId:
      typeof value.sourceCodexEntryId === "string" ? value.sourceCodexEntryId : undefined,
    tags: stringArray(value.tags),
    metadata: isRecord(value.metadata) ? value.metadata : undefined
  };
}

export function normalizeInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => normalizeInventoryItem(item, index))
    .filter((item): item is InventoryItem => Boolean(item));
}
