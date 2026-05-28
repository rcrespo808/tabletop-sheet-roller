"use client";

import {
  DND_SKILL_ABILITIES,
  DND_SKILL_LABELS,
  getAbilityModifier,
  getDndSaveBonus,
  getDndSkillBonus
} from "@/lib/sheets/dnd";
import {
  NWOD_ATTRIBUTE_LABELS,
  NWOD_SKILL_DEFAULT_ATTRIBUTE,
  NWOD_SKILL_LABELS,
  getNwodPool
} from "@/lib/sheets/nwod";
import type {
  AbilityKey,
  Dnd5eSkillKey,
  Dnd5eStats,
  NwodAttributeKey,
  NwodSkillKey,
  NwodStats,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { GlassPanel } from "./GlassPanel";

type CharacterStatsPanelProps = {
  sheet: SystemSheet;
  characterName: string;
  onRoll: (entry: RollLogEntry) => void;
};

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

export function CharacterStatsPanel({ sheet, characterName, onRoll }: CharacterStatsPanelProps) {
  if (isDnd5eSheet(sheet) && sheet.attributes) {
    const stats = sheet.stats as Dnd5eStats | undefined;
    const skills = sheet.skills ?? {};

    return (
      <GlassPanel level="secondary" glow="medium" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Character Stats</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITY_KEYS.map((ability) => {
            const score = sheet.attributes![ability];
            const mod = getAbilityModifier(score);
            return (
              <div
                key={ability}
                className="rounded-lg border border-slate-700/30 bg-slate-950/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {ABILITY_LABELS[ability]}
                  </span>
                  <ActionButton
                    action={{
                      id: `stat-dnd-check-${ability}`,
                      type: "dnd-check",
                      label: `${ABILITY_LABELS[ability]} Check`,
                      ability,
                      source: "derived"
                    }}
                    characterName={characterName}
                    compact
                    onRoll={onRoll}
                    selectedSystem="dnd5e"
                    sheet={sheet}
                  />
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">{score}</p>
                <p className="text-xs text-muted-foreground">
                  {mod >= 0 ? `+${mod}` : mod} · Save {getDndSaveBonus(sheet, ability) >= 0 ? "+" : ""}
                  {getDndSaveBonus(sheet, ability)}
                </p>
              </div>
            );
          })}
        </div>

        {stats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {stats.armorClass !== undefined ? <p>AC {stats.armorClass}</p> : null}
            {stats.currentHp !== undefined || stats.maxHp !== undefined ? (
              <p>
                HP {stats.currentHp ?? stats.maxHp}/{stats.maxHp ?? stats.currentHp}
              </p>
            ) : null}
            {stats.speed !== undefined ? <p>Speed {stats.speed} ft</p> : null}
            {stats.initiativeBonus !== undefined ? <p>Init {stats.initiativeBonus >= 0 ? "+" : ""}{stats.initiativeBonus}</p> : null}
            {stats.spellSaveDc !== undefined ? <p>Spell DC {stats.spellSaveDc}</p> : null}
            {stats.spellAttackBonus !== undefined ? (
              <p>Spell Atk {stats.spellAttackBonus >= 0 ? "+" : ""}{stats.spellAttackBonus}</p>
            ) : null}
          </div>
        ) : null}

        {Object.keys(skills).length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Skills</h3>
            {(Object.keys(skills) as Dnd5eSkillKey[]).map((skill) => (
              <div
                key={skill}
                className="flex items-center justify-between rounded-md border border-slate-700/20 bg-slate-950/40 px-3 py-2"
              >
                <span className="text-sm">{DND_SKILL_LABELS[skill]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {getDndSkillBonus(sheet, skill) >= 0 ? "+" : ""}
                    {getDndSkillBonus(sheet, skill)}
                  </span>
                  <ActionButton
                    action={{
                      id: `stat-dnd-skill-${skill}`,
                      type: "dnd-check",
                      label: DND_SKILL_LABELS[skill],
                      ability: skills[skill]?.ability ?? DND_SKILL_ABILITIES[skill],
                      skill,
                      source: "derived"
                    }}
                    characterName={characterName}
                    compact
                    onRoll={onRoll}
                    selectedSystem="dnd5e"
                    sheet={sheet}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </GlassPanel>
    );
  }

  if (isNwodSheet(sheet) && sheet.attributes) {
    const stats = sheet.stats as NwodStats | undefined;
    const skills = sheet.skills ?? {};
    const attributeKeys = Object.keys(NWOD_ATTRIBUTE_LABELS) as NwodAttributeKey[];

    return (
      <GlassPanel level="secondary" glow="medium" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Character Stats</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attributeKeys.map((attribute) => (
            <div
              key={attribute}
              className="rounded-lg border border-slate-700/30 bg-slate-950/50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {NWOD_ATTRIBUTE_LABELS[attribute].slice(0, 3)}
                </span>
                <ActionButton
                  action={{
                    id: `stat-nwod-${attribute}`,
                    type: "nwod-check",
                    label: NWOD_ATTRIBUTE_LABELS[attribute],
                    attribute,
                    again: 10,
                    source: "derived"
                  }}
                  characterName={characterName}
                  compact
                  onRoll={onRoll}
                  selectedSystem="nwod"
                  sheet={sheet}
                />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{sheet.attributes![attribute]}</p>
            </div>
          ))}
        </div>

        {stats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {stats.willpower !== undefined || stats.maxWillpower !== undefined ? (
              <p>
                Willpower {stats.willpower ?? stats.maxWillpower}/{stats.maxWillpower ?? stats.willpower}
              </p>
            ) : null}
            {stats.health !== undefined || stats.maxHealth !== undefined ? (
              <p>
                Health {stats.health ?? stats.maxHealth}/{stats.maxHealth ?? stats.health}
              </p>
            ) : null}
            {stats.defense !== undefined ? <p>Defense {stats.defense}</p> : null}
            {stats.speed !== undefined ? <p>Speed {stats.speed}</p> : null}
            {stats.initiative !== undefined ? <p>Initiative pool {stats.initiative}</p> : null}
          </div>
        ) : null}

        {Object.keys(skills).length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Skills</h3>
            {(Object.keys(skills) as NwodSkillKey[]).map((skill) => {
              const attribute = NWOD_SKILL_DEFAULT_ATTRIBUTE[skill];
              const pool = getNwodPool(sheet, attribute, skill);
              return (
                <div
                  key={skill}
                  className="flex items-center justify-between rounded-md border border-slate-700/20 bg-slate-950/40 px-3 py-2"
                >
                  <span className="text-sm">{NWOD_SKILL_LABELS[skill]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{pool}d10</span>
                    <ActionButton
                      action={{
                        id: `stat-nwod-skill-${skill}`,
                        type: "nwod-check",
                        label: NWOD_SKILL_LABELS[skill],
                        attribute,
                        skill,
                        again: 10,
                        source: "derived"
                      }}
                      characterName={characterName}
                      compact
                      onRoll={onRoll}
                      selectedSystem="nwod"
                      sheet={sheet}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </GlassPanel>
    );
  }

  return null;
}
