"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Dices } from "lucide-react";
import { rollDndExpression, rollDndWithAdvantage } from "@/lib/dice/dnd";
import { createRollLogEntry } from "@/lib/dice/log";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { DndRollMode } from "@/lib/dice/dnd";
import type { GameSystem, RollLogEntry } from "@/lib/sheets/types";
import type { NwodAgain } from "@/lib/dice/types";
import { formatDndRollLog, formatNwodRollLog } from "@/lib/sheets/rollAction";
import { GlassPanel } from "./GlassPanel";

type DiceRollerProps = {
  characterName?: string;
  defaultSystem?: GameSystem;
  onRoll: (entry: RollLogEntry) => void;
};

export function DiceRoller({
  characterName,
  defaultSystem = "dnd5e",
  onRoll
}: DiceRollerProps) {
  const [system, setSystem] = useState<GameSystem>(defaultSystem);
  const [dndExpression, setDndExpression] = useState("1d20+5");
  const [dndRollMode, setDndRollMode] = useState<DndRollMode>("normal");
  const [pool, setPool] = useState(6);
  const [again, setAgain] = useState<NwodAgain>(10);
  const [rote, setRote] = useState(false);
  const [chanceDie, setChanceDie] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (system === "dnd5e") {
        const result =
          dndRollMode === "normal"
            ? rollDndExpression(dndExpression)
            : rollDndWithAdvantage(dndExpression, dndRollMode);
        const formatted = formatDndRollLog(result, dndRollMode);
        onRoll(
          createRollLogEntry({
            kind: "roll",
            characterName,
            actionLabel: "Manual Roll",
            system,
            expression: result.expression,
            ...formatted
          })
        );
        return;
      }

      const effectivePool = chanceDie || pool <= 0 ? 0 : pool;
      const result = rollNwodPool({
        pool: effectivePool,
        again,
        rote,
        chanceDie: chanceDie || pool <= 0
      });
      const label = chanceDie || pool <= 0 ? "Chance Die (manual)" : `Manual pool ${pool}`;
      const formatted = formatNwodRollLog(label, effectivePool, result);
      onRoll(
        createRollLogEntry({
          kind: "roll",
          characterName,
          actionLabel: "Manual Roll",
          system,
          expression: label,
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
        <Dices className="h-5 w-5 text-purple-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Manual Dice</h2>
      </div>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950/60 p-1">
          <button
            className={`h-10 rounded-md text-sm font-semibold transition ${
              system === "dnd5e"
                ? "border border-amber-500/40 bg-amber-500/25 text-amber-100"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            onClick={() => setSystem("dnd5e")}
            type="button"
          >
            D&D 5e
          </button>
          <button
            className={`h-10 rounded-md text-sm font-semibold transition ${
              system === "nwod"
                ? "border border-cyan-500/40 bg-cyan-500/25 text-cyan-100"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            onClick={() => setSystem("nwod")}
            type="button"
          >
            NWoD
          </button>
        </div>

        {system === "dnd5e" ? (
          <>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Expression
              </span>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none transition placeholder:text-slate-600 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                onChange={(event) => setDndExpression(event.target.value)}
                placeholder="1d20+8"
                value={dndExpression}
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["normal", "advantage", "disadvantage"] as DndRollMode[]).map((mode) => (
                <button
                  className={`h-9 rounded-md text-xs font-semibold capitalize transition ${
                    dndRollMode === mode
                      ? "border border-amber-500/40 bg-amber-500/25 text-amber-100"
                      : "border border-slate-700/30 text-muted-foreground hover:bg-white/10"
                  }`}
                  key={mode}
                  onClick={() => setDndRollMode(mode)}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Use Build Pool on the character sheet when available. Manual mode for ad-hoc pools.
            </p>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Pool</span>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                min={0}
                onChange={(event) => setPool(Number(event.target.value))}
                type="number"
                value={pool}
              />
            </label>
            {pool <= 0 ? (
              <p className="text-xs text-cyan-200">Pool ≤ 0 — rolling chance die.</p>
            ) : null}
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Again Rule
              </span>
              <select
                className="mt-2 h-11 w-full rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-foreground outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
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
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-muted-foreground">
                <input
                  checked={rote}
                  className="accent-nwod-teal"
                  onChange={(event) => setRote(event.target.checked)}
                  type="checkbox"
                />
                Rote
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 text-sm text-muted-foreground">
                <input
                  checked={chanceDie}
                  className="accent-nwod-teal"
                  onChange={(event) => setChanceDie(event.target.checked)}
                  type="checkbox"
                />
                Force chance
              </label>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          className={`h-11 w-full rounded-lg border px-4 text-sm font-semibold transition ${
            system === "dnd5e"
              ? "border-amber-500/50 bg-gradient-to-r from-amber-500/35 to-orange-600/35 text-amber-100 hover:from-amber-500/45 hover:to-orange-600/45"
              : "border-cyan-500/50 bg-gradient-to-r from-cyan-500/35 to-cyan-600/35 text-cyan-100 hover:from-cyan-500/45 hover:to-cyan-600/45"
          }`}
          type="submit"
        >
          Roll
        </button>
      </form>
    </GlassPanel>
  );
}
