"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { rollDndExpression } from "@/lib/dice/dnd";
import { createRollLogEntry } from "@/lib/dice/log";
import { rollNwodPool } from "@/lib/dice/nwod";
import type { GameSystem, RollLogEntry } from "@/lib/sheets/types";
import type { NwodAgain } from "@/lib/dice/types";

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
        const result = rollDndExpression(dndExpression);
        onRoll(
          createRollLogEntry({
            characterName,
            actionLabel: "Manual Roll",
            system,
            expression: result.expression,
            resultText: `Total ${result.total}`,
            details: result.details
          })
        );
        return;
      }

      const result = rollNwodPool({ pool, again, rote, chanceDie });
      onRoll(
        createRollLogEntry({
          characterName,
          actionLabel: "Manual Roll",
          system,
          expression: result.expression,
          resultText: result.dramaticFailure
            ? "Dramatic failure"
            : `${result.successes} ${result.successes === 1 ? "success" : "successes"}`,
          details: result.details
        })
      );
    } catch (rollError) {
      setError(rollError instanceof Error ? rollError.message : "Roll failed.");
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-base font-semibold text-white">Manual Dice</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-zinc-950/70 p-1">
          <button
            className={`h-10 rounded text-sm font-semibold transition ${
              system === "dnd5e"
                ? "bg-dnd-red text-white"
                : "text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
            onClick={() => setSystem("dnd5e")}
            type="button"
          >
            D&D 5e
          </button>
          <button
            className={`h-10 rounded text-sm font-semibold transition ${
              system === "nwod"
                ? "bg-nwod-teal text-charcoal"
                : "text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
            onClick={() => setSystem("nwod")}
            type="button"
          >
            NWoD
          </button>
        </div>

        {system === "dnd5e" ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Expression
            </span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-dnd-gold/70"
              onChange={(event) => setDndExpression(event.target.value)}
              placeholder="1d20+8"
              value={dndExpression}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Pool
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-nwod-teal/70"
                min={0}
                onChange={(event) => setPool(Number(event.target.value))}
                type="number"
                value={pool}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Again Rule
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-nwod-teal/70"
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
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-300">
                <input
                  checked={rote}
                  className="accent-nwod-teal"
                  onChange={(event) => setRote(event.target.checked)}
                  type="checkbox"
                />
                Rote
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-300">
                <input
                  checked={chanceDie}
                  className="accent-nwod-teal"
                  onChange={(event) => setChanceDie(event.target.checked)}
                  type="checkbox"
                />
                Chance
              </label>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          className="h-11 w-full rounded-md bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-zinc-200"
          type="submit"
        >
          Roll
        </button>
      </form>
    </section>
  );
}
