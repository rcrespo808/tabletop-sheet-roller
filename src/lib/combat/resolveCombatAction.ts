import { createRollLogEntry } from "@/lib/dice/log";
import { rollDndExpression } from "@/lib/dice/dnd";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { RandomSource } from "@/lib/dice/types";
import type { CombatAction, CombatEncounter, Combatant } from "@/lib/combat/types";
import { appendCombatHistory, applyDamage, makeCombatLogEntry } from "@/lib/combat/combatEngine";
import { isResolvablePendingAction } from "@/lib/combat/combatFlow";
import type { RollLogEntry } from "@/lib/sheets/types";

export type CombatResolutionResult = {
  encounter: CombatEncounter;
  logEntry: RollLogEntry;
  summary: string;
  hit?: boolean;
  attackTotal?: number;
  targetDefenseValue?: number;
  damageApplied?: number;
  details: Record<string, unknown>;
};

function findCombatant(encounter: CombatEncounter, id: string): Combatant | undefined {
  return encounter.combatants.find((entry) => entry.id === id);
}

function replaceCombatant(encounter: CombatEncounter, nextCombatant: Combatant): CombatEncounter {
  return {
    ...encounter,
    combatants: encounter.combatants.map((entry) =>
      entry.id === nextCombatant.id ? nextCombatant : entry
    ),
    updatedAt: new Date().toISOString()
  };
}

function getDefenseValue(combatant: Combatant): number {
  if (combatant.system === "dnd5e") return combatant.armorClass ?? 10;
  return combatant.defense ?? 0;
}

function critMultiplyDamage(expression: string): string {
  const parsed = expression.replace(/\s+/g, "");
  const match = parsed.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return expression;
  const dieCount = Number(match[1] || "1") * 2;
  const dieSize = match[2];
  const modifier = match[3] ?? "";
  return `${dieCount}d${dieSize}${modifier}`;
}

function summarizeDnd(
  attacker: Combatant,
  target: Combatant,
  action: Extract<CombatAction, { system: "dnd5e"; kind: "attack" }>,
  attackTotal: number,
  hit: boolean,
  damageApplied: number,
  targetBeforeHp: number,
  targetAfterHp: number,
  crit: boolean
): string {
  const lines = [
    `${attacker.instanceName} attacked ${target.instanceName} with ${action.label}.`,
    `Attack ${attackTotal} vs AC ${getDefenseValue(target)}: ${hit ? "HIT" : "MISS"}.`
  ];

  if (crit) {
    lines.push("Critical hit.");
  }

  if (hit) {
    lines.push(
      `Damage ${damageApplied} ${action.damageType ?? ""}`.trim() + "."
    );
    lines.push(`HP ${targetBeforeHp} \u2192 ${targetAfterHp}.`);
  } else {
    lines.push("No damage applied.");
  }

  return lines.join("\n");
}

function summarizeNwod(
  attacker: Combatant,
  target: Combatant,
  action: Extract<CombatAction, { system: "nwod"; kind: "attack" }>,
  basePool: number,
  finalPool: number,
  successes: number,
  totalDamage: number,
  targetBeforeHp: number,
  targetAfterHp: number,
  armor: number
): string {
  return [
    `${attacker.instanceName} attacked ${target.instanceName} with ${action.label}.`,
    `Pool ${basePool} - Defense ${target.defense ?? 0} = ${finalPool}.`,
    `${successes} successes + ${action.damage ?? 0} weapon damage - ${armor} armor = ${totalDamage} damage.`,
    `Health ${targetBeforeHp} \u2192 ${targetAfterHp}.`
  ].join("\n");
}

export type ResolveCombatActionInput = {
  encounter: CombatEncounter;
  attackerId: string;
  targetId: string;
  actionId: string;
  /** Injectable for deterministic tests. */
  random?: RandomSource;
};

