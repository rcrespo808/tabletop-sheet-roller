import type { CodexEntry } from "@/lib/codex/types";

export const nwodBasicCodex: CodexEntry[] = [
  {
    id: "seed-nwod-rote-action",
    system: "nwod",
    type: "note",
    name: "Rote Action",
    description: "A trained or ritualized action that lets failed dice be rerolled once.",
    rulesText: "When marked rote, reroll failed dice one time and keep new successes.",
    tags: ["mechanic", "dice", "rote"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-10-again",
    system: "nwod",
    type: "note",
    name: "10-again",
    description: "Dice showing 10 count as successes and are rolled again.",
    tags: ["mechanic", "dice", "again"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-9-again",
    system: "nwod",
    type: "note",
    name: "9-again",
    description: "Dice showing 9 or 10 count as successes and are rolled again.",
    tags: ["mechanic", "dice", "again"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-8-again",
    system: "nwod",
    type: "note",
    name: "8-again",
    description: "Dice showing 8, 9, or 10 count as successes and are rolled again.",
    tags: ["mechanic", "dice", "again"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-chance-die",
    system: "nwod",
    type: "note",
    name: "Chance Die",
    description: "When penalties reduce a pool too far, roll one die with special success/failure handling.",
    rulesText: "Use the app's chance die flag for pools reduced to a chance roll.",
    tags: ["mechanic", "dice"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-dramatic-failure",
    system: "nwod",
    type: "note",
    name: "Dramatic Failure",
    description: "A severe failure outcome that gives the GM permission to introduce a hard consequence.",
    tags: ["mechanic", "failure", "gm"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-willpower-spend",
    system: "nwod",
    type: "note",
    name: "Willpower Spend",
    description: "Spend Willpower for a significant effort boost when the fiction supports it.",
    rulesText: "Usually adds bonus dice or improves resistance depending on table rules.",
    tags: ["mechanic", "willpower"],
    visibility: "public",
    sourceLabel: "NWoD table reminder"
  },
  {
    id: "seed-nwod-allies",
    system: "nwod",
    type: "merit",
    name: "Allies",
    description: "A group or institution that can provide aid, pressure, or access.",
    rulesText: "Record the group and rating. Ask what favor is plausible and what it costs.",
    tags: ["merit", "social"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder",
    prerequisites: [{ label: "Define group" }]
  },
  {
    id: "seed-nwod-contacts",
    system: "nwod",
    type: "merit",
    name: "Contacts",
    description: "People who provide rumors, leads, and specialized information.",
    rulesText: "Record contact fields and use them to ask targeted questions.",
    tags: ["merit", "social", "information"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder",
    prerequisites: [{ label: "Define fields" }]
  },
  {
    id: "seed-nwod-resources",
    system: "nwod",
    type: "merit",
    name: "Resources",
    description: "Disposable wealth, lifestyle, and purchasing leverage.",
    rulesText: "Use as a spending and access yardstick; exact purchases remain table adjudication.",
    tags: ["merit", "wealth"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder"
  },
  {
    id: "seed-nwod-striking-looks",
    system: "nwod",
    type: "merit",
    name: "Striking Looks",
    description: "Memorable appearance that can help social rolls when appearance matters.",
    rulesText: "Apply when the target can see the character and the situation makes looks relevant.",
    tags: ["merit", "social"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder"
  },
  {
    id: "seed-nwod-fleet-of-foot",
    system: "nwod",
    type: "merit",
    name: "Fleet of Foot",
    description: "A speed-focused merit for characters who move quickly on foot.",
    rulesText: "Record the speed adjustment manually on the sheet.",
    tags: ["merit", "movement"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder"
  },
  {
    id: "seed-nwod-danger-sense",
    system: "nwod",
    type: "merit",
    name: "Danger Sense",
    description: "Instinct for immediate threats, ambushes, and sudden peril.",
    rulesText: "Use as a reminder to ask for or modify surprise/ambush perception rolls.",
    tags: ["merit", "perception"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder",
    actionTemplate: {
      id: "danger-sense",
      type: "nwod-check",
      label: "Danger Sense",
      attribute: "wits",
      skill: "survival",
      modifier: 0,
      again: 10,
      notes: "Use for sudden threat detection; adjust the skill if your table uses Wits + Composure.",
      source: "custom"
    }
  },
  {
    id: "seed-nwod-encyclopedic-knowledge",
    system: "nwod",
    type: "merit",
    name: "Encyclopedic Knowledge",
    description: "Broad recall of useful facts, trivia, and obscure background details.",
    rulesText: "Roll or ask when the character might know a relevant fact without research.",
    tags: ["merit", "knowledge"],
    visibility: "public",
    sourceLabel: "NWoD merit reminder",
    actionTemplate: {
      id: "encyclopedic-knowledge",
      type: "nwod-check",
      label: "Encyclopedic Knowledge",
      attribute: "intelligence",
      modifier: 0,
      again: 10,
      notes: "Recall useful facts the character may have picked up.",
      source: "custom"
    }
  },
  {
    id: "seed-nwod-sickened",
    system: "nwod",
    type: "condition",
    name: "Sickened",
    description: "Illness or nausea interferes with action until treated or endured.",
    rulesText: "Apply a situational penalty and define what clears it.",
    tags: ["condition", "disease"],
    visibility: "public",
    sourceLabel: "NWoD condition reminder"
  },
  {
    id: "seed-nwod-spooked",
    system: "nwod",
    type: "condition",
    name: "Spooked",
    description: "Fearful pressure makes the character jumpy and reactive.",
    rulesText: "Use to color choices and apply penalties when panic is relevant.",
    tags: ["condition", "fear"],
    visibility: "public",
    sourceLabel: "NWoD condition reminder"
  },
  {
    id: "seed-nwod-shaken",
    system: "nwod",
    type: "condition",
    name: "Shaken",
    description: "A frightening or traumatic moment disrupts confidence.",
    rulesText: "Apply to mental/social composure under pressure until resolved.",
    tags: ["condition", "fear"],
    visibility: "public",
    sourceLabel: "NWoD condition reminder"
  },
  {
    id: "seed-nwod-informed",
    system: "nwod",
    type: "condition",
    name: "Informed",
    description: "The character has useful research, leverage, or context for a topic.",
    rulesText: "Spend or resolve when the information gives a meaningful advantage.",
    tags: ["condition", "information"],
    visibility: "public",
    sourceLabel: "NWoD condition reminder"
  },
  {
    id: "seed-nwod-leveraged",
    system: "nwod",
    type: "condition",
    name: "Leveraged",
    description: "Someone has pressure, blackmail, obligation, or social control over the character.",
    rulesText: "Define who holds the leverage, what they want, and how it can be cleared.",
    tags: ["condition", "social", "gm"],
    visibility: "campaign",
    sourceLabel: "NWoD condition reminder"
  }
];
