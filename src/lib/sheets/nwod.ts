import type {
  NwodAttributeKey,
  NwodSkillKey,
  NwodSkills,
  NwodStats,
  SheetAction,
  SystemSheet
} from "@/lib/sheets/types";
import { isNwodSheet } from "@/lib/sheets/types";

export const NWOD_ATTRIBUTE_LABELS: Record<NwodAttributeKey, string> = {
  intelligence: "Intelligence",
  wits: "Wits",
  resolve: "Resolve",
  strength: "Strength",
  dexterity: "Dexterity",
  stamina: "Stamina",
  presence: "Presence",
  manipulation: "Manipulation",
  composure: "Composure"
};

export const NWOD_SKILL_LABELS: Record<NwodSkillKey, string> = {
  academics: "Academics",
  computer: "Computer",
  crafts: "Crafts",
  investigation: "Investigation",
  medicine: "Medicine",
  occult: "Occult",
  politics: "Politics",
  science: "Science",
  athletics: "Athletics",
  brawl: "Brawl",
  drive: "Drive",
  firearms: "Firearms",
  larceny: "Larceny",
  stealth: "Stealth",
  survival: "Survival",
  animalKen: "Animal Ken",
  empathy: "Empathy",
  expression: "Expression",
  intimidation: "Intimidation",
  persuasion: "Persuasion",
  socialize: "Socialize",
  streetwise: "Streetwise",
  subterfuge: "Subterfuge"
};

export const NWOD_SKILL_DEFAULT_ATTRIBUTE: Record<NwodSkillKey, NwodAttributeKey> = {
  academics: "intelligence",
  computer: "intelligence",
  crafts: "intelligence",
  investigation: "intelligence",
  medicine: "intelligence",
  occult: "intelligence",
  politics: "intelligence",
  science: "intelligence",
  athletics: "strength",
  brawl: "strength",
  drive: "dexterity",
  firearms: "dexterity",
  larceny: "dexterity",
  stealth: "dexterity",
  survival: "wits",
  animalKen: "presence",
  empathy: "presence",
  expression: "presence",
  intimidation: "presence",
  persuasion: "manipulation",
  socialize: "presence",
  streetwise: "wits",
  subterfuge: "manipulation"
};

function getNwodAttributes(sheet: SystemSheet) {
  if (!isNwodSheet(sheet)) return undefined;
  return sheet.attributes;
}

function getNwodSkills(sheet: SystemSheet): NwodSkills | undefined {
  if (!isNwodSheet(sheet)) return undefined;
  return sheet.skills as NwodSkills | undefined;
}

function getNwodStats(sheet: SystemSheet): NwodStats | undefined {
  if (!isNwodSheet(sheet)) return undefined;
  return sheet.stats as NwodStats | undefined;
}

export function getNwodPool(
  sheet: SystemSheet,
  attribute: NwodAttributeKey,
  skill?: NwodSkillKey,
  modifier = 0
): number {
  const attributes = getNwodAttributes(sheet);
  if (!attributes) return Math.max(0, modifier);

  const attributeDots = attributes[attribute] ?? 0;
  const skills = getNwodSkills(sheet);
  const skillDots = skill ? (skills?.[skill] ?? 0) : 0;

  return Math.max(0, attributeDots + skillDots + modifier);
}

export function resolveNwodCheckPool(
  sheet: SystemSheet,
  action: Extract<SheetAction, { type: "nwod-check" }>
): number {
  return getNwodPool(sheet, action.attribute, action.skill, action.modifier ?? 0);
}

export function deriveNwodQuickActions(sheet: SystemSheet): SheetAction[] {
  if (!isNwodSheet(sheet) || !sheet.attributes) return [];

  const actions: SheetAction[] = [];
  const skills = sheet.skills as NwodSkills | undefined;

  if (skills) {
    for (const skill of Object.keys(skills) as NwodSkillKey[]) {
      const attribute = NWOD_SKILL_DEFAULT_ATTRIBUTE[skill];
      actions.push({
        id: `derived-nwod-${attribute}-${skill}`,
        type: "nwod-check",
        label: `${NWOD_ATTRIBUTE_LABELS[attribute]} + ${NWOD_SKILL_LABELS[skill]}`,
        attribute,
        skill,
        again: 10,
        source: "derived"
      });
    }
  }

  const stats = sheet.stats as NwodStats | undefined;
  if (typeof stats?.initiative === "number") {
    actions.push({
      id: "derived-nwod-initiative",
      type: "nwod-pool",
      label: "Initiative",
      pool: stats.initiative,
      again: 10,
      source: "derived"
    });
  } else {
    actions.push({
      id: "derived-nwod-initiative-wits",
      type: "nwod-check",
      label: "Initiative (Wits + Composure)",
      attribute: "wits",
      modifier: sheet.attributes.composure ?? 0,
      again: 10,
      source: "derived"
    });
  }

  if (typeof stats?.willpower === "number" || typeof stats?.maxWillpower === "number") {
    const current = stats?.willpower ?? stats?.maxWillpower ?? 0;
    const max = stats?.maxWillpower ?? stats?.willpower ?? 0;
    actions.push({
      id: "derived-nwod-willpower",
      type: "note",
      label: "Willpower",
      notes: `Willpower ${current}/${max}`,
      source: "derived"
    });
  }

  return actions;
}
