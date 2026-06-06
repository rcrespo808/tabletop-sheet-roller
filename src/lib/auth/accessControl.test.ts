import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AppUserProfile, AuthState } from "@/lib/auth/supabaseAuth";

type AccessControlModule = typeof import("@/lib/auth/accessControl");

let access: AccessControlModule;

function profile(overrides: Partial<AppUserProfile> = {}): AppUserProfile {
  return {
    id: "user-1",
    userLevel: "player",
    playStatus: "pending",
    ...overrides
  };
}

function authState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    session: null,
    user: { id: "user-1" } as AuthState["user"],
    profile: profile(),
    ...overrides
  };
}

before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  access = await import("@/lib/auth/accessControl");
});

describe("play status helpers", () => {
  it("defaults missing play status to pending", () => {
    assert.equal(access.getPlayStatus(null), "pending");
    assert.equal(access.getPlayStatus(undefined), "pending");
  });

  it("detects approved, pending, and rejected profiles", () => {
    assert.equal(access.isPlayApproved(profile({ playStatus: "approved" })), true);
    assert.equal(access.isPlayApproved(profile({ playStatus: "pending" })), false);
    assert.equal(access.isPlayPending(profile({ playStatus: "pending" })), true);
    assert.equal(access.isPlayRejected(profile({ playStatus: "rejected" })), true);
  });

  it("treats app GM profiles as approved", () => {
    assert.equal(
      access.isPlayApproved(profile({ userLevel: "gm", playStatus: "pending" })),
      true
    );
    assert.equal(access.isAppProfileGm(profile({ userLevel: "gm" })), true);
  });
});

describe("app access helpers", () => {
  it("requires a signed-in user for app access", () => {
    assert.equal(access.isSignedIn(null), false);
    assert.equal(access.canAccessApp(null), false);
  });

  it("allows approved players", () => {
    const state = authState({ profile: profile({ playStatus: "approved" }) });
    assert.equal(access.canAccessApp(state), true);
    assert.equal(access.isPendingPlayer(state), false);
  });

  it("allows table GMs before global approval", () => {
    const state = authState({ profile: profile({ playStatus: "pending" }) });
    assert.equal(access.canAccessApp(state, { isTableGmAnywhere: true }), true);
    assert.equal(access.isPendingPlayer(state, { isTableGmAnywhere: true }), false);
  });

  it("keeps pending players gated without table GM status", () => {
    const state = authState({ profile: profile({ playStatus: "pending" }) });
    assert.equal(access.canAccessApp(state), false);
    assert.equal(access.isPendingPlayer(state), true);
  });

  it("keeps rejected players on the pending gate", () => {
    const state = authState({ profile: profile({ playStatus: "rejected" }) });
    assert.equal(access.canAccessApp(state), false);
    assert.equal(access.isPendingPlayer(state), true);
  });

  it("allows table GMs and app GMs to review players", () => {
    const playerState = authState({ profile: profile({ playStatus: "approved" }) });
    assert.equal(access.canReviewPlayers(playerState), false);
    assert.equal(
      access.canReviewPlayers(playerState, { isTableGmAnywhere: true }),
      true
    );
    assert.equal(
      access.canReviewPlayers(authState({ profile: profile({ userLevel: "gm" }) })),
      true
    );
  });
});
