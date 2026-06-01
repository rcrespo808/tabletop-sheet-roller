import type { GameSystem, SheetAction } from "@/lib/sheets/types";

export type CombatStatus = "active" | "down" | "dead" | "fled" | "hidden";

export type CombatTeam = "players" | "enemies" | "allies" | "neutral";

export type CombatantKind = "character" | "npc";

export type Combatant = {
  id: string;
  kind: CombatantKind;
  sourceId?: string;
  instanceName: string;
  system: GameSystem;
  team: CombatTeam;
  initiative: number;
  initiativeRoll?: string;
  currentHp?: number;
  maxHp?: number;
  temporaryHp?: number;
  armorClass?: number;
  defense?: number;
  armor?: number;
  crLabel?: string;
  status: CombatStatus;
  targetIds: string[];
  notes?: string;
  actions: SheetAction[];
  metadata?: Record<string, unknown>;
};

export type CombatEncounter = {
  id: string;
  gameTableId?: string;
  name: string;
  system?: GameSystem | "mixed";
  round: number;
  turnIndex: number;
  status: "draft" | "active" | "completed";
  combatants: Combatant[];
  createdAt?: string;
  updatedAt?: string;
};
