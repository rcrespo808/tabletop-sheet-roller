import type { CombatEncounter } from "@/lib/combat/types";
import type { CharacterProfile } from "@/lib/sheets/types";

export type SeatRole = "gm" | "player" | "spectator";

export type SeatPermissions = {
  canManageCombat: boolean;
  canDeclareCombatActions: boolean;
  canResolveCombatActions: boolean;
  canBuyFromMarkets: boolean;
  canRevealHandouts: boolean;
};

export type SeatContext = {
  gameTableId?: string;
  currentUserId?: string;
  role: SeatRole;
  controlledCharacterIds: string[];
  permissions: SeatPermissions;
};

export function createSeatPermissions(role: SeatRole): SeatPermissions {
  return {
    canManageCombat: role === "gm",
    canDeclareCombatActions: role === "player",
    canResolveCombatActions: role === "gm",
    canBuyFromMarkets: role === "player",
    canRevealHandouts: role === "gm"
  };
}

export function createSeatContext(input: {
  gameTableId?: string;
  currentUserId?: string;
  role: SeatRole;
  controlledCharacterIds?: string[];
}): SeatContext {
  return {
    gameTableId: input.gameTableId,
    currentUserId: input.currentUserId,
    role: input.role,
    controlledCharacterIds: input.controlledCharacterIds ?? [],
    permissions: createSeatPermissions(input.role)
  };
}

export function canManageEncounter(seat: SeatContext, encounter: CombatEncounter | null): boolean {
  if (!encounter) return false;
  if (encounter.gameTableId && seat.gameTableId && encounter.gameTableId !== seat.gameTableId) {
    return false;
  }
  return seat.permissions.canManageCombat;
}

export function canDeclareAction(
  seat: SeatContext,
  encounter: CombatEncounter | null,
  actorId: string | undefined
): boolean {
  if (!encounter || !actorId || encounter.status !== "active") return false;
  if (!seat.permissions.canDeclareCombatActions || !seat.currentUserId) return false;

  const actor = encounter.combatants.find((combatant) => combatant.id === actorId);
  if (!actor) return false;

  if (actor.controlledByUserId) {
    return actor.controlledByUserId === seat.currentUserId;
  }

  return Boolean(actor.sourceId && seat.controlledCharacterIds.includes(actor.sourceId));
}

export function canResolveAction(seat: SeatContext, encounter: CombatEncounter | null): boolean {
  return Boolean(encounter && seat.permissions.canResolveCombatActions);
}

export function canBuyFromMarket(seat: SeatContext, character: CharacterProfile | null): boolean {
  if (!character || !seat.currentUserId || !seat.permissions.canBuyFromMarkets) return false;
  return character.ownerUserId === seat.currentUserId;
}

export function canRevealHandout(seat: SeatContext): boolean {
  return seat.permissions.canRevealHandouts;
}
