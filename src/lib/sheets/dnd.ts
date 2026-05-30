import { formatModifier } from "@/lib/dice/parser";
import type {
  AbilityKey,
  Dnd5eAttributes,
  Dnd5eSkillKey,
  Dnd5eSkills,
  Dnd5eStats,
  SheetAction,
  SystemSheet
} from "@/lib/sheets/types";
import { isDnd5eSheet } from "@/lib/sheets/types";

export const DND_SKILL_ORDER: Dnd5eSkillKey[] = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival"
];

export const DND_ABILITY_SHORT_LABELS: Record<AbilityKey, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

export const DND_SKILL_ABILITIES: Record<Dnd5eSkillKey, AbilityKey> = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis"
};

export const DND_SKILL_LABELS: Record<Dnd5eSkillKey, string> = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival"
};

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getDndAttributes(sheet: SystemSheet): Dnd5eAttributes | undefined {
  if (!isDnd5eSheet(sheet)) return undefined;
  return sheet.attributes as Dnd5eAttributes | undefined;
}

function getDndStats(sheet: SystemSheet): Dnd5eStats | undefined {
  if (!isDnd5eSheet(sheet)) return undefined;
  return sheet.stats as Dnd5eStats | undefined;
}

function getDndSkills(sheet: SystemSheet): Dnd5eSkills | undefined {
  if (!isDnd5eSheet(sheet)) return undefined;
  return sheet.skills as Dnd5eSkills | undefined;
}

export function getAbilityScore(sheet: SystemSheet, ability: AbilityKey): number | undefined {
  return getDndAttributes(sheet)?.[ability];
}

export function getDndSaveBonus(sheet: SystemSheet, ability: AbilityKey): number {
  const score = getAbilityScore(sheet, ability);
  if (score === undefined) return 0;

  let bonus = getAbilityModifier(score);
  const stats = getDndStats(sheet);
  if (stats?.saveProficiencies?.[ability] && stats.proficiencyBonus) {
    bonus += stats.proficiencyBonus;
  }
  return bonus;
}

export function getDndSkillBonus(sheet: SystemSheet, skill: Dnd5eSkillKey): number {
  const skills = getDndSkills(sheet);
  const stats = getDndStats(sheet);
  const skillConfig = skills?.[skill];
  const ability = skillConfig?.ability ?? DND_SKILL_ABILITIES[skill];
  const score = getAbilityScore(sheet, ability);
  if (score === undefined) return 0;

  let bonus = getAbilityModifier(score);
  if (skillConfig?.proficient && stats?.proficiencyBonus) {
    bonus += stats.proficiencyBonus;
  }
  if (skillConfig?.expertise && stats?.proficiencyBonus) {
    bonus += stats.proficiencyBonus;
  }
  if (typeof skillConfig?.bonus === "number") {
    bonus += skillConfig.bonus;
  }
  return bonus;
}

export function buildDndCheckRoll(bonus: number): string {
  return `1d20${formatModifier(bonus)}`;
}

export function resolveDndCheckAction(sheet: SystemSheet, action: Extract<SheetAction, { type: "dnd-check" }>): string {
  const bonus =
    action.modifier ??
    (action.skill
      ? getDndSkillBonus(sheet, action.skill)
      : action.save
        ? getDndSaveBonus(sheet, action.ability)
        : getAbilityModifier(getAbilityScore(sheet, action.ability) ?? 10));

  return buildDndCheckRoll(bonus);
}

export function deriveDndQuickActions(_sheet: SystemSheet): SheetAction[] {
  return [];
}
