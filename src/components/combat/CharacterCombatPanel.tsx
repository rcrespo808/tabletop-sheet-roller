"use client";

import Link from "next/link";
import { RefreshCw, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { getSystemSheet } from "@/data/characters";
import { getCurrentAuthState, type AuthState } from "@/lib/auth/supabaseAuth";
import { listEncounters } from "@/lib/combat/combatRepository";
import type {
  CombatEncounter,
  Combatant,
  CombatStatus,
  CombatTeam
} from "@/lib/combat/types";
import type {
  CharacterProfile,
  Dnd5eStats,
  GameSystem,
  NwodStats
} from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";

const TEAM_LABELS: Record<CombatTeam, string> = {
  players: "Players",
  enemies: "Enemies",
  allies: "Allies",
  neutral: "Neutral"
};

const STATUS_LABELS: Record<CombatStatus, string> = {
  active: "Active",
  down: "Down",
  dead: "Dead",
  fled: "Fled",
  hidden: "Hidden"
};

function defenseLabel(combatant: Combatant): string {
  if (combatant.system === "dnd5e") return `AC ${combatant.armorClass ?? "--"}`;
  return `Defense ${combatant.defense ?? "--"}`;
}

function getSheetHp(profile: CharacterProfile, selectedSystem: GameSystem): string {
  const sheet = getSystemSheet(profile, selectedSystem);
  if (!sheet) return "--/--";

  if (isDnd5eSheet(sheet)) {
    const stats = sheet.stats as Dnd5eStats | undefined;
    return `${stats?.currentHp ?? stats?.maxHp ?? "--"}/${stats?.maxHp ?? "--"}`;
  }

  if (isNwodSheet(sheet)) {
    const stats = sheet.stats as NwodStats | undefined;
    return `${stats?.health ?? stats?.maxHealth ?? "--"}/${stats?.maxHealth ?? "--"}`;
  }

  return "--/--";
}

function findCharacterCombatant(
  encounter: CombatEncounter,
  characterId: string
): Combatant | null {
  return (
    encounter.combatants.find(
      (combatant) => combatant.kind === "character" && combatant.sourceId === characterId
    ) ?? null
  );
}

export function CharacterCombatPanel({
  profile,
  selectedSystem
}: {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
}) {
  const [encounters, setEncounters] = useState<CombatEncounter[]>([]);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshCombatState() {
    const [loadedEncounters, loadedAuthState] = await Promise.all([
      listEncounters(),
      getCurrentAuthState()
    ]);
    setEncounters(loadedEncounters);
    setAuthState(loadedAuthState);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listEncounters(), getCurrentAuthState()])
      .then(([loadedEncounters, loadedAuthState]) => {
        if (cancelled) return;
        setEncounters(loadedEncounters);
        setAuthState(loadedAuthState);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeParticipation =
    encounters.reduce<{ encounter: CombatEncounter; combatant: Combatant } | null>(
      (match, encounter) => {
        if (match || encounter.status !== "active") return match;
        const combatant = findCharacterCombatant(encounter, profile.id);
        return combatant ? { encounter, combatant } : null;
      },
      null
    );

  if (loading || !activeParticipation) return null;

  const { encounter, combatant } = activeParticipation;
  const activeCombatant = encounter.combatants[encounter.turnIndex] ?? null;
  const currentTarget =
    combatant.targetIds
      .map((id) => encounter.combatants.find((entry) => entry.id === id)?.instanceName)
      .filter(Boolean)
      .join(", ") || "None";
  const isGm = authState?.profile?.userLevel === "gm";

  return (
    <GlassPanel level="secondary" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/30 bg-red-700/20 text-red-100">
            <Swords className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Combat</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{encounter.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Round {encounter.round} / Active: {activeCombatant?.instanceName ?? "None"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 px-3 text-sm font-semibold text-slate-100"
            onClick={() => void refreshCombatState()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh Combat State
          </button>
          <Link
            className="inline-flex h-10 items-center rounded-md border border-cyan-500/35 bg-cyan-700/20 px-3 text-sm font-semibold text-cyan-100"
            href="/combat"
          >
            Open Combat
          </Link>
          {isGm ? (
            <Link
              className="inline-flex h-10 items-center rounded-md border border-purple-500/35 bg-purple-700/20 px-3 text-sm font-semibold text-purple-100"
              href="/combat"
            >
              Open GM View
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-700/25 bg-slate-950/35 p-4">
          <p className="text-sm font-semibold text-foreground">Your Combat State</p>
          <p className="mt-3 text-lg font-semibold text-foreground">{combatant.instanceName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Combat HP {combatant.currentHp ?? "--"}/{combatant.maxHp ?? "--"} /{" "}
            {defenseLabel(combatant)} / {STATUS_LABELS[combatant.status]}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sheet HP {getSheetHp(profile, selectedSystem)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Current Target: {currentTarget}</p>
        </div>

        <div className="rounded-md border border-slate-700/25 bg-slate-950/35 p-4">
          <p className="text-sm font-semibold text-foreground">Combatants</p>
          <div className="mt-3 space-y-2">
            {encounter.combatants.map((entry) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/20 bg-slate-900/45 px-3 py-2 text-sm"
                key={entry.id}
              >
                <span className="font-medium text-foreground">{entry.instanceName}</span>
                <span className="text-xs text-muted-foreground">
                  {TEAM_LABELS[entry.team]} / HP {entry.currentHp ?? "--"}/{entry.maxHp ?? "--"} /{" "}
                  {STATUS_LABELS[entry.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
