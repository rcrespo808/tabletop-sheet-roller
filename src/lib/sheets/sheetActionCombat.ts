import type { GameSystem, SheetAction } from "@/lib/sheets/types";

/** JRPG / combat menu categories stored on sheet & inventory actions. */
export type CombatActionCategory =
  | "fight"
  | "skill"
  | "spell"
  | "power"
  | "item"
  | "defend"
  | "wait"
  | "flee"
  | "note"
  | "utility";

export type SheetActionCombatMetadata = {
  combatKind?: "attack" | "utility";
  combatCategory?: CombatActionCategory;
  attackRoll?: string;
  damageRoll?: string;
  damageType?: string;
  damage?: number;
  /** Links split legacy attack + damage rows during migration. */
  combatPairKey?: string;
};

const CATEGORY_ALIASES: Record<string, CombatActionCategory> = {
  fight: "fight",
  attack: "fight",
  attacks: "fight",
  skill: "skill",
  skills: "skill",
  check: "skill",
  checks: "skill",
  spell: "spell",
  spells: "spell",
  power: "power",
  powers: "power",
  item: "item",
  items: "item",
  defend: "defend",
  defense: "defend",
  wait: "wait",
  flee: "flee",
  run: "flee",
  escape: "flee",
  note: "note",
  notes: "note",
  utility: "utility"
};

function metadataOf(action: SheetAction): SheetActionCombatMetadata {
  return (action.metadata ?? {}) as SheetActionCombatMetadata;
}

function withMetadata(action: SheetAction, patch: SheetActionCombatMetadata): SheetAction {
  return {
    ...action,
    metadata: {
      ...metadataOf(action),
      ...patch
    }
  } as SheetAction;
}

export function normalizeCombatActionCategory(raw: unknown): CombatActionCategory | undefined {
  if (typeof raw !== "string") return undefined;
  return CATEGORY_ALIASES[raw.trim().toLowerCase()];
}

function inferCategory(action: SheetAction, system: GameSystem): CombatActionCategory {
  const meta = metadataOf(action);
  const explicit = normalizeCombatActionCategory(meta.combatCategory);
  if (explicit) return explicit;

  if (meta.combatKind === "attack") return "fight";

  if (action.type === "note") {
    const label = action.label.toLowerCase();
    if (label.includes("defend") || label.includes("dodge")) return "defend";
    if (label.includes("wait") || label.includes("hold")) return "wait";
    if (label.includes("flee") || label.includes("escape") || label.includes("retreat")) {
      return "flee";
    }
    return "power";
  }

  if (system === "dnd5e") {
    if (action.type === "dnd-check") return "skill";
    if (action.type === "dnd-roll") {
      const label = action.label.toLowerCase();
      if (label.includes("damage")) return "power";
      if (label.includes("attack") || label.includes("strike") || label.includes("hit")) {
        return "fight";
      }
      return "power";
    }
  }

  if (system === "nwod") {
    if (action.type === "nwod-check") {
      if (typeof meta.damage === "number" || meta.attackRoll) return "fight";
      return "skill";
    }
    if (action.type === "nwod-pool") return "power";
  }

  return "utility";
}

function isDamageSibling(action: SheetAction): boolean {
  return (
    action.type === "dnd-roll" &&
    (action.id.endsWith("-damage") ||
      action.label.toLowerCase().includes("damage"))
  );
}

function mergeDndAttackDamagePairs(actions: SheetAction[]): SheetAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const consumed = new Set<string>();
  const merged: SheetAction[] = [];

  for (const action of actions) {
    if (consumed.has(action.id)) continue;

    if (action.type === "dnd-roll" && !isDamageSibling(action)) {
      const damageId = `${action.id}-damage`;
      const damageAction = byId.get(damageId);
      if (damageAction?.type === "dnd-roll") {
        consumed.add(damageId);
        merged.push(
          withMetadata(action, {
            combatKind: "attack",
            combatCategory: "fight",
            attackRoll: action.roll,
            damageRoll: damageAction.roll,
            damageType:
              typeof metadataOf(damageAction).damageType === "string"
                ? metadataOf(damageAction).damageType
                : undefined
          })
        );
        continue;
      }
    }

    if (isDamageSibling(action)) {
      const attackId = action.id.replace(/-damage$/, "");
      if (byId.has(attackId)) {
        consumed.add(action.id);
        continue;
      }
    }

    merged.push(action);
  }

  return merged;
}

export function normalizeSheetActionForCombat(
  action: SheetAction,
  system: GameSystem
): SheetAction {
  const meta = metadataOf(action);
  const combatCategory = inferCategory(action, system);
  const patch: SheetActionCombatMetadata = {
    combatCategory
  };

  if (meta.combatKind === "attack" || combatCategory === "fight") {
    patch.combatKind = "attack";
    patch.combatCategory = "fight";
    if (action.type === "dnd-roll") {
      if (!meta.attackRoll && !isDamageSibling(action)) {
        patch.attackRoll = action.roll;
      }
      if (meta.attackRoll) patch.attackRoll = meta.attackRoll;
      if (meta.damageRoll) patch.damageRoll = meta.damageRoll;
    }
    if (action.type === "nwod-check") {
      patch.damage = typeof meta.damage === "number" ? meta.damage : 1;
    }
  } else {
    patch.combatKind = "utility";
  }

  if (action.type === "note" && !meta.combatKind) {
    patch.combatKind = "utility";
  }

  return withMetadata(action, patch);
}

export function migrateSheetActionsForCombat(
  actions: SheetAction[],
  system: GameSystem
): SheetAction[] {
  const merged = system === "dnd5e" ? mergeDndAttackDamagePairs(actions) : actions;
  return merged.map((action) => normalizeSheetActionForCombat(action, system));
}

export function migrateCharacterForCombat(profile: import("@/lib/sheets/types").CharacterProfile) {
  const sheets = { ...profile.sheets };

  for (const system of ["dnd5e", "nwod"] as const) {
    const sheet = sheets[system];
    if (!sheet) continue;
    sheets[system] = {
      ...sheet,
      actions: migrateSheetActionsForCombat(sheet.actions, system)
    };
  }

  const inventory = (profile.inventory ?? []).map((item) => ({
    ...item,
    powers: (item.powers ?? []).map((power) => ({
      ...power,
      action: normalizeSheetActionForCombat(
        power.action,
        profile.defaultSystem === "nwod" ? "nwod" : "dnd5e"
      )
    }))
  }));

  return {
    ...profile,
    sheets,
    inventory
  };
}

export function sheetActionHasCombatAttack(action: SheetAction): boolean {
  const meta = metadataOf(action);
  return (
    meta.combatKind === "attack" &&
    typeof meta.attackRoll === "string" &&
    meta.attackRoll.trim() !== "" &&
    typeof meta.damageRoll === "string" &&
    meta.damageRoll.trim() !== ""
  );
}

export function sheetActionHasNwodAttack(action: SheetAction): boolean {
  const meta = metadataOf(action);
  return action.type === "nwod-check" && meta.combatKind === "attack";
}
