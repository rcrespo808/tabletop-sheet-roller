import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAssignCharacters,
  canBuyFromMarket,
  canManageCodex,
  canManageHandouts,
  canManagePaths,
  canManageTable,
  createSeatContext
} from "@/lib/session/permissions";
import { resolveSeatRole } from "@/lib/session/resolveSeatRole";

describe("resolveSeatRole", () => {
  it("returns gm for table owner", () => {
    const role = resolveSeatRole({
      gameTableId: "table-1",
      userId: "user-owner",
      profile: { userLevel: "player" } as never,
      table: { ownerUserId: "user-owner" } as never,
      members: []
    });
    assert.equal(role, "gm");
  });

  it("returns player for seated member", () => {
    const role = resolveSeatRole({
      gameTableId: "table-1",
      userId: "user-player",
      profile: { userLevel: "gm" } as never,
      table: { ownerUserId: "user-owner" } as never,
      members: [{ tableId: "table-1", userId: "user-player", userLevel: "player" }]
    });
    assert.equal(role, "player");
  });

  it("returns spectator when table scoped and not seated", () => {
    const role = resolveSeatRole({
      gameTableId: "table-1",
      userId: "user-outsider",
      profile: { userLevel: "gm" } as never,
      table: { ownerUserId: "user-owner" } as never,
      members: []
    });
    assert.equal(role, "spectator");
  });

  it("returns gm without table when profile is gm", () => {
    const role = resolveSeatRole({
      userId: "user-1",
      profile: { userLevel: "gm" } as never,
      table: null,
      members: []
    });
    assert.equal(role, "gm");
  });

  it("returns player without table when profile is player", () => {
    const role = resolveSeatRole({
      userId: "user-1",
      profile: { userLevel: "player" } as never,
      table: null,
      members: []
    });
    assert.equal(role, "player");
  });
});

describe("seat permissions", () => {
  it("allows market buy for assigned table character", () => {
    const seat = createSeatContext({
      gameTableId: "table-1",
      currentUserId: "user-player",
      role: "player",
      controlledCharacterIds: ["char-1"]
    });
    assert.equal(
      canBuyFromMarket(seat, {
        id: "char-1",
        name: "Hero",
        ownerUserId: "user-gm",
        defaultSystem: "dnd5e",
        sheets: {},
        inventory: [],
        wallet: {},
        rewardHistory: [],
        conditions: []
      }),
      true
    );
  });

  it("blocks market buy when character is not assigned at table", () => {
    const seat = createSeatContext({
      gameTableId: "table-1",
      currentUserId: "user-player",
      role: "player",
      controlledCharacterIds: []
    });
    assert.equal(
      canBuyFromMarket(seat, {
        id: "char-1",
        name: "Hero",
        ownerUserId: "user-player",
        defaultSystem: "dnd5e",
        sheets: {},
        inventory: [],
        wallet: {},
        rewardHistory: [],
        conditions: []
      }),
      false
    );
  });

  it("grants table management to owner and seated gm", () => {
    const ownerSeat = createSeatContext({
      gameTableId: "table-1",
      currentUserId: "user-owner",
      role: "gm",
      controlledCharacterIds: []
    });
    assert.equal(canManageTable(ownerSeat, { ownerUserId: "user-owner" }), true);
    assert.equal(canAssignCharacters(ownerSeat), true);
  });

  it("grants module manage to table gm only in supabase mode", () => {
    const gmSeat = createSeatContext({
      gameTableId: "table-1",
      currentUserId: "user-gm",
      role: "gm",
      controlledCharacterIds: []
    });
    const playerSeat = createSeatContext({
      gameTableId: "table-1",
      currentUserId: "user-player",
      role: "player",
      controlledCharacterIds: []
    });
    assert.equal(canManageHandouts(gmSeat, false), true);
    assert.equal(canManageCodex(gmSeat, false), true);
    assert.equal(canManagePaths(gmSeat, false), true);
    assert.equal(canManageHandouts(playerSeat, false), false);
    assert.equal(canManagePaths(playerSeat, false), false);
    assert.equal(canManageHandouts(playerSeat, true), true);
  });
});