export function resolveCombatAction({
  encounter,
  attackerId,
  targetId,
  actionId,
  random
}: ResolveCombatActionInput): CombatResolutionResult {
  const attacker = findCombatant(encounter, attackerId);
  const target = findCombatant(encounter, targetId);
  if (!attacker || !target) {
    throw new Error("Attacker or target not found.");
  }

  const action = attacker.combatActions.find((entry) => entry.id === actionId);
  if (!action) {
    throw new Error("Action not available for combat resolution.");
  }

  if (action.kind === "utility") {
    throw new Error("Utility actions do not auto-resolve in combat.");
  }

  if (action.kind !== "attack") {
    throw new Error("This action is roll-only or unsupported for auto-resolution.");
  }

  let nextEncounter = encounter;
  const targetBeforeHp = target.currentHp ?? target.maxHp ?? 0;

  if (action.system === "dnd5e" && action.kind === "attack") {
    const attackResult = rollDndExpression(action.attackRoll, random);
    const attackTotal = attackResult.total;
    const crit = attackResult.dice[0] === 20;
    const hit = attackResult.dice[0] !== 1 && (crit || attackTotal >= getDefenseValue(target));

    let damageApplied = 0;
    let targetAfter = target;

    if (hit) {
      const damageExpression = crit ? critMultiplyDamage(action.damageRoll) : action.damageRoll;
      const damageResult = rollDndExpression(damageExpression, random);
      damageApplied = damageResult.total;
      targetAfter = applyDamage(target, damageApplied);
      nextEncounter = replaceCombatant(nextEncounter, targetAfter);
    }

    nextEncounter = replaceCombatant(nextEncounter, {
      ...attacker,
      targetIds: [target.id]
    });

    const targetAfterHp = targetAfter.currentHp ?? targetAfter.maxHp ?? 0;
    const summary = summarizeDnd(
      attacker,
      target,
      action,
      attackTotal,
      hit,
      damageApplied,
      targetBeforeHp,
      targetAfterHp,
      crit
    );

    const details = {
      encounterId: encounter.id,
      round: encounter.round,
      attackerId,
      attackerName: attacker.instanceName,
      targetId,
      targetName: target.instanceName,
      actionId,
      actionLabel: action.label,
      system: "dnd5e",
      resultType: hit ? "attack_hit" : "attack_miss",
      attackTotal,
      defenseTarget: getDefenseValue(target),
      targetAc: getDefenseValue(target),
      hit,
      crit,
      damageApplied,
      hpBefore: targetBeforeHp,
      hpAfter: targetAfterHp,
      targetBeforeHp,
      targetAfterHp
    };
    nextEncounter = appendCombatHistory(
      nextEncounter,
      makeCombatLogEntry(nextEncounter, {
        actorId: attacker.id,
        actorName: attacker.instanceName,
        targetId: target.id,
        targetName: target.instanceName,
        actionLabel: action.label,
        summary,
        details
      })
    );

    return {
      encounter: nextEncounter,
      hit,
      attackTotal,
      damageApplied,
      summary,
      logEntry: createRollLogEntry({
        kind: "combat",
        characterName: attacker.instanceName,
        actionLabel: `${attacker.instanceName} -> ${target.instanceName}: ${action.label}`,
        system: "dnd5e",
        expression: attackResult.expression,
        resultText: summary,
        details
      }),
      details
    };
  }

  if (action.system !== "nwod" || action.kind !== "attack") {
    throw new Error("This action is roll-only or unsupported for auto-resolution.");
  }

  const nwodAction = action as Extract<CombatAction, { system: "nwod"; kind: "attack" }>;
  const stats = (attacker.metadata?.stats as Record<string, number> | undefined) ?? {};
  const skills = (attacker.metadata?.skills as Record<string, number> | undefined) ?? {};
  const basePool = Math.max(
    0,
    (nwodAction.attribute ? stats[nwodAction.attribute] ?? 0 : 0) +
      (nwodAction.skill ? skills[nwodAction.skill] ?? 0 : 0) +
      (nwodAction.modifier ?? 0)
  );
  const defense = target.defense ?? 0;
  const finalPool = Math.max(0, basePool - defense);
  const poolResult = rollNwodPool(
    {
      pool: finalPool,
      again: nwodAction.again,
      rote: nwodAction.rote,
      chanceDie: finalPool <= 0
    },
    random
  );
  const successes = poolResult.successes;
  const armor = target.armor ?? 0;
  const totalDamage = Math.max(0, successes + (nwodAction.damage ?? 0) - armor);
  const targetAfter = applyDamage(target, totalDamage);
  nextEncounter = replaceCombatant(nextEncounter, targetAfter);
  nextEncounter = replaceCombatant(nextEncounter, {
    ...attacker,
    targetIds: [target.id]
  });

  const targetAfterHp = targetAfter.currentHp ?? targetAfter.maxHp ?? 0;
  const summary = summarizeNwod(
    attacker,
    target,
    nwodAction,
    basePool,
    finalPool,
    successes,
    totalDamage,
    targetBeforeHp,
    targetAfterHp,
    armor
  );

  const details = {
    encounterId: encounter.id,
    round: encounter.round,
    attackerId,
    attackerName: attacker.instanceName,
    targetId,
    targetName: target.instanceName,
    actionId,
    actionLabel: nwodAction.label,
    system: "nwod",
    resultType: totalDamage > 0 ? "damage" : "attack_miss",
    basePool,
    defense,
    finalPool,
    chanceDie: finalPool <= 0,
    successes,
    weaponDamage: nwodAction.damage ?? 0,
    armor,
    totalDamage,
    damageApplied: totalDamage,
    hpBefore: targetBeforeHp,
    hpAfter: targetAfterHp,
    targetBeforeHp,
    targetAfterHp
  };
  nextEncounter = appendCombatHistory(
    nextEncounter,
    makeCombatLogEntry(nextEncounter, {
      actorId: attacker.id,
      actorName: attacker.instanceName,
      targetId: target.id,
      targetName: target.instanceName,
      actionLabel: nwodAction.label,
      summary,
      details
    })
  );

  return {
    encounter: nextEncounter,
    hit: totalDamage > 0,
    attackTotal: finalPool,
    targetDefenseValue: defense,
    damageApplied: totalDamage,
    summary,
    logEntry: createRollLogEntry({
      kind: "combat",
      characterName: attacker.instanceName,
      actionLabel: `${attacker.instanceName} -> ${target.instanceName}: ${action.label}`,
      system: "nwod",
      expression: poolResult.expression,
      resultText: summary,
      details
    }),
    details
  };
}

/** Resolve the encounter's pending attack using stored actor, target, and action ids. */
export function resolvePendingCombatAction(
  encounter: CombatEncounter,
  options?: { random?: RandomSource }
): CombatResolutionResult {
  const pending = encounter.pendingAction;
  if (!isResolvablePendingAction(pending)) {
    throw new Error("Pending action needs an attack with actor and target.");
  }

  return resolveCombatAction({
    encounter,
    attackerId: pending.combatantId,
    targetId: pending.targetId,
    actionId: pending.actionId,
    random: options?.random
  });
}
