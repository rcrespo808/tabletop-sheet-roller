import { rollDndExpression } from "@/lib/dice/dnd";
import { getSystemSheet } from "@/data/characters";
import type { CharacterProfile, Dnd5eStats, GameSystem, NwodStats } from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";
import type { NpcTemplate } from "@/lib/combat/npcTemplates";
import type { Combatant, CombatEncounter, CombatStatus, CombatTeam } from "@/lib/combat/types";

function newCombatantId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    actions: template.actions,
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

  if (turnIndex >= encounter.combatants.length) {
    turnIndex = 0;
    round += 1;
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

  if (turnIndex < 0) {
    turnIndex = encounter.combatants.length - 1;
    round = Math.max(1, round - 1);
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

  if (currentHp <= 0 && updated.status === "active") {
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
