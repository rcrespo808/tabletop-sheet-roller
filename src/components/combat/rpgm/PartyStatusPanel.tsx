"use client";

import { GlassPanel } from "@/components/GlassPanel";
import { CombatantToken } from "@/components/combat/rpgm/CombatantToken";
import { DamagePopup } from "@/components/combat/rpgm/DamagePopup";
import { HpBarWithDelta } from "@/components/combat/rpgm/HpBarWithDelta";
import type { Combatant } from "@/lib/combat/types";
import { STATUS_LABELS, defenseLabel, isDimmedCombatant } from "@/lib/combat/rpgmDisplay";
import { getHpHighlight, type CombatUiFeedback } from "@/lib/combat/rpgmCombatFeedback";

export function PartyStatusPanel({
  party,
  activeCombatantId,
  combatFeedback,
  flashToken,
  onSelectCombatant
}: {
  party: Combatant[];
  activeCombatantId: string | null;
  combatFeedback?: CombatUiFeedback | null;
  flashToken?: number | string;
  onSelectCombatant?: (combatantId: string) => void;
}) {
  return (
    <GlassPanel level="secondary" className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
        Party Status
      </h2>
      {party.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
          No party combatants in this encounter.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {party.map((member) => {
            const isActiveTurn = activeCombatantId === member.id;
            const dimmed = isDimmedCombatant(member.status);
            const hpHighlight = getHpHighlight(combatFeedback ?? null, member.id);
            const damageAmount =
              hpHighlight && hpHighlight.hpAfter < hpHighlight.hpBefore
                ? hpHighlight.hpBefore - hpHighlight.hpAfter
                : hpHighlight?.damageApplied ?? 0;
            const healAmount =
              hpHighlight && hpHighlight.hpAfter > hpHighlight.hpBefore
                ? hpHighlight.hpAfter - hpHighlight.hpBefore
                : 0;

            const Wrapper = onSelectCombatant ? "button" : "div";

            return (
              <Wrapper
                className={`relative flex w-full gap-3 rounded-lg border p-3 text-left ${
                  isActiveTurn
                    ? "border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-400/40"
                    : "border-slate-700/30 bg-slate-950/35"
                } ${dimmed ? "opacity-55" : ""} ${hpHighlight ? "rpgm-hp-flash" : ""} ${
                  onSelectCombatant ? "hover:border-purple-500/35" : ""
                }`}
                key={member.id}
                {...(onSelectCombatant
                  ? { onClick: () => onSelectCombatant(member.id), type: "button" as const }
                  : {})}
              >
                {damageAmount > 0 ? (
                  <DamagePopup amount={damageAmount} flashToken={flashToken} kind="damage" />
                ) : null}
                {healAmount > 0 ? (
                  <DamagePopup amount={healAmount} flashToken={flashToken} kind="healing" />
                ) : null}
                <CombatantToken combatant={member} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{member.instanceName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{defenseLabel(member)}</p>
                  <HpBarWithDelta
                    combatant={member}
                    flashToken={flashToken}
                    highlight={hpHighlight}
                  />
                  <p className="mt-2 text-xs text-slate-200">
                    Status: {STATUS_LABELS[member.status]}
                  </p>
                  {isActiveTurn ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase text-purple-200">
                      Active Turn
                    </p>
                  ) : null}
                  {onSelectCombatant && !isActiveTurn ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">Tap to set active turn</p>
                  ) : null}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
