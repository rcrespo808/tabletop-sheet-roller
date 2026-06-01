import type {
  Dnd5eAttributes,
  GameSystem,
  NwodAttributes,
  NwodSkills
} from "@/lib/sheets/types";
import type { CombatAction } from "@/lib/combat/types";

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
  actions: CombatAction[];
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
        system: "dnd5e",
        kind: "attack",
        label: "Short Sword",
        attackRoll: "1d20+4",
        damageRoll: "1d6+2",
        damageType: "piercing",
        notes: "Hit: 1d6+2 piercing."
      },
      {
        id: "kobold-sword-damage",
        system: "dnd5e",
        kind: "attack",
        label: "Light Crossbow",
        attackRoll: "1d20+4",
        damageRoll: "1d8+2",
        damageType: "piercing",
        notes: "Hit: 1d8+2 piercing."
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
        id: "tunnel-skulk-rust-knife",
        system: "nwod",
        kind: "attack",
        label: "Rust Knife",
        attribute: "dexterity",
        skill: "brawl",
        modifier: 1,
        damage: 1,
        again: 10,
        notes: "Close combat knife or crude sword equivalent."
      },
      {
        id: "tunnel-skulk-hand-crossbow",
        system: "nwod",
        kind: "attack",
        label: "Hand Crossbow",
        attribute: "dexterity",
        skill: "firearms",
        modifier: 1,
        damage: 2,
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
