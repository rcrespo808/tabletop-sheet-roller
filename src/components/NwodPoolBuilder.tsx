"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Dices } from "lucide-react";
import { createRollLogEntry } from "@/lib/dice/log";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { NwodAgain } from "@/lib/dice/types";
import {
  NWOD_ATTRIBUTE_LABELS,
  NWOD_SKILL_LABELS,
  buildNwodPoolExpression
} from "@/lib/sheets/nwod";
import { formatNwodRollLog } from "@/lib/sheets/rollAction";
import type {
  NwodAttributeKey,
  NwodAttributes,
  NwodSkillKey,
  NwodSkills,
  RollLogEntry,
  SystemSheet
} from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";

type NwodPoolBuilderProps = {
  sheet: SystemSheet;
  characterName: string;
  onRoll: (entry: RollLogEntry) => void;
};

const ATTRIBUTE_KEYS = Object.keys(NWOD_ATTRIBUTE_LABELS) as NwodAttributeKey[];
const SKILL_KEYS = Object.keys(NWOD_SKILL_LABELS) as NwodSkillKey[];

export function NwodPoolBuilder({ sheet, characterName, onRoll }: NwodPoolBuilderProps) {
  const attributes = sheet.attributes as NwodAttributes;
  const skills = sheet.skills as NwodSkills | undefined;
  const [attribute, setAttribute] = useState<NwodAttributeKey>("wits");
  const [skill, setSkill] = useState<NwodSkillKey | "">("");
  const [modifier, setModifier] = useState(0);
  const [again, setAgain] = useState<NwodAgain>(10);
  const [rote, setRote] = useState(false);
  const [chanceDieForced, setChanceDieForced] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const built = buildNwodPoolExpression({
    sheet,
    attribute,
    skill: skill || undefined,
    modifier
  });
  const useChanceDie = chanceDieForced ?? built.chanceDie;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = rollNwodPool({
        pool: useChanceDie ? 0 : built.pool,
        again,
        rote,
        chanceDie: useChanceDie
      });
      const formatted = formatNwodRollLog(built.label, useChanceDie ? 0 : built.pool, result);
      onRoll(
        createRollLogEntry({
          kind: "roll",
          characterName,
          actionLabel: built.label,
          system: "nwod",
          expression: built.label,
          ...formatted
        })
      );
    } catch (rollError) {
      setError(rollError instanceof Error ? rollError.message : "Roll failed.");
    }
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div className="flex items-center gap-2">
        <Dices className="h-5 w-5 text-cyan-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Build Pool</h2>
      </div>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Attribute</span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none focus:border-cyan-500/60"
            onChange={(event) => setAttribute(event.target.value as NwodAttributeKey)}
            value={attribute}
          >
            {ATTRIBUTE_KEYS.map((key) => (
              <option key={key} value={key}>
                {NWOD_ATTRIBUTE_LABELS[key]} ({attributes[key] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Skill (optional)
          </span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none focus:border-cyan-500/60"
            onChange={(event) => setSkill(event.target.value as NwodSkillKey | "")}
            value={skill}
          >
            <option value="">— None —</option>
            {SKILL_KEYS.map((key) => (
              <option key={key} value={key}>
                {NWOD_SKILL_LABELS[key]} ({skills?.[key] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Modifier</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none focus:border-cyan-500/60"
            onChange={(event) => setModifier(Number(event.target.value))}
            type="number"
            value={modifier}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Again Rule</span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none focus:border-cyan-500/60"
            onChange={(event) => {
              const value = event.target.value;
              setAgain(value === "none" ? null : (Number(value) as NwodAgain));
            }}
            value={again === null ? "none" : again}
          >
            <option value={10}>10-again</option>
            <option value={9}>9-again</option>
            <option value={8}>8-again</option>
            <option value="none">No-again</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-muted-foreground">
            <input
              checked={rote}
              className="accent-nwod-teal"
              onChange={(event) => setRote(event.target.checked)}
              type="checkbox"
            />
            Rote
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-muted-foreground">
            <input
              checked={useChanceDie}
              className="accent-nwod-teal"
              onChange={(event) => setChanceDieForced(event.target.checked)}
              type="checkbox"
            />
            Chance die
          </label>
        </div>

        <p className="rounded-md bg-slate-950/50 px-3 py-2 text-xs text-muted-foreground">
          {built.label} · Pool {useChanceDie ? 0 : built.pool}
          {useChanceDie ? " (chance die)" : ""}
        </p>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          className="h-10 w-full rounded-lg border border-cyan-500/50 bg-gradient-to-r from-cyan-500/35 to-cyan-600/35 text-sm font-semibold text-cyan-100 transition hover:from-cyan-500/45 hover:to-cyan-600/45"
          type="submit"
        >
          Roll Pool
        </button>
      </form>
    </GlassPanel>
  );
}
