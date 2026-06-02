"use client";

import type { Combatant } from "@/lib/combat/types";
import { formatHp, hpResourceLabel } from "@/lib/combat/rpgmDisplay";

export function HpBarWithDelta({
  combatant,
  highlight,
  flashToken
}: {
  combatant: Combatant;
  highlight?: { hpBefore: number; hpAfter: number } | null;
  flashToken?: number | string;
}) {
  const max = combatant.maxHp ?? 0;
  const current = combatant.currentHp ?? 0;
  const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  const showDelta = highlight && highlight.hpBefore !== highlight.hpAfter;
  const tookDamage = showDelta && highlight.hpAfter < highlight.hpBefore;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {hpResourceLabel(combatant)} {formatHp(combatant)}
        </span>
        {showDelta ? (
          <span
            className={`font-semibold tabular-nums ${tookDamage ? "text-red-300" : "text-emerald-300"}`}
            key={flashToken}
          >
            {highlight.hpBefore} → {highlight.hpAfter}
          </span>
        ) : null}
      </div>
      <div
        className={`relative mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ${
          showDelta ? "rpgm-hp-flash" : ""
        }`}
        key={flashToken ? `hp-bar-${flashToken}` : undefined}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${hpResourceLabel(combatant)} ${formatHp(combatant)}`}
      >
        {showDelta ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-slate-500/35"
            style={{
              width: `${max > 0 ? Math.min(100, (highlight.hpBefore / max) * 100) : 0}%`
            }}
          />
        ) : null}
        <div
          className={`relative h-full rounded-full transition-all duration-500 ${
            ratio <= 0.25 ? "bg-red-500" : ratio <= 0.5 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
