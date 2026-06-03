import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceEncounterTurn,
  clearPendingAction,
  createEncounter,
  nextTurn
} from "@/lib/combat/combatEngine";
import type { Combatant } from "@/lib/combat/types";

function stubCombatant(id: string, name: string): Combatant {
  return {
    id,
    kind: "character",
    instanceName: name,
    system: "dnd5e",
    team: "players",
    initiative: 10,
    status: "active",
    targetIds: [],
    combatActions: [],
    currentHp: 10,
    maxHp: 10
  };
}

describe("advanceEncounterTurn", () => {
  it("clears pending action when advancing", () => {
    const encounter = {
      ...createEncounter("Test", "dnd5e"),
      status: "active" as const,
      combatants: [stubCombatant("a", "A"), stubCombatant("b", "B")],
      pendingAction: {
        id: "pending-1",
        combatantId: "a",
        actionId: "attack-1",
        targetId: "b",
        createdAt: new Date().toISOString()
      }
    };

    const advanced = advanceEncounterTurn(encounter);
    assert.equal(advanced.pendingAction, null);
    assert.equal(advanced.turnIndex, nextTurn(encounter).turnIndex);
  });
});
