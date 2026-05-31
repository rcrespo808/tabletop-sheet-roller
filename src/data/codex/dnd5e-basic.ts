import type { CodexEntry } from "@/lib/codex/types";

export const dnd5eBasicCodex: CodexEntry[] = [
  {
    id: "seed-dnd5e-cure-wounds",
    system: "dnd5e",
    type: "spell",
    name: "Cure Wounds",
    subtitle: "Touch healing spell",
    description: "Restore hit points to a creature you touch. Useful when someone is already beside you.",
    rulesText: "Action, touch. Roll healing dice plus spellcasting modifier. Higher slots add more healing dice.",
    tags: ["healing", "spell", "touch"],
    visibility: "public",
    sourceLabel: "D&D 5e SRD/basic reminder",
    actionTemplate: {
      id: "cure-wounds",
      type: "dnd-roll",
      label: "Cure Wounds",
      roll: "1d8+0",
      notes: "Replace +0 with spellcasting modifier; add 1d8 per higher slot.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-healing-word",
    system: "dnd5e",
    type: "spell",
    name: "Healing Word",
    subtitle: "Ranged bonus-action healing",
    description: "Restore a small amount of hit points at range, often used to bring an ally back into the fight.",
    rulesText: "Bonus action, short range. Roll healing dice plus spellcasting modifier. Higher slots add more healing dice.",
    tags: ["healing", "spell", "bonus-action"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "healing-word",
      type: "dnd-roll",
      label: "Healing Word",
      roll: "1d4+0",
      notes: "Replace +0 with spellcasting modifier; add 1d4 per higher slot.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-detect-magic",
    system: "dnd5e",
    type: "spell",
    name: "Detect Magic",
    subtitle: "Magical aura sense",
    description: "Sense nearby magic and identify broad schools or aura types when you can observe the source.",
    rulesText: "Concentration utility spell. The effect is blocked by substantial barriers at the GM's discretion.",
    tags: ["detection", "ritual", "concentration"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "detect-magic",
      type: "note",
      label: "Detect Magic",
      notes: "Concentration utility. Ask what magical auras are present and what kind they appear to be.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-entangle",
    system: "dnd5e",
    type: "spell",
    name: "Entangle",
    subtitle: "Area restraint",
    description: "Grasping plants or similar terrain effects restrain creatures that fail the save.",
    rulesText: "Concentration area control. Targets use a Strength save; restrained targets can attempt to break free.",
    tags: ["control", "concentration", "strength-save"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "entangle-save",
      type: "note",
      label: "Entangle",
      notes: "Targets in the area make a Strength save against your spell save DC or become restrained.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-faerie-fire",
    system: "dnd5e",
    type: "spell",
    name: "Faerie Fire",
    subtitle: "Reveal and expose targets",
    description: "Outline targets in light so attacks against affected creatures are easier and invisible targets can be revealed.",
    rulesText: "Concentration area effect. Targets use a Dexterity save to avoid being outlined.",
    tags: ["support", "concentration", "dexterity-save"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "faerie-fire",
      type: "note",
      label: "Faerie Fire",
      notes: "Dexterity save against spell DC. Failed targets are outlined; attacks against them gain advantage.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-moonbeam",
    system: "dnd5e",
    type: "spell",
    name: "Moonbeam",
    subtitle: "Radiant control column",
    description: "Create a damaging column of moonlight that can punish shapechangers and control space.",
    rulesText: "Concentration. Creatures entering or starting in the area make a Constitution save for radiant damage.",
    tags: ["damage", "radiant", "concentration"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "moonbeam-damage",
      type: "dnd-roll",
      label: "Moonbeam Damage",
      roll: "2d10",
      notes: "Constitution save against spell DC; adjust for slot level.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-pass-without-trace",
    system: "dnd5e",
    type: "spell",
    name: "Pass without Trace",
    subtitle: "Group stealth boost",
    description: "Veil the party in shadow and silence, greatly improving stealth while the spell lasts.",
    rulesText: "Concentration utility. Nearby chosen creatures gain a large Stealth bonus and leave no ordinary tracks.",
    tags: ["stealth", "concentration", "exploration"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "pass-without-trace",
      type: "note",
      label: "Pass without Trace",
      notes: "Concentration. Chosen nearby creatures gain +10 to Dexterity (Stealth) checks.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-counterspell",
    system: "dnd5e",
    type: "spell",
    name: "Counterspell",
    subtitle: "Interrupt spellcasting",
    description: "React to a creature casting a spell and attempt to stop it before it resolves.",
    rulesText: "Reaction. Low-level spells may be stopped automatically; stronger spells may require an ability check.",
    tags: ["reaction", "spell", "defense"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "counterspell-check",
      type: "dnd-roll",
      label: "Counterspell Check",
      roll: "1d20+0",
      notes: "Replace +0 with spellcasting ability modifier when a check is required.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-fireball",
    system: "dnd5e",
    type: "spell",
    name: "Fireball",
    subtitle: "Large burst of fire damage",
    description: "Explode a point you can see into a wide area of fire damage.",
    rulesText: "Dexterity save for half damage. Higher slots add more damage dice.",
    tags: ["damage", "fire", "dexterity-save"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "fireball-damage",
      type: "dnd-roll",
      label: "Fireball Damage",
      roll: "8d6",
      notes: "Dexterity save against spell DC for half damage.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-revivify",
    system: "dnd5e",
    type: "spell",
    name: "Revivify",
    subtitle: "Emergency resurrection",
    description: "Return a recently dead creature to life when the party has the required component and time window.",
    rulesText: "Touch spell with costly material component. Does not restore missing body parts.",
    tags: ["healing", "resurrection", "spell"],
    visibility: "public",
    sourceLabel: "D&D 5e basic reminder",
    actionTemplate: {
      id: "revivify",
      type: "note",
      label: "Revivify",
      notes: "Emergency resurrection reminder: check time since death and required material component.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-war-caster",
    system: "dnd5e",
    type: "feat",
    name: "War Caster",
    description: "A battle-caster feat focused on maintaining magic and casting under pressure.",
    rulesText: "Track concentration help, casting with occupied hands, and spell opportunity reactions as applicable.",
    tags: ["feat", "concentration", "reaction"],
    visibility: "public",
    sourceLabel: "D&D 5e feat reminder",
    actionTemplate: {
      id: "war-caster",
      type: "note",
      label: "War Caster",
      notes: "Remember concentration advantage and spell opportunity reaction options.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-sentinel",
    system: "dnd5e",
    type: "feat",
    name: "Sentinel",
    description: "A battlefield control feat that punishes movement and protects nearby allies.",
    rulesText: "Track opportunity attacks, speed reduction, and reaction attacks when nearby enemies strike allies.",
    tags: ["feat", "reaction", "control"],
    visibility: "public",
    sourceLabel: "D&D 5e feat reminder",
    actionTemplate: {
      id: "sentinel",
      type: "note",
      label: "Sentinel",
      notes: "Reaction control feat. Check opportunity attack and ally-protection triggers.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-polearm-master",
    system: "dnd5e",
    type: "feat",
    name: "Polearm Master",
    description: "A weapon feat for reach control and extra attacks with qualifying polearms.",
    rulesText: "Track bonus-action butt-end attacks and opportunity triggers when creatures enter reach.",
    tags: ["feat", "weapon", "reaction"],
    visibility: "public",
    sourceLabel: "D&D 5e feat reminder",
    actionTemplate: {
      id: "polearm-master",
      type: "note",
      label: "Polearm Master",
      notes: "Track bonus-action polearm attack and enter-reach opportunity trigger.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-resilient",
    system: "dnd5e",
    type: "feat",
    name: "Resilient",
    description: "Improve one ability score and gain proficiency in that ability's saving throws.",
    rulesText: "Choose the ability when granted; update stats and save proficiency manually.",
    tags: ["feat", "save", "stat"],
    visibility: "public",
    sourceLabel: "D&D 5e feat reminder",
    prerequisites: [{ label: "Choose ability", rule: "Set the affected ability before applying." }]
  },
  {
    id: "seed-dnd5e-observant",
    system: "dnd5e",
    type: "feat",
    name: "Observant",
    description: "A perception and investigation focused feat for detail-oriented characters.",
    rulesText: "Track passive score bonuses, lip reading, and the chosen mental ability increase.",
    tags: ["feat", "perception", "investigation"],
    visibility: "public",
    sourceLabel: "D&D 5e feat reminder",
    actionTemplate: {
      id: "observant",
      type: "note",
      label: "Observant",
      notes: "Remember passive Perception/Investigation bonuses and lip-reading utility.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-poisoned",
    system: "dnd5e",
    type: "condition",
    name: "Poisoned",
    description: "A harmful condition that makes attacks and ability checks less reliable.",
    rulesText: "Affected creature has disadvantage on attack rolls and ability checks.",
    tags: ["condition", "debuff"],
    visibility: "public",
    sourceLabel: "D&D 5e condition reminder"
  },
  {
    id: "seed-dnd5e-frightened",
    system: "dnd5e",
    type: "condition",
    name: "Frightened",
    description: "Fear prevents confident action while the source remains relevant.",
    rulesText: "Disadvantage while source is in line of sight; cannot willingly move closer to the source.",
    tags: ["condition", "fear"],
    visibility: "public",
    sourceLabel: "D&D 5e condition reminder"
  },
  {
    id: "seed-dnd5e-grappled",
    system: "dnd5e",
    type: "condition",
    name: "Grappled",
    description: "Movement is locked down by a grappler or similar effect.",
    rulesText: "Speed becomes 0 until the grapple ends or the grappler is moved away.",
    tags: ["condition", "movement"],
    visibility: "public",
    sourceLabel: "D&D 5e condition reminder"
  },
  {
    id: "seed-dnd5e-concentration-reminder",
    system: "dnd5e",
    type: "note",
    name: "Concentration Reminder",
    description: "Use this note to track whether a spell needs concentration and when checks are triggered.",
    rulesText: "Damage, incapacitation, or casting another concentration spell can end concentration.",
    tags: ["concentration", "rules"],
    visibility: "public",
    sourceLabel: "D&D 5e table reminder",
    actionTemplate: {
      id: "concentration-check",
      type: "dnd-roll",
      label: "Concentration Check",
      roll: "1d20+0",
      notes: "Replace +0 with Constitution save bonus. DC is usually 10 or half damage, whichever is higher.",
      source: "custom"
    }
  },
  {
    id: "seed-dnd5e-potion-of-healing",
    system: "dnd5e",
    type: "item",
    name: "Potion of Healing",
    description: "A consumable restorative potion commonly used as treasure or emergency recovery.",
    rulesText: "Drink or administer at the table's normal item-use pace. Roll the healing dice when consumed.",
    tags: ["consumable", "healing", "magic-item"],
    visibility: "public",
    sourceLabel: "D&D 5e item reminder",
    actionTemplate: {
      id: "potion-of-healing",
      type: "dnd-roll",
      label: "Potion of Healing",
      roll: "2d4+2",
      notes: "Healing restored when consumed.",
      source: "custom"
    },
    grants: [
      {
        type: "inventory_item",
        item: {
          id: "potion-of-healing",
          name: "Potion of Healing",
          quantity: 1,
          rarity: "common",
          tags: ["consumable", "healing"]
        }
      }
    ]
  },
  {
    id: "seed-dnd5e-cloak-of-protection",
    system: "dnd5e",
    type: "item",
    name: "Cloak of Protection",
    description: "Protective magic that improves defenses while worn.",
    rulesText: "Track bonus to armor class and saving throws while attuned/worn.",
    tags: ["magic-item", "defense", "attunement"],
    visibility: "public",
    sourceLabel: "D&D 5e magic item reminder",
    grants: [
      { type: "stat_modifier", target: "armorClass", value: 1, mode: "add" },
      {
        type: "inventory_item",
        item: {
          id: "cloak-of-protection",
          name: "Cloak of Protection",
          quantity: 1,
          tags: ["magic-item", "attunement"]
        }
      }
    ]
  },
  {
    id: "seed-dnd5e-amulet-of-health",
    system: "dnd5e",
    type: "item",
    name: "Amulet of Health",
    description: "A magic amulet that fixes the wearer's Constitution at a high value while attuned.",
    rulesText: "Record the Constitution set effect manually on the sheet.",
    tags: ["magic-item", "constitution", "attunement"],
    visibility: "public",
    sourceLabel: "D&D 5e magic item reminder",
    grants: [
      { type: "stat_modifier", target: "constitution", value: 19, mode: "set" },
      {
        type: "inventory_item",
        item: {
          id: "amulet-of-health",
          name: "Amulet of Health",
          quantity: 1,
          tags: ["magic-item", "attunement"]
        }
      }
    ]
  }
];
