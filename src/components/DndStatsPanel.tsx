"use client";

import { Dices } from "lucide-react";
import {
  DND_ABILITY_SHORT_LABELS,
  DND_SKILL_ABILITIES,
  DND_SKILL_LABELS,
  DND_SKILL_ORDER,
  getAbilityModifier,
  getDndSaveBonus,
  getDndSkillBonus
} from "@/lib/sheets/dnd";
import { executeSheetAction } from "@/lib/sheets/rollAction";
import type {
  AbilityKey,
  Dnd5eAttributes,
  Dnd5eSkillKey,
  Dnd5eSkills,
  Dnd5eStats,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { GlassPanel } from "./GlassPanel";

type DndStatsPanelProps = {
  sheet: SystemSheet;
  characterName: string;
  onRoll: (entry: RollLogEntry) => void;
};

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

function RollTextButton({
  label,
  onClick,
  variant = "check"
}: {
  label: string;
  onClick: () => void;
  variant?: "check" | "save";
}) {
  const className =
    variant === "save"
      ? "border-blue-500/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
      : "border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25";

  return (
    <button
      className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold transition ${className}`}
      onClick={onClick}
      type="button"
    >
      {label}
      <Dices className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function SkillProficiencyBadge({ skillConfig }: { skillConfig?: Dnd5eSkills[Dnd5eSkillKey] }) {
  if (skillConfig?.expertise) {
    return (
      <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-100">
        Expertise
      </span>
    );
  }
  if (skillConfig?.proficient) {
    return (
      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-100">
        Proficient
      </span>
    );
  }
  if (typeof skillConfig?.bonus === "number" && skillConfig.bonus !== 0) {
    return (
      <span className="rounded-full border border-slate-500/40 bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
        +{skillConfig.bonus} custom
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

export function DndStatsPanel({ sheet, characterName, onRoll }: DndStatsPanelProps) {
  const attributes = sheet.attributes as Dnd5eAttributes;
  const stats = sheet.stats as Dnd5eStats | undefined;
  const skills = (sheet.skills ?? {}) as Dnd5eSkills;
  const skillKeys = DND_SKILL_ORDER.filter((skill) => skill in skills);

  function rollAbility(ability: AbilityKey, save: boolean) {
    onRoll(
      executeSheetAction(
        sheet,
        {
          id: `stat-dnd-${save ? "save" : "check"}-${ability}`,
          type: "dnd-check",
          label: `${DND_ABILITY_SHORT_LABELS[ability]} ${save ? "Save" : "Check"}`,
          ability,
          save,
          source: "derived"
        },
        characterName,
        "dnd5e"
      )
    );
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <h2 className="text-lg font-semibold text-foreground">Character Stats</h2>

      <div className="mt-4 space-y-2">
        {ABILITY_KEYS.map((ability) => {
          const score = attributes[ability];
          const checkMod = getAbilityModifier(score);
          const saveBonus = getDndSaveBonus(sheet, ability);
          const saveDiffers = saveBonus !== checkMod;

          return (
            <div
              key={ability}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-950/50 px-3 py-2.5"
            >
              <span className="w-10 text-sm font-bold uppercase text-foreground">
                {DND_ABILITY_SHORT_LABELS[ability]}
              </span>
              <span className="w-8 text-sm text-muted-foreground">{score}</span>
              <span className="min-w-[3rem] text-sm font-semibold text-purple-100">
                {checkMod >= 0 ? `+${checkMod}` : checkMod}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <RollTextButton label="Check" onClick={() => rollAbility(ability, false)} />
                <RollTextButton
                  label={saveDiffers ? `Save ${saveBonus >= 0 ? "+" : ""}${saveBonus}` : "Save"}
                  onClick={() => rollAbility(ability, true)}
                  variant="save"
                />
              </div>
            </div>
          );
        })}
      </div>

      {stats ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {typeof stats.initiativeBonus === "number" ? (
            <ActionButton
              action={{
                id: "stat-dnd-initiative",
                type: "dnd-roll",
                label: "Initiative",
                roll: `1d20${stats.initiativeBonus >= 0 ? "+" : ""}${stats.initiativeBonus}`,
                source: "derived"
              }}
              characterName={characterName}
              onRoll={onRoll}
              selectedSystem="dnd5e"
              sheet={sheet}
            />
          ) : null}
          {typeof stats.spellAttackBonus === "number" ? (
            <ActionButton
              action={{
                id: "stat-dnd-spell-attack",
                type: "dnd-roll",
                label: "Spell Attack",
                roll: `1d20${stats.spellAttackBonus >= 0 ? "+" : ""}${stats.spellAttackBonus}`,
                source: "derived"
              }}
              characterName={characterName}
              onRoll={onRoll}
              selectedSystem="dnd5e"
              sheet={sheet}
            />
          ) : null}
          {typeof stats.spellSaveDc === "number" ? (
            <ActionButton
              action={{
                id: "stat-dnd-spell-dc",
                type: "note",
                label: "Spell Save DC",
                notes: `Spell save DC ${stats.spellSaveDc}`,
                source: "derived"
              }}
              characterName={characterName}
              onRoll={onRoll}
              selectedSystem="dnd5e"
              sheet={sheet}
            />
          ) : null}
        </div>
      ) : null}

      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          {stats.armorClass !== undefined ? <p>AC {stats.armorClass}</p> : null}
          {stats.currentHp !== undefined || stats.maxHp !== undefined ? (
            <p>
              HP {stats.currentHp ?? stats.maxHp}/{stats.maxHp ?? stats.currentHp}
            </p>
          ) : null}
          {stats.speed !== undefined ? <p>Speed {stats.speed} ft</p> : null}
          {stats.proficiencyBonus !== undefined ? (
            <p>Proficiency +{stats.proficiencyBonus}</p>
          ) : null}
        </div>
      ) : null}

      {skillKeys.length > 0 ? (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Skills</h3>
          {skillKeys.map((skill) => {
            const skillConfig = skills[skill];
            const ability = skillConfig?.ability ?? DND_SKILL_ABILITIES[skill];
            const bonus = getDndSkillBonus(sheet, skill);

            return (
              <div
                key={skill}
                className="flex flex-wrap items-center gap-2 rounded-md border border-slate-700/20 bg-slate-950/40 px-3 py-2"
              >
                <span className="min-w-[7rem] text-sm font-medium">{DND_SKILL_LABELS[skill]}</span>
                <span className="text-xs uppercase text-muted-foreground">
                  {DND_ABILITY_SHORT_LABELS[ability]}{" "}
                  <span className="font-semibold text-purple-100">
                    {bonus >= 0 ? `+${bonus}` : bonus}
                  </span>
                </span>
                <SkillProficiencyBadge skillConfig={skillConfig} />
                <div className="ml-auto">
                  <ActionButton
                    action={{
                      id: `stat-dnd-skill-${skill}`,
                      type: "dnd-check",
                      label: `${DND_SKILL_LABELS[skill]} Check`,
                      ability,
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
            );
          })}
        </div>
      ) : null}
    </GlassPanel>
  );
}
