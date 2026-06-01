import { rollDndExpression } from "@/lib/dice/dnd";
import { rollNwodPool } from "@/lib/dice/nwod";
import { getSystemSheet } from "@/data/characters";
import type {
  AbilityKey,
  CharacterProfile,
  Dnd5eStats,
  GameSystem,
  NwodStats,
  SheetAction
} from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";
import type { NpcTemplate } from "@/lib/combat/npcTemplates";
import type {
  CombatAction,
  Combatant,
  CombatEncounter,
  CombatStatus,
  CombatTeam
} from "@/lib/combat/types";

function newCombatantId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getActionMetadata(action: SheetAction): Record<string, unknown> {
  return action.metadata ?? {};
}

function toCombatAction(action: SheetAction): CombatAction | null {
  const metadata = getActionMetadata(action);

  if (action.type === "dnd-roll" && typeof metadata.damageRoll === "string" && metadata.damageRoll.trim()) {
    return {
      id: action.id,
      label: action.label,
      system: "dnd5e",
      kind: "attack",
      attackRoll: typeof metadata.attackRoll === "string" ? metadata.attackRoll : action.roll,
      damageRoll: metadata.damageRoll,
      damageType: typeof metadata.damageType === "string" ? metadata.damageType : undefined,
      notes: action.notes,
      sourceActionId: action.id
    };
  }

  if (action.type === "dnd-check" && typeof metadata.damageRoll === "string" && metadata.damageRoll.trim()) {
    return {
      id: action.id,
      label: action.label,
      system: "dnd5e",
      kind: "save",
      saveDc: typeof metadata.saveDc === "number" ? metadata.saveDc : undefined,
      saveAbility: (typeof metadata.saveAbility === "string"
        ? (metadata.saveAbility as AbilityKey)
        : undefined),
      damageRoll: metadata.damageRoll,
      halfOnSuccess: Boolean(metadata.halfOnSuccess),
      notes: action.notes,
      sourceActionId: action.id
    };
  }

  if (action.type === "nwod-check" && typeof metadata.combatKind === "string" && metadata.combatKind === "attack") {
    return {
      id: action.id,
      label: action.label,
      system: "nwod",
      kind: "attack",
      attribute: action.attribute,
      skill: action.skill,
      modifier: action.modifier ?? 0,
      damage: typeof metadata.damage === "number" ? metadata.damage : 0,
      again: action.again,
      rote: action.rote,
      notes: action.notes,
      sourceActionId: action.id
    };
  }

  if (action.type === "dnd-roll" || action.type === "dnd-check" || action.type === "nwod-check" || action.type === "nwod-pool" || action.type === "note") {
    return {
      id: action.id,
      label: action.label,
      system:
        action.type === "nwod-pool" ? "nwod" : "dnd5e",
      kind: "utility",
      action,
      notes: action.notes,
      sourceActionId: action.id
    };
  }

  return null;
}

export function mapSheetActionsToCombatActions(actions: SheetAction[]): CombatAction[] {
  return actions.map(toCombatAction).filter((action): action is CombatAction => Boolean(action));
}

function rollNwodInitiative(initiativeStat: number): { total: number; expression: string } {
  const result = rollDndExpression(`1d10+${initiativeStat}`);
  return { total: result.total, expression: `${result.expression} → ${result.total}` };
}

export function createCombatantFromCharacter(
  character: CharacterProfile,
  system: GameSystem,
  team: CombatTeam = "players"
): Combatant {
  const sheet = getSystemSheet(character, system);
  const combatant: Combatant = {
    id: newCombatantId(),
    kind: "character",
    sourceId: character.id,
    instanceName: character.name,
    system,
    team,
    initiative: 0,
    status: "active",
    targetIds: [],
    combatActions: mapSheetActionsToCombatActions(sheet?.actions ?? []),
    actions: sheet?.actions ?? []
  };

  if (sheet && isDnd5eSheet(sheet)) {
    const stats = sheet.stats as Dnd5eStats | undefined;
    combatant.maxHp = stats?.maxHp;
    combatant.currentHp = stats?.currentHp ?? stats?.maxHp;
    combatant.armorClass = stats?.armorClass;
    combatant.metadata = { initiativeBonus: stats?.initiativeBonus };
  }

  if (sheet && isNwodSheet(sheet)) {
    const stats = sheet.stats as NwodStats | undefined;
    combatant.maxHp = stats?.maxHealth;
    combatant.currentHp = stats?.health ?? stats?.maxHealth;
    combatant.defense = stats?.defense;
    combatant.armor = stats?.armor;
    combatant.metadata = { initiativeStat: stats?.initiative };
  }

  return combatant;
}

export function createCombatantFromNpcTemplate(
  template: NpcTemplate,
  index: number,
  team: CombatTeam = "enemies"
): Combatant {
  return {
    id: newCombatantId(),
    kind: "npc",
    sourceId: template.id,
    instanceName: `${template.name} #${index}`,
    system: template.system,
    team,
    initiative: 0,
    maxHp: template.maxHp,
    currentHp: template.maxHp,
    armorClass: template.armorClass,
    defense: template.defense,
    armor: template.armor,
    crLabel: template.crLabel,
    status: "active",
    targetIds: [],
    combatActions: template.actions,
    metadata: {
      initiativeBonus: template.initiativeBonus,
      initiativeStat: template.initiative,
      stats: template.stats,
      skills: template.skills
    }
  };
}

