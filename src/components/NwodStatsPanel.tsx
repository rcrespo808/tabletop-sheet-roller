"use client";

import {
  NWOD_ATTRIBUTE_LABELS,
  NWOD_SKILL_CATEGORY_LABELS,
  NWOD_SKILL_DEFAULT_ATTRIBUTE,
  NWOD_SKILL_LABELS,
  getNwodPool,
  groupNwodSkills
} from "@/lib/sheets/nwod";
import type {
  NwodAttributes,
  NwodSkills,
  NwodStats,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";
import type { NwodSkillCategory } from "@/lib/sheets/nwod";
import { ActionButton } from "./ActionButton";
import { GlassPanel } from "./GlassPanel";
import { NwodPoolBuilder } from "./NwodPoolBuilder";

type NwodStatsPanelProps = {
  sheet: SystemSheet;
  characterName: string;
  onRoll: (entry: RollLogEntry) => void;
};

const CATEGORY_ORDER: NwodSkillCategory[] = ["mental", "physical", "social"];

export function NwodStatsPanel({ sheet, characterName, onRoll }: NwodStatsPanelProps) {
  const attributes = sheet.attributes as NwodAttributes;
  const stats = sheet.stats as NwodStats | undefined;
  const skills = (sheet.skills ?? {}) as NwodSkills;
  const grouped = groupNwodSkills(skills);

  return (
    <div className="space-y-6">
      <NwodPoolBuilder characterName={characterName} onRoll={onRoll} sheet={sheet} />

      <GlassPanel level="secondary" glow="medium" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Character Stats</h2>

        {stats ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {typeof stats.initiative === "number" ? (
              <ActionButton
                action={{
                  id: "stat-nwod-initiative",
                  type: "nwod-pool",
                  label: "Initiative",
                  pool: stats.initiative,
                  again: 10,
                  source: "derived"
                }}
                characterName={characterName}
                onRoll={onRoll}
                selectedSystem="nwod"
                sheet={sheet}
              />
            ) : (
              <ActionButton
                action={{
                  id: "stat-nwod-initiative-wits",
                  type: "nwod-check",
                  label: "Initiative (Wits + Composure)",
                  attribute: "wits",
                  modifier: attributes.composure ?? 0,
                  again: 10,
                  source: "derived"
                }}
                characterName={characterName}
                onRoll={onRoll}
                selectedSystem="nwod"
                sheet={sheet}
              />
            )}
            {typeof stats.willpower === "number" || typeof stats.maxWillpower === "number" ? (
              <ActionButton
                action={{
                  id: "stat-nwod-willpower",
                  type: "note",
                  label: "Willpower",
                  notes: `Willpower ${stats.willpower ?? stats.maxWillpower}/${stats.maxWillpower ?? stats.willpower}`,
                  source: "derived"
                }}
                characterName={characterName}
                onRoll={onRoll}
                selectedSystem="nwod"
                sheet={sheet}
              />
            ) : null}
          </div>
        ) : null}

        {stats ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {stats.health !== undefined || stats.maxHealth !== undefined ? (
              <p>
                Health {stats.health ?? stats.maxHealth}/{stats.maxHealth ?? stats.health}
              </p>
            ) : null}
            {stats.defense !== undefined ? <p>Defense {stats.defense}</p> : null}
            {stats.speed !== undefined ? <p>Speed {stats.speed}</p> : null}
          </div>
        ) : null}

        {CATEGORY_ORDER.map((category) => {
          const categorySkills = grouped[category];
          if (categorySkills.length === 0) return null;

          return (
            <div key={category} className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {NWOD_SKILL_CATEGORY_LABELS[category]}
              </h3>
              {categorySkills.map((skill) => {
                const attribute = NWOD_SKILL_DEFAULT_ATTRIBUTE[skill];
                const pool = getNwodPool(sheet, attribute, skill);

                return (
                  <div
                    key={skill}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-700/20 bg-slate-950/40 px-3 py-2"
                  >
                    <span className="min-w-[7rem] text-sm font-medium">
                      {NWOD_SKILL_LABELS[skill]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {NWOD_ATTRIBUTE_LABELS[attribute].slice(0, 3)} · {pool} dice
                    </span>
                    <div className="ml-auto">
                      <ActionButton
                        action={{
                          id: `stat-nwod-skill-${skill}`,
                          type: "nwod-check",
                          label: `${NWOD_ATTRIBUTE_LABELS[attribute]} + ${NWOD_SKILL_LABELS[skill]}`,
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
          );
        })}

        {Object.keys(skills).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No skills configured on this sheet.</p>
        ) : null}
      </GlassPanel>
    </div>
  );
}
