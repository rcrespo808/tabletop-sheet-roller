import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCombatActionsFromCharacter } from "@/lib/combat/characterCombatActions";
import { characterImportTemplate } from "@/data/characterImportTemplate";
import {
  migrateCharacterForCombat,
  migrateSheetActionsForCombat,
  sheetActionHasCombatAttack
} from "@/lib/sheets/sheetActionCombat";
import type { SheetAction } from "@/lib/sheets/types";

describe("migrateSheetActionsForCombat", () => {
  it("merges split D&D attack and damage rows", () => {
    const actions: SheetAction[] = [
      {
        id: "test-attack",
        type: "dnd-roll",
        label: "Test Attack",
        roll: "1d20+5"
      },
      {
        id: "test-attack-damage",
        type: "dnd-roll",
        label: "Test Damage",
        roll: "1d8+2"
      }
    ];

    const migrated = migrateSheetActionsForCombat(actions, "dnd5e");
    assert.equal(migrated.length, 1);
    assert.equal(migrated[0]?.metadata?.combatKind, "attack");
    assert.equal(migrated[0]?.metadata?.attackRoll, "1d20+5");
    assert.equal(migrated[0]?.metadata?.damageRoll, "1d8+2");
    assert.ok(sheetActionHasCombatAttack(migrated[0]!));
  });

  it("assigns combat categories for checks and notes", () => {
    const actions: SheetAction[] = [
      {
        id: "skill-check",
        type: "dnd-check",
        label: "Insight",
        ability: "wis",
        skill: "insight"
      },
      {
        id: "power-note",
        type: "note",
        label: "Silence Field",
        notes: "Area control"
      }
    ];

    const migrated = migrateSheetActionsForCombat(actions, "dnd5e");
    assert.equal(migrated[0]?.metadata?.combatCategory, "skill");
    assert.equal(migrated[1]?.metadata?.combatCategory, "power");
  });
});

describe("combat action extraction", () => {
  it("produces fight attacks from import template", () => {
    const migrated = migrateCharacterForCombat(characterImportTemplate);
    const combatActions = getCombatActionsFromCharacter(migrated, "dnd5e");
    const fights = combatActions.filter((action) => action.kind === "attack");
    assert.ok(fights.length >= 1);
  });
});
