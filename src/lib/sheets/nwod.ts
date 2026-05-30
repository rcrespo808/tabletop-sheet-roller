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

export function deriveNwodQuickActions(_sheet: SystemSheet): SheetAction[] {
  return [];
}

const NWOD_MENTAL_ATTRIBUTES: NwodAttributeKey[] = ["intelligence", "wits", "resolve"];
const NWOD_PHYSICAL_ATTRIBUTES: NwodAttributeKey[] = ["strength", "dexterity", "stamina"];
const NWOD_SOCIAL_ATTRIBUTES: NwodAttributeKey[] = ["presence", "manipulation", "composure"];

export type NwodSkillCategory = "mental" | "physical" | "social";

export function getNwodSkillCategory(skill: NwodSkillKey): NwodSkillCategory {
  const attribute = NWOD_SKILL_DEFAULT_ATTRIBUTE[skill];
  if (NWOD_MENTAL_ATTRIBUTES.includes(attribute)) return "mental";
  if (NWOD_PHYSICAL_ATTRIBUTES.includes(attribute)) return "physical";
  return "social";
}

export const NWOD_SKILL_CATEGORY_LABELS: Record<NwodSkillCategory, string> = {
  mental: "Mental",
  physical: "Physical",
  social: "Social"
};

export function groupNwodSkills(skills: NwodSkills): Record<NwodSkillCategory, NwodSkillKey[]> {
  const grouped: Record<NwodSkillCategory, NwodSkillKey[]> = {
    mental: [],
    physical: [],
    social: []
  };

  for (const skill of Object.keys(skills) as NwodSkillKey[]) {
    grouped[getNwodSkillCategory(skill)].push(skill);
  }

  for (const category of Object.keys(grouped) as NwodSkillCategory[]) {
    grouped[category].sort((left, right) =>
      NWOD_SKILL_LABELS[left].localeCompare(NWOD_SKILL_LABELS[right])
    );
  }

  return grouped;
}

export type BuildNwodPoolExpressionArgs = {
  sheet: SystemSheet;
  attribute: NwodAttributeKey;
  skill?: NwodSkillKey;
  modifier?: number;
};

function formatNwodPoolLabel(
  attribute: NwodAttributeKey,
  skill?: NwodSkillKey,
  modifier = 0
): string {
  const segments = [NWOD_ATTRIBUTE_LABELS[attribute]];
  if (skill) segments.push(NWOD_SKILL_LABELS[skill]);

  let label = segments.join(" + ");
  if (modifier > 0) label += ` + ${modifier}`;
  if (modifier < 0) label += ` - ${Math.abs(modifier)}`;
  return label;
}

export function buildNwodPoolExpression(args: BuildNwodPoolExpressionArgs): {
  label: string;
  pool: number;
  chanceDie: boolean;
} {
  const { sheet, attribute, skill, modifier = 0 } = args;
  const attributeDots = getNwodAttributes(sheet)?.[attribute] ?? 0;
  const skillDots = skill ? (getNwodSkills(sheet)?.[skill] ?? 0) : 0;
  const rawPool = attributeDots + skillDots + modifier;
  const chanceDie = rawPool <= 0;
  const baseLabel = formatNwodPoolLabel(attribute, skill, modifier);

  return {
    label: chanceDie ? `Chance Die: ${baseLabel}` : baseLabel,
    pool: Math.max(0, rawPool),
    chanceDie
  };
}
