"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import type {
  Combatant,
  CombatEncounter,
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

function CombatantRow({
  combatant,
  encounter,
  layout,
  isCurrentTurn,
  canManage,
  onTarget,
  onDamage,
  onHeal,
  onMakeActive,
  onStatus
}: {
  combatant: Combatant;
  encounter: CombatEncounter;
  layout: "table" | "card";
  isCurrentTurn: boolean;
  canManage: boolean;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onMakeActive: (id: string) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
}) {
  const [damageInput, setDamageInput] = useState("5");
  const [healInput, setHealInput] = useState("5");
  const defenseLabel =
    combatant.system === "dnd5e"
      ? combatant.armorClass !== undefined
        ? `AC ${combatant.armorClass}`
        : "—"
      : `Def ${combatant.defense ?? "—"}${combatant.armor !== undefined ? ` / Arm ${combatant.armor}` : ""}`;

  const targetNames = combatant.targetIds
    .map((id) => encounter.combatants.find((entry) => entry.id === id)?.instanceName)
    .filter(Boolean);

  const controls = (
    <div className="flex flex-wrap gap-1">
      <button
        className="h-8 rounded border border-slate-600/40 px-2 text-xs"
        disabled={!canManage}
        onClick={() => onDamage(combatant.id, 5)}
        type="button"
      >
        -5
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        disabled={!canManage}
        onChange={(event) => setDamageInput(event.target.value)}
        type="number"
        value={damageInput}
      />
      <button
        className="h-8 rounded border border-red-500/30 px-2 text-xs text-red-100"
        disabled={!canManage}
        onClick={() => onDamage(combatant.id, Number(damageInput) || 0)}
        type="button"
      >
        Apply Damage
      </button>
      <input
        className="h-8 w-12 rounded border border-slate-700/30 bg-slate-900/60 px-1 text-xs"
        disabled={!canManage}
        onChange={(event) => setHealInput(event.target.value)}
        type="number"
        value={healInput}
      />
      <button
        className="h-8 rounded border border-emerald-500/30 px-2 text-xs text-emerald-100"
        disabled={!canManage}
        onClick={() => onHeal(combatant.id, Number(healInput) || 0)}
        type="button"
      >
        Apply Healing
      </button>
      <button
        className="h-8 rounded border border-amber-400 bg-amber-500/20 px-2 text-xs text-amber-100"
        onClick={() => onTarget(combatant.id)}
        type="button"
      >
        <Target className="inline h-3 w-3" /> Target
      </button>
      {(["down", "dead", "fled", "hidden", "active"] as CombatStatus[]).map((status) => (
        <button
          className="h-8 rounded border border-slate-600/40 px-2 text-[10px] uppercase"
          disabled={!canManage}
          key={status}
          onClick={() => onStatus(combatant.id, status)}
          type="button"
        >
          {status}
        </button>
      ))}
      <button
        className="h-8 rounded border border-purple-500/30 px-2 text-xs text-purple-100"
        disabled={!canManage}
        onClick={() => onMakeActive(combatant.id)}
        type="button"
      >
        Make Active
      </button>
    </div>
  );

  if (layout === "table") {
    return (
      <>
        <tr
          className={`border-t border-slate-700/20 ${isCurrentTurn ? "bg-purple-500/10" : ""}`}
        >
          <td className="px-3 py-2 font-semibold">{combatant.initiative || "—"}</td>
          <td className="px-3 py-2">
            <p className="font-medium">{combatant.instanceName}</p>
            {combatant.crLabel ? (
              <p className="text-xs text-muted-foreground">{combatant.crLabel}</p>
            ) : null}
          </td>
          <td className="px-3 py-2">{TEAM_LABELS[combatant.team]}</td>
          <td className="px-3 py-2">
            {combatant.currentHp ?? "—"}/{combatant.maxHp ?? "—"}
            {combatant.temporaryHp ? ` (+${combatant.temporaryHp} temp)` : ""}
          </td>
          <td className="px-3 py-2">{defenseLabel}</td>
          <td className="px-3 py-2">{STATUS_LABELS[combatant.status]}</td>
          <td className="px-3 py-2 text-xs">{targetNames.join(", ") || "—"}</td>
          <td className="px-3 py-2">{controls}</td>
        </tr>
      </>
    );
  }

  return (
    <GlassPanel
      className={`p-4 ${isCurrentTurn ? "ring-1 ring-purple-500/40" : ""}`}
      level="secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{combatant.instanceName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Init {combatant.initiative || "—"} · {TEAM_LABELS[combatant.team]} ·{" "}
            {STATUS_LABELS[combatant.status]}
          </p>
        </div>
        {combatant.crLabel ? (
          <span className="rounded-full border border-slate-600/40 px-2 py-0.5 text-xs">
            {combatant.crLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <p>
          HP {combatant.currentHp ?? "—"}/{combatant.maxHp ?? "—"}
        </p>
        <p>{defenseLabel}</p>
        <p className="col-span-2">
          Targets: {targetNames.join(", ") || "none"}
        </p>
      </div>
      <div className="mt-3">{controls}</div>
    </GlassPanel>
  );
}

export function GmCombatRoster({
  encounter,
  canManage,
  onTarget,
  onDamage,
  onHeal,
  onMakeActive,
  onStatus
}: {
  encounter: CombatEncounter;
  canManage: boolean;
  onTarget: (id: string) => void | Promise<void>;
  onDamage: (id: string, amount: number) => void | Promise<void>;
  onHeal: (id: string, amount: number) => void | Promise<void>;
  onMakeActive: (id: string) => void | Promise<void>;
  onStatus: (id: string, status: CombatStatus) => void | Promise<void>;
}) {
  if (encounter.combatants.length === 0) {
    return (
      <GlassPanel level="tertiary" className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No combatants in roster.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-lg border border-slate-700/30 lg:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Init</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">HP</th>
              <th className="px-3 py-2">Defense</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Targets</th>
              <th className="px-3 py-2">Controls</th>
            </tr>
          </thead>
          <tbody>
            {encounter.combatants.map((combatant, index) => (
              <CombatantRow
                combatant={combatant}
                encounter={encounter}
                isCurrentTurn={
                  encounter.status === "active" && encounter.turnIndex === index
                }
                canManage={canManage}
                key={combatant.id}
                layout="table"
                onDamage={onDamage}
                onHeal={onHeal}
                onMakeActive={onMakeActive}
                onStatus={onStatus}
                onTarget={onTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {encounter.combatants.map((combatant, index) => (
          <CombatantRow
            combatant={combatant}
            encounter={encounter}
            isCurrentTurn={encounter.status === "active" && encounter.turnIndex === index}
            canManage={canManage}
            key={combatant.id}
            layout="card"
            onDamage={onDamage}
            onHeal={onHeal}
            onMakeActive={onMakeActive}
            onStatus={onStatus}
            onTarget={onTarget}
          />
        ))}
      </div>
    </div>
  );
}
