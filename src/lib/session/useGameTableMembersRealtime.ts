"use client";

import { useCallback } from "react";
import {
  type RealtimeTableSubscriptionStatus,
  useRealtimeTableSubscription
} from "@/lib/realtime/useRealtimeTableSubscription";

export function useGameTableMembersRealtime(options: {
  gameTableId?: string;
  enabled?: boolean;
  onMembersChange: () => void;
  onStatusChange?: (status: RealtimeTableSubscriptionStatus) => void;
}): void {
  const { enabled = true, gameTableId, onMembersChange, onStatusChange } = options;

  const handleChange = useCallback(() => {
    onMembersChange();
  }, [onMembersChange]);

  useRealtimeTableSubscription({
    channelName: gameTableId ? `game-table-members-${gameTableId}` : "game-table-members-idle",
    table: "game_table_members",
    filter: gameTableId ? `table_id=eq.${gameTableId}` : undefined,
    enabled: enabled && Boolean(gameTableId),
    onChange: handleChange,
    onStatusChange
  });
}
