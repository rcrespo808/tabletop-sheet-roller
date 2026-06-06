import type {
  AbilityKey,
  GameSystem,
  NwodAttributeKey,
  NwodSkillKey,
  SheetAction
} from "@/lib/sheets/types";

// Combat encounter JSON is pre-stable. Saved encounters may be discarded between
// combat refactors; do not preserve old encounter shapes unless explicitly needed.
export type CombatStatus = "active" | "down" | "dead" | "fled" | "hidden";

export type CombatTeam = "players" | "enemies" | "allies" | "neutral";

export type CombatantKind = "character" | "npc";

export type CombatEncounterSystem = "dnd5e" | "nwod";

export type CombatantController = {
  userId?: string;
  displayName?: string;
  role: "gm" | "player" | "npc";
};

export type PendingCombatAction = {
  id: string;
  combatantId: string;
  declaredByUserId?: string;
  actionId?: string;
  actionLabel?: string;
  targetId?: string;
  note?: string;
  createdAt: string;
};

export type CombatLogEntry = {
  id: string;
  kind: "combat";
  round: number;
  turnIndex: number;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  actionLabel?: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type CombatAction =
  | {
      id: string;
      label: string;
      system: "dnd5e";
      kind: "attack";
      attackRoll: string;
      damageRoll: string;
      damageType?: string;
      notes?: string;
      sourceActionId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      id: string;
      label: string;
      system: "dnd5e";
      kind: "save";
      saveDc?: number;
      saveAbility?: AbilityKey;
      damageRoll?: string;
      halfOnSuccess?: boolean;
      notes?: string;
      sourceActionId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      id: string;
      label: string;
      system: "nwod";
      kind: "attack";
      attribute: NwodAttributeKey;
      skill?: NwodSkillKey;
      modifier?: number;
      damage?: number;
      again?: 8 | 9 | 10 | null;
      rote?: boolean;
      notes?: string;
      sourceActionId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      id: string;
      label: string;
      system: GameSystem;
      kind: "utility";
      action: SheetAction;
      notes?: string;
      sourceActionId?: string;
      metadata?: Record<string, unknown>;
    };

export type Combatant = {
  id: string;
  kind: CombatantKind;
  sourceId?: string;
  instanceName: string;
  system: CombatEncounterSystem;
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
  combatActions: CombatAction[];
  actions?: SheetAction[];
  controller?: CombatantController;
  controlledByUserId?: string | null;
  isNpc?: boolean;
  metadata?: Record<string, unknown>;
};

export type CombatEncounter = {
  id: string;
  gameTableId?: string;
  version?: number;
  name: string;
  system: CombatEncounterSystem;
  round: number;
  turnIndex: number;
  status: "draft" | "active" | "completed";
  combatants: Combatant[];
  pendingAction?: PendingCombatAction | null;
  actionHistory: CombatLogEntry[];
  createdAt?: string;
  updatedAt?: string;
};
