import type { Dnd5eAttributes, GameSystem, NwodAttributes, NwodSkills, SheetAction } from "@/lib/sheets/types";

export type NpcTemplate = {
  id: string;
  name: string;
  system: GameSystem;
  crLabel?: string;
  maxHp?: number;
  armorClass?: number;
  defense?: number;
  armor?: number;
  initiativeBonus?: number;
  initiative?: number;
  stats?: Dnd5eAttributes | NwodAttributes;
  skills?: NwodSkills;
  actions: SheetAction[];
};

export const NPC_TEMPLATES: NpcTemplate[] = [
  {
    id: "kobold-cr1-dnd5e",
    name: "Kobold Skirmisher",
    system: "dnd5e",
    crLabel: "CR 1",
    maxHp: 27,
    armorClass: 14,
    initiativeBonus: 2,
    stats: {
      str: 8,
      dex: 15,
      con: 12,
      int: 8,
      wis: 10,
      cha: 8
    },
    actions: [
      {
        id: "kobold-short-sword",
        type: "dnd-roll",
        label: "Short Sword",
        roll: "1d20+4",
        notes: "Hit: 1d6+2 piercing."
      },
      {
        id: "kobold-sword-damage",
        type: "dnd-roll",
        label: "Short Sword Damage",
        roll: "1d6+2"
      },
      {
        id: "kobold-crossbow",
        type: "dnd-roll",
        label: "Light Crossbow",
        roll: "1d20+4",
        notes: "Hit: 1d8+2 piercing."
      },
      {
        id: "kobold-crossbow-damage",
        type: "dnd-roll",
        label: "Crossbow Damage",
        roll: "1d8+2"
      }
    ]
  },
  {
    id: "kobold-nwod",
    name: "Tunnel Skulk",
    system: "nwod",
    crLabel: "Threat 1",
    maxHp: 6,
    defense: 3,
    armor: 0,
    initiative: 6,
    stats: {
      intelligence: 2,
      wits: 3,
      resolve: 2,
      strength: 2,
      dexterity: 3,
      stamina: 2,
      presence: 1,
      manipulation: 2,
      composure: 3
    },
    skills: {
      athletics: 2,
      brawl: 2,
      firearms: 1,
      stealth: 3,
      survival: 2
    },
    actions: [
      {
        id: "tunnel-skulk-knife",
        type: "nwod-check",
        label: "Rust Knife",
        attribute: "dexterity",
        skill: "brawl",
        modifier: 1,
        again: 10,
        notes: "Close combat knife or crude sword equivalent."
      },
      {
        id: "tunnel-skulk-crossbow",
        type: "nwod-check",
        label: "Hand Crossbow",
        attribute: "dexterity",
        skill: "firearms",
        modifier: 1,
        again: 10,
        notes: "Small crossbow or improvised ranged weapon."
      }
    ]
  }
];

export function getNpcTemplate(id: string): NpcTemplate | undefined {
  return NPC_TEMPLATES.find((template) => template.id === id);
}

export function listNpcTemplates(system?: GameSystem): NpcTemplate[] {
  if (!system) return NPC_TEMPLATES;
  return NPC_TEMPLATES.filter((template) => template.system === system);
}
