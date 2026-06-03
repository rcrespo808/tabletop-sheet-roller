import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RandomSource } from "@/lib/dice/types";
import type { CombatEncounter, Combatant } from "@/lib/combat/types";
import { resolveCombatAction, resolvePendingCombatAction } from "@/lib/combat/resolveCombatAction";

function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

function makeDndEncounter(overrides?: {
  targetAc?: number;
  targetHp?: number;
}): { encounter: CombatEncounter; attacker: Combatant; target: Combatant; actionId: string } {
  const attackerId = "attacker-1";
  const targetId = "target-1";
  const actionId = "rapier";

  const attacker: Combatant = {
    id: attackerId,
    kind: "character",
    instanceName: "Hero",
    system: "dnd5e",
    team: "players",
    initiative: 15,
    status: "active",
    targetIds: [],
    currentHp: 40,
    maxHp: 40,
    armorClass: 14,
    combatActions: [
      {
        id: actionId,
        label: "Rapier",
        system: "dnd5e",
        kind: "attack",
        attackRoll: "1d20+5",
        damageRoll: "1d8+2"
      }
    ]
  };

  const target: Combatant = {
    id: targetId,
    kind: "npc",
    instanceName: "Goblin",
    system: "dnd5e",
    team: "enemies",
    initiative: 10,
    status: "active",
    targetIds: [],
    currentHp: overrides?.targetHp ?? 20,
    maxHp: 20,
    armorClass: overrides?.targetAc ?? 12,
    combatActions: []
  };

  const encounter: CombatEncounter = {
    id: "enc-1",
    name: "Test",
    system: "dnd5e",
    round: 1,
    turnIndex: 0,
    status: "active",
    combatants: [attacker, target],
    pendingAction: null,
    actionHistory: []
  };

  return { encounter, attacker, target, actionId };
}

describe("resolveCombatAction (D&D 5e)", () => {
  it("applies damage on hit when attack meets AC", () => {
    const { encounter, attacker, target, actionId } = makeDndEncounter();
    // d20 → 15 (0.7), d8 → 5 (0.55)
    const result = resolveCombatAction({
      encounter,
      attackerId: attacker.id,
      targetId: target.id,
      actionId,
      random: sequenceRandom([0.7, 0.55])
    });

    assert.equal(result.hit, true);
    assert.equal(result.attackTotal, 20);
    assert.equal(result.damageApplied, 7);
    const updatedTarget = result.encounter.combatants.find((c) => c.id === target.id);
    assert.equal(updatedTarget?.currentHp, 13);
  });

  it("misses on natural 1 without damage", () => {
    const { encounter, attacker, target, actionId } = makeDndEncounter();
    const result = resolveCombatAction({
      encounter,
      attackerId: attacker.id,
      targetId: target.id,
      actionId,
      random: sequenceRandom([0])
    });

    assert.equal(result.hit, false);
    assert.equal(result.damageApplied, 0);
    const updatedTarget = result.encounter.combatants.find((c) => c.id === target.id);
    assert.equal(updatedTarget?.currentHp, 20);
  });

  it("misses when attack total is below AC", () => {
    const { encounter, attacker, target, actionId } = makeDndEncounter({ targetAc: 25 });
    // d20 → 3 (0.1) + 5 = 8
    const result = resolveCombatAction({
      encounter,
      attackerId: attacker.id,
      targetId: target.id,
      actionId,
      random: sequenceRandom([0.1])
    });

    assert.equal(result.hit, false);
    assert.equal(result.damageApplied, 0);
  });
});

describe("resolvePendingCombatAction", () => {
  it("resolves using pending action ids", () => {
    const { encounter, attacker, target, actionId } = makeDndEncounter();
    const withPending: CombatEncounter = {
      ...encounter,
      pendingAction: {
        id: "pending-1",
        combatantId: attacker.id,
        targetId: target.id,
        actionId,
        createdAt: new Date().toISOString()
      }
    };

    const result = resolvePendingCombatAction(withPending, {
      random: sequenceRandom([0.7, 0.55])
    });

    assert.equal(result.hit, true);
    assert.equal(result.encounter.combatants.find((c) => c.id === target.id)?.currentHp, 13);
  });
});
