"use client";

import { CombatantToken } from "@/components/combat/rpgm/CombatantToken";
import { DamagePopup } from "@/components/combat/rpgm/DamagePopup";
import { HpBarWithDelta } from "@/components/combat/rpgm/HpBarWithDelta";
import type { Combatant } from "@/lib/combat/types";
import {
  STATUS_LABELS,
  TEAM_LABELS,
  defenseLabel,
  isDimmedCombatant
} from "@/lib/combat/rpgmDisplay";

export function TargetCard({
  combatant,
  flashToken,
  hpHighlight,
  isSelected,
  isTargetable,
  onSelect
}: {
  combatant: Combatant;
  flashToken?: number | string;
  hpHighlight?: { hpBefore: number; hpAfter: number; damageApplied?: number } | null;
  isSelected: boolean;
  isTargetable: boolean;
  onSelect?: () => void;
}) {
  const dimmed = isDimmedCombatant(combatant.status);
  const disabled = !onSelect || !isTargetable || dimmed;
  const Wrapper = onSelect ? "button" : "div";
  const damageAmount =
    hpHighlight && hpHighlight.hpAfter < hpHighlight.hpBefore
      ? hpHighlight.hpBefore - hpHighlight.hpAfter
      : hpHighlight?.damageApplied ?? 0;
  const healAmount =
    hpHighlight && hpHighlight.hpAfter > hpHighlight.hpBefore
      ? hpHighlight.hpAfter - hpHighlight.hpBefore
      : 0;

  return (
    <Wrapper
      aria-pressed={onSelect ? isSelected : undefined}
      className={`relative min-w-[9.5rem] shrink-0 rounded-lg border p-3 text-left transition ${
        isSelected
          ? "border-amber-400/70 bg-amber-500/15 ring-2 ring-amber-400/50"
          : "border-slate-700/30 bg-slate-950/40 hover:border-slate-500/50"
      } ${dimmed ? "opacity-50" : ""} ${!isTargetable ? "cursor-default opacity-65" : ""} ${
        hpHighlight ? "rpgm-hp-flash" : ""
      }`}
      {...(onSelect
        ? { disabled, onClick: onSelect, type: "button" as const }
        : { role: "group" })}
    >
      {damageAmount > 0 ? (
        <DamagePopup amount={damageAmount} flashToken={flashToken} kind="damage" />
      ) : null}
      {healAmount > 0 ? (
        <DamagePopup amount={healAmount} flashToken={flashToken} kind="healing" />
      ) : null}
      <CombatantToken combatant={combatant} size="md" />
      <p className="mt-2 truncate text-sm font-semibold text-foreground">{combatant.instanceName}</p>
      <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{TEAM_LABELS[combatant.team]}</p>
      <HpBarWithDelta combatant={combatant} flashToken={flashToken} highlight={hpHighlight} />
      <p className="mt-1 text-xs text-muted-foreground">{defenseLabel(combatant)}</p>
      <p className="mt-1 text-xs font-medium text-slate-200">Status: {STATUS_LABELS[combatant.status]}</p>
      {isSelected ? (
        <p className="mt-2 text-[10px] font-semibold uppercase text-amber-200">Selected</p>
      ) : isTargetable && onSelect ? (
        <p className="mt-2 text-[10px] text-muted-foreground">Tap to target</p>
      ) : !onSelect ? null : (
        <p className="mt-2 text-[10px] text-muted-foreground">Not a valid target</p>
      )}
    </Wrapper>
  );
}
