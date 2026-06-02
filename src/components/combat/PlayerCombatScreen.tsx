"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { CombatActionPanel } from "@/components/combat/CombatActionPanel";
import { GlassPanel } from "@/components/GlassPanel";
import type {
  CombatEncounter,
  CombatLogEntry,
  Combatant,
  CombatStatus,
  CombatTeam
} from "@/lib/combat/types";

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

function targetLabel(target: Combatant): string {
  return `${target.instanceName} / ${TEAM_LABELS[target.team]} / HP ${
    target.currentHp ?? target.maxHp ?? "--"
  }/${target.maxHp ?? "--"} / ${defenseLabel(target)} / ${STATUS_LABELS[target.status]}`;
}

function CombatHistoryPreview({ entries }: { entries: CombatLogEntry[] }) {
  return (
    <GlassPanel level="secondary" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Combat History</h2>
        <span className="text-xs text-muted-foreground">{entries.length} entries</span>
      </div>
      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
            No combat events recorded yet.
          </p>
        ) : (
          entries.slice(0, 20).map((entry) => (
            <article className="rounded-md border border-slate-700/20 bg-slate-950/35 p-3" key={entry.id}>
              <p className="text-xs font-semibold uppercase text-red-100">
                Round {entry.round} / Turn {entry.turnIndex + 1}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{entry.summary}</p>
            </article>
          ))
        )}
      </div>
    </GlassPanel>
  );
}

export function PlayerCombatScreen({
  activeCombatant,
  canDeclare,
  encounter,
  onDeclareAction,
  onRefresh,
  onSelectedTargetIdChange,
  ownedCombatants,
  selectedTarget,
  selectedTargetId,
  validTargets
}: {
  activeCombatant: Combatant | null;
  canDeclare: boolean;
  encounter: CombatEncounter;
  onDeclareAction: (actionId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onSelectedTargetIdChange: (value: string) => void;
  ownedCombatants: Combatant[];
  selectedTarget: Combatant | null;
  selectedTargetId: string;
  validTargets: Combatant[];
}) {
  return (
    <section className="space-y-6" aria-label="Player combat screen">
      <GlassPanel level="secondary" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Player combat</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{encounter.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Round {encounter.round} / Active: {activeCombatant?.instanceName ?? "None"}
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 px-3 text-sm font-semibold text-slate-100"
            onClick={() => void onRefresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh Combat State
          </button>
        </div>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <GlassPanel level="secondary" className="p-5">
          <h2 className="text-lg font-semibold text-foreground">Your Combatants</h2>
          <div className="mt-4 space-y-3">
            {ownedCombatants.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-700/25 p-4 text-sm text-muted-foreground">
                No assigned combatants detected.
              </p>
            ) : (
              ownedCombatants.map((combatant) => (
                <div className="rounded-md border border-slate-700/25 bg-slate-950/35 p-3" key={combatant.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{combatant.instanceName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Combat HP {combatant.currentHp ?? "--"}/{combatant.maxHp ?? "--"} /{" "}
                        {defenseLabel(combatant)} / {STATUS_LABELS[combatant.status]}
                      </p>
                    </div>
                    {combatant.sourceId ? (
                      <Link
                        className="rounded-md border border-slate-600/40 px-2 py-1 text-xs font-semibold text-slate-100"
                        href={`/characters/${combatant.sourceId}`}
                      >
                        Sheet
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel level="secondary" className="p-5">
          <h2 className="text-lg font-semibold text-foreground">Declare Action</h2>
          <div className="mt-4 rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
            <p className="text-sm font-semibold text-foreground">Target</p>
            <select
              className="mt-3 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm"
              onChange={(event) => onSelectedTargetIdChange(event.target.value)}
              value={selectedTargetId}
            >
              <option value="">Select target...</option>
              {validTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {targetLabel(target)}
                </option>
              ))}
            </select>
            <div className="mt-3 rounded-md border border-slate-700/25 bg-slate-900/50 p-3 text-sm text-muted-foreground">
              {selectedTarget ? targetLabel(selectedTarget) : "No target selected"}
            </div>
          </div>
          <CombatActionPanel
            activeCombatant={activeCombatant}
            canDeclare={canDeclare}
            canResolve={false}
            onDeclareAction={onDeclareAction}
            onResolveAction={() => undefined}
            selectedTargetId={selectedTargetId}
          />
          {encounter.pendingAction ? (
            <div className="mt-4 rounded-md border border-cyan-500/30 bg-cyan-950/30 p-3 text-sm text-cyan-100">
              Pending declaration is waiting for GM review.
            </div>
          ) : null}
        </GlassPanel>
      </div>

      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Visible Roster</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {encounter.combatants.map((combatant) => (
            <div className="rounded-md border border-slate-700/25 bg-slate-950/35 p-3" key={combatant.id}>
              <p className="font-semibold text-foreground">{combatant.instanceName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {TEAM_LABELS[combatant.team]} / Combat HP {combatant.currentHp ?? "--"}/
                {combatant.maxHp ?? "--"} / {STATUS_LABELS[combatant.status]}
              </p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <CombatHistoryPreview entries={encounter.actionHistory ?? []} />
    </section>
  );
}
