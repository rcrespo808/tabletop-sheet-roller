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
    }
  | {
      id: string;
      label: string;
      system: GameSystem;
      kind: "utility";
      action: SheetAction;
      notes?: string;
      sourceActionId?: string;
    };

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
  combatActions: CombatAction[];
  actions?: SheetAction[];
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
