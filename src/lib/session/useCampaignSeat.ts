"use client";

import { useMemo } from "react";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type { SeatContext, SeatRole } from "@/lib/session/permissions";
import { useActiveTableId } from "@/lib/session/useActiveTableId";
import { useGameTableSession } from "@/lib/session/useGameTableSession";
import type { GameTable, GameTableMember } from "@/lib/session/types";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export type CampaignSeat = {
  activeTableId?: string;
  table: GameTable | null;
  members: GameTableMember[];
  role: SeatRole;
  seatContext: SeatContext;
  isTableGm: boolean;
  canManage: boolean;
  controlledCharacterIds: string[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useCampaignSeat(
  authState?: AuthState | null,
  options?: { gameTableId?: string }
): CampaignSeat {
  const activeTableId = useActiveTableId();
  const resolvedTableId = options?.gameTableId ?? activeTableId;
  const session = useGameTableSession(resolvedTableId, authState);

  const canManage = useMemo(
    () => !isSupabaseConfigured() || session.role === "gm",
    [session.role]
  );

  return {
    activeTableId: resolvedTableId,
    table: session.table,
    members: session.members,
    role: session.role,
    seatContext: session.seatContext,
    isTableGm: session.role === "gm",
    canManage,
    controlledCharacterIds: session.controlledCharacterIds,
    loading: session.loading,
    error: session.error,
    reload: session.reload
  };
}
