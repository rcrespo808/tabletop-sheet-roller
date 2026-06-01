"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import {
  applyLongRest,
  applyShortRest,
  describeRestEffects
} from "@/lib/rest/restEngine";
import { createRollLogEntry } from "@/lib/dice/log";
import type { CharacterProfile, RollLogEntry } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";

type CharacterRestControlsProps = {
  profile: CharacterProfile;
  canManage: boolean;
  onProfileChange: (profile: CharacterProfile) => void | Promise<void>;
  onRollLogEntry?: (entry: RollLogEntry) => void | Promise<void>;
};

export function CharacterRestControls({
  profile,
  canManage,
  onProfileChange,
  onRollLogEntry
}: CharacterRestControlsProps) {
  const [pendingRest, setPendingRest] = useState<"short_rest" | "long_rest" | null>(null);

  if (!canManage) return null;

  async function applyRest(restType: "short_rest" | "long_rest") {
    const updated =
      restType === "long_rest" ? applyLongRest(profile) : applyShortRest(profile);
    await onProfileChange(updated);

    if (onRollLogEntry) {
      const label = restType === "long_rest" ? "Long Rest" : "Short Rest";
      await onRollLogEntry(
        createRollLogEntry({
          kind: "system",
          characterName: profile.name,
          actionLabel: label,
          resultText: `${label} applied`,
          details: describeRestEffects(profile, restType).join("\n")
        })
      );
    }

    setPendingRest(null);
  }

  const effects = pendingRest ? describeRestEffects(profile, pendingRest) : [];

  return (
    <GlassPanel level="secondary" className="p-5">
      <h2 className="text-lg font-semibold text-foreground">Rest</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Reset item power charges per rest rules. Long rest restores D&D HP.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/25 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/40"
          onClick={() => setPendingRest("short_rest")}
          type="button"
        >
          <Sun className="h-4 w-4" aria-hidden="true" />
          Short Rest
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-indigo-500/40 bg-indigo-700/25 px-4 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-700/40"
          onClick={() => setPendingRest("long_rest")}
          type="button"
        >
          <Moon className="h-4 w-4" aria-hidden="true" />
          Long Rest
        </button>
      </div>

      {pendingRest ? (
        <div className="mt-4 rounded-md border border-slate-700/30 bg-slate-950/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            Confirm {pendingRest === "long_rest" ? "Long Rest" : "Short Rest"}?
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="h-9 rounded-md border border-purple-500/40 bg-purple-600/25 px-4 text-sm font-semibold text-purple-100"
              onClick={() => applyRest(pendingRest)}
              type="button"
            >
              Apply
            </button>
            <button
              className="h-9 rounded-md border border-slate-600/40 px-4 text-sm text-muted-foreground"
              onClick={() => setPendingRest(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </GlassPanel>
  );
}
