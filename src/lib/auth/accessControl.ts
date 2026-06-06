import type { AuthState, AppUserProfile, PlayStatus } from "@/lib/auth/supabaseAuth";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export function isLocalMode(): boolean {
  return !isSupabaseConfigured();
}

export function isSignedIn(authState: AuthState | null | undefined): boolean {
  return Boolean(authState?.user?.id);
}

export function getPlayStatus(profile: AppUserProfile | null | undefined): PlayStatus {
  return profile?.playStatus ?? "pending";
}

export function isAppProfileGm(profile: AppUserProfile | null | undefined): boolean {
  return profile?.userLevel === "gm";
}

export function isPlayApproved(profile: AppUserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (isAppProfileGm(profile)) return true;
  return profile.playStatus === "approved";
}

export function isPlayPending(profile: AppUserProfile | null | undefined): boolean {
  return getPlayStatus(profile) === "pending";
}

export function isPlayRejected(profile: AppUserProfile | null | undefined): boolean {
  return getPlayStatus(profile) === "rejected";
}

export type AppAccessContext = {
  isTableGmAnywhere: boolean;
};

export function canAccessApp(
  authState: AuthState | null | undefined,
  context?: AppAccessContext
): boolean {
  if (isLocalMode()) return true;
  if (!isSignedIn(authState)) return false;

  const profile = authState?.profile;
  if (isAppProfileGm(profile) || isPlayApproved(profile)) return true;
  if (context?.isTableGmAnywhere) return true;

  return false;
}

export function isPendingPlayer(
  authState: AuthState | null | undefined,
  context?: AppAccessContext
): boolean {
  if (isLocalMode() || !isSignedIn(authState)) return false;
  if (canAccessApp(authState, context)) return false;
  return isPlayPending(authState?.profile) || isPlayRejected(authState?.profile);
}

export function canReviewPlayers(
  authState: AuthState | null | undefined,
  context?: AppAccessContext
): boolean {
  if (isLocalMode()) return false;
  if (!isSignedIn(authState)) return false;
  return isAppProfileGm(authState?.profile) || Boolean(context?.isTableGmAnywhere);
}
