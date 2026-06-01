"use client";

import type { CharacterProfile, GameSystem, RollLogEntry, SystemSheet } from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";
import type { Dnd5eStats, NwodStats } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";
import { CharacterRestControls } from "./CharacterRestControls";

type CharacterOverviewPanelProps = {
  profile: CharacterProfile;
  sheet: SystemSheet;
  selectedSystem: GameSystem;
  canManage: boolean;
  onProfileChange?: (profile: CharacterProfile) => void | Promise<void>;
  onRollLogEntry?: (entry: RollLogEntry) => void | Promise<void>;
};

export function CharacterOverviewPanel({
  profile,
  sheet,
  selectedSystem,
  canManage,
  onProfileChange,
  onRollLogEntry
}: CharacterOverviewPanelProps) {
  const conditions = profile.conditions ?? [];

  return (
    <div className="space-y-6">
      <GlassPanel level="secondary" glow="medium" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
            {profile.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{profile.subtitle}</p>
            ) : null}
            {profile.concept ? (
              <p className="mt-2 text-sm leading-6 text-slate-300">{profile.concept}</p>
            ) : null}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{sheet.label ?? selectedSystem}</p>
            {sheet.levelLabel ? <p className="mt-1">{sheet.levelLabel}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isDnd5eSheet(sheet) && sheet.stats ? (
            <OverviewStat label="HP" value={formatDndHp(sheet.stats)} />
          ) : null}
          {isDnd5eSheet(sheet) && sheet.stats?.armorClass !== undefined ? (
            <OverviewStat label="AC" value={String(sheet.stats.armorClass)} />
          ) : null}
          {isDnd5eSheet(sheet) && sheet.stats?.initiativeBonus !== undefined ? (
            <OverviewStat
              label="Initiative"
              value={`+${sheet.stats.initiativeBonus}`}
            />
          ) : null}
          {isNwodSheet(sheet) && sheet.stats ? (
            <OverviewStat label="Health" value={formatNwodHealth(sheet.stats)} />
          ) : null}
          {isNwodSheet(sheet) && sheet.stats?.defense !== undefined ? (
            <OverviewStat label="Defense" value={String(sheet.stats.defense)} />
          ) : null}
          {isNwodSheet(sheet) && sheet.stats?.armor !== undefined ? (
            <OverviewStat label="Armor" value={String(sheet.stats.armor)} />
          ) : null}
          {isNwodSheet(sheet) && sheet.stats?.initiative !== undefined ? (
            <OverviewStat label="Initiative" value={String(sheet.stats.initiative)} />
          ) : null}
          {isNwodSheet(sheet) &&
          (sheet.stats?.willpower !== undefined || sheet.stats?.maxWillpower !== undefined) ? (
            <OverviewStat
              label="Willpower"
              value={`${sheet.stats.willpower ?? sheet.stats.maxWillpower}/${sheet.stats.maxWillpower ?? sheet.stats.willpower}`}
            />
          ) : null}
          {isDnd5eSheet(sheet) && sheet.stats?.spellSaveDc !== undefined ? (
            <OverviewStat label="Spell DC" value={String(sheet.stats.spellSaveDc)} />
          ) : null}
        </div>

        {conditions.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conditions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <span
                  className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100"
                  key={condition.id}
                  title={condition.description}
                >
                  {condition.name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">No active conditions.</p>
        )}
      </GlassPanel>

      {onProfileChange ? (
        <CharacterRestControls
          canManage={canManage}
          onProfileChange={onProfileChange}
          onRollLogEntry={onRollLogEntry}
          profile={profile}
        />
      ) : null}
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatDndHp(stats: Dnd5eStats): string {
  return `${stats.currentHp ?? stats.maxHp}/${stats.maxHp ?? stats.currentHp}`;
}

function formatNwodHealth(stats: NwodStats): string {
  return `${stats.health ?? stats.maxHealth}/${stats.maxHealth ?? stats.health}`;
}
