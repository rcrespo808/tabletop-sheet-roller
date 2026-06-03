import type { CombatAction } from "@/lib/combat/types";
import type { RpgCommandId } from "@/lib/combat/rpgmDisplay";
import { normalizeCombatActionCategory } from "@/lib/sheets/sheetActionCombat";

export type BuiltinCommandId = "defend" | "wait" | "flee";

export type BuiltinCommand = {
  id: BuiltinCommandId;
  label: string;
  description: string;
  requiresTarget: boolean;
};

export const BUILTIN_COMMANDS: BuiltinCommand[] = [
  {
    id: "defend",
    label: "Defend",
    description: "Declare a defensive stance. GM resolves any mechanical effect.",
    requiresTarget: false
  },
  {
    id: "wait",
    label: "Wait",
    description: "Hold action or skip aggressive play until GM advances the turn.",
    requiresTarget: false
  },
  {
    id: "flee",
    label: "Flee",
    description: "Attempt to escape. GM adjudicates success and consequences.",
    requiresTarget: false
  }
];

const METADATA_CATEGORY_ALIASES: Record<string, RpgCommandId> = {
  fight: "fight",
  attack: "fight",
  attacks: "fight",
  skill: "skills",
  skills: "skills",
  check: "skills",
  checks: "skills",
  power: "powers",
  powers: "powers",
  spell: "powers",
  spells: "powers",
  item: "items",
  items: "items",
  utility: "powers",
  note: "skills",
  notes: "skills",
  defend: "defend",
  wait: "wait",
  flee: "flee"
};

function isItemPowerAction(action: CombatAction): boolean {
  return Boolean(action.metadata?.itemPowerId);
}

function isNoteAction(action: CombatAction): boolean {
  return action.kind === "utility" && action.action.type === "note";
}

function isSkillUtilityAction(action: CombatAction): boolean {
  if (action.kind !== "utility") return false;
  return action.action.type === "dnd-check" || action.action.type === "nwod-check";
}

export function getActionCategory(action: CombatAction): RpgCommandId | null {
  const raw = action.metadata?.combatCategory;
  const fromSheet = normalizeCombatActionCategory(raw);
  if (fromSheet) {
    if (fromSheet === "defend" || fromSheet === "wait" || fromSheet === "flee") {
      return fromSheet;
    }
    if (fromSheet === "spell") return "powers";
    if (fromSheet === "note") return "skills";
    if (fromSheet === "item") return "items";
    if (fromSheet === "fight") return "fight";
    if (fromSheet === "skill") return "skills";
    if (fromSheet === "power" || fromSheet === "utility") return "powers";
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized in METADATA_CATEGORY_ALIASES) {
      return METADATA_CATEGORY_ALIASES[normalized];
    }
  }

  if (action.kind === "attack") return "fight";
  if (isItemPowerAction(action)) return "items";
  if (isSkillUtilityAction(action)) return "skills";
  if (isNoteAction(action)) return "skills";
  if (action.kind === "utility") return "powers";
  return null;
}

export function getActionsForCommand(
  actions: CombatAction[],
  commandId: RpgCommandId
): CombatAction[] {
  return actions.filter((action) => getActionCategory(action) === commandId);
}

export function groupActionsByCommand(actions: CombatAction[]): Record<RpgCommandId, CombatAction[]> {
  const buckets: Record<RpgCommandId, CombatAction[]> = {
    fight: [],
    skills: [],
    powers: [],
    items: [],
    defend: [],
    wait: [],
    flee: []
  };

  for (const action of actions) {
    const category = getActionCategory(action);
    if (category) buckets[category].push(action);
  }

  return buckets;
}

export function getCommandActionCount(actions: CombatAction[], commandId: RpgCommandId): number {
  if (commandId === "defend" || commandId === "wait" || commandId === "flee") return 1;
  return getActionsForCommand(actions, commandId).length;
}

export function isBuiltinCommand(commandId: RpgCommandId): commandId is BuiltinCommandId {
  return commandId === "defend" || commandId === "wait" || commandId === "flee";
}

export function getBuiltinCommand(commandId: BuiltinCommandId): BuiltinCommand | undefined {
  return BUILTIN_COMMANDS.find((entry) => entry.id === commandId);
}

export function actionRequiresTarget(action: CombatAction): boolean {
  return action.kind === "attack";
}

export function getActionBadges(action: CombatAction): string[] {
  if (action.kind === "attack") return ["Auto Damage"];
  if (isNoteAction(action)) return ["Note"];
  const tags = ["Roll Only"];
  if (isItemPowerAction(action)) tags.push("Item");
  if (typeof action.metadata?.itemPowerChargeMax === "number") tags.push("Charge");
  if (action.metadata?.itemPowerConsumesItem) tags.push("Consumes");
  return tags;
}

export function splitSkillActions(actions: CombatAction[]): {
  checks: CombatAction[];
  notes: CombatAction[];
} {
  const checks = actions.filter(isSkillUtilityAction);
  const notes = actions.filter((action) => isNoteAction(action) && !isSkillUtilityAction(action));
  return { checks, notes };
}
