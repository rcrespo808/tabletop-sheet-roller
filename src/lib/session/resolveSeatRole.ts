import type { AppUserProfile } from "@/lib/auth/supabaseAuth";
import type { GameTable, GameTableMember } from "@/lib/session/types";
import type { SeatRole } from "@/lib/session/permissions";

export function resolveSeatRole(input: {
  gameTableId?: string;
  userId?: string;
  profile: AppUserProfile | null;
  table: GameTable | null;
  members: GameTableMember[];
}): SeatRole {
  if (!input.userId) return "spectator";

  if (input.table?.ownerUserId === input.userId) return "gm";

  const membership = input.members.find((member) => member.userId === input.userId);
  if (membership?.userLevel === "gm") return "gm";
  if (membership?.userLevel === "player") return "player";

  if (input.gameTableId) return "spectator";

  if (input.profile?.userLevel === "gm") return "gm";

  return "player";
}