export function rollInitiative(combatant: Combatant): Combatant {
  if (combatant.system === "dnd5e") {
    const bonus =
      typeof combatant.metadata?.initiativeBonus === "number"
        ? combatant.metadata.initiativeBonus
        : 0;
    const result = rollDndExpression(`1d20${bonus >= 0 ? "+" : ""}${bonus}`);
    return {
      ...combatant,
      initiative: result.total,
      initiativeRoll: `${result.expression} → ${result.total}`
    };
  }

  const initiativeStat =
    typeof combatant.metadata?.initiativeStat === "number"
      ? combatant.metadata.initiativeStat
      : 0;
  const result = rollNwodInitiative(initiativeStat);
  return {
    ...combatant,
    initiative: result.total,
    initiativeRoll: result.expression
  };
}

export function sortCombatantsByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((left, right) => {
    if (right.initiative !== left.initiative) {
      return right.initiative - left.initiative;
    }
    return left.instanceName.localeCompare(right.instanceName);
  });
}

export function startEncounter(encounter: CombatEncounter): CombatEncounter {
  const rolled = encounter.combatants.map((combatant) =>
    combatant.initiativeRoll ? combatant : rollInitiative(combatant)
  );
  return {
    ...encounter,
    status: "active",
    round: 1,
    turnIndex: 0,
    combatants: sortCombatantsByInitiative(rolled),
    updatedAt: new Date().toISOString()
  };
}

export function nextTurn(encounter: CombatEncounter): CombatEncounter {
  if (encounter.combatants.length === 0) return encounter;

  let turnIndex = encounter.turnIndex + 1;
  let round = encounter.round;
  let safety = 0;

  while (safety < encounter.combatants.length) {
    if (turnIndex >= encounter.combatants.length) {
      turnIndex = 0;
      round += 1;
    }

    const candidate = encounter.combatants[turnIndex];
    if (candidate.status !== "dead" && candidate.status !== "fled") {
      break;
    }

    turnIndex += 1;
    safety += 1;
  }

  return {
    ...encounter,
    turnIndex,
    round,
    updatedAt: new Date().toISOString()
  };
}

export function previousTurn(encounter: CombatEncounter): CombatEncounter {
  if (encounter.combatants.length === 0) return encounter;

  let turnIndex = encounter.turnIndex - 1;
  let round = encounter.round;
  let safety = 0;

  while (safety < encounter.combatants.length) {
    if (turnIndex < 0) {
      turnIndex = encounter.combatants.length - 1;
      round = Math.max(1, round - 1);
    }

    const candidate = encounter.combatants[turnIndex];
    if (candidate.status !== "dead" && candidate.status !== "fled") {
      break;
    }

    turnIndex -= 1;
    safety += 1;
  }

  return {
    ...encounter,
    turnIndex,
    round,
    updatedAt: new Date().toISOString()
  };
}

export function applyDamage(combatant: Combatant, amount: number): Combatant {
  if (amount <= 0) return combatant;

  let remaining = amount;
  let temporaryHp = combatant.temporaryHp ?? 0;
  let currentHp = combatant.currentHp ?? combatant.maxHp ?? 0;

  if (temporaryHp > 0) {
    const absorbed = Math.min(temporaryHp, remaining);
    temporaryHp -= absorbed;
    remaining -= absorbed;
  }

  currentHp = Math.max(0, currentHp - remaining);

  const updated: Combatant = {
    ...combatant,
    temporaryHp: temporaryHp > 0 ? temporaryHp : undefined,
    currentHp
  };

  if (currentHp <= 0 && updated.status !== "dead" && updated.status !== "fled") {
    updated.status = "down";
  }

  return updated;
}

export function applyHealing(combatant: Combatant, amount: number): Combatant {
  if (amount <= 0) return combatant;

  const maxHp = combatant.maxHp ?? combatant.currentHp ?? 0;
  const currentHp = Math.min(maxHp, (combatant.currentHp ?? 0) + amount);

  const updated: Combatant = {
    ...combatant,
    currentHp
  };

  if (updated.status === "down" && currentHp > 0) {
    updated.status = "active";
  }

  return updated;
}

export function setCombatantStatus(combatant: Combatant, status: CombatStatus): Combatant {
  return { ...combatant, status };
}

export function isTargetable(combatant: Combatant, showAll = false): boolean {
  if (combatant.status === "dead" || combatant.status === "fled") return false;
  if (combatant.status === "hidden" && !showAll) return false;
  return true;
}

export function canAct(combatant: Combatant): boolean {
  return combatant.status === "active";
}

export function getValidTargets(
  encounter: CombatEncounter,
  attacker: Combatant,
  options?: { showAll?: boolean }
): Combatant[] {
  const showAll = options?.showAll ?? false;
  return encounter.combatants.filter(
    (entry) =>
      entry.id !== attacker.id &&
      isTargetable(entry, showAll) &&
      entry.team !== attacker.team
  );
}

export function toggleTarget(combatant: Combatant, targetId: string): Combatant {
  const hasTarget = combatant.targetIds.includes(targetId);
  return {
    ...combatant,
    targetIds: hasTarget
      ? combatant.targetIds.filter((id) => id !== targetId)
      : [...combatant.targetIds, targetId]
  };
}

export function updateCombatant(
  encounter: CombatEncounter,
  combatantId: string,
  updater: (combatant: Combatant) => Combatant
): CombatEncounter {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) =>
      combatant.id === combatantId ? updater(combatant) : combatant
    ),
    updatedAt: new Date().toISOString()
  };
}

export function createEncounter(name: string, system?: GameSystem | "mixed"): CombatEncounter {
  const now = new Date().toISOString();
  return {
    id: newCombatantId(),
    name,
    system,
    round: 1,
    turnIndex: 0,
    status: "draft",
    combatants: [],
    createdAt: now,
    updatedAt: now
  };
}
