"use client";

import { useCallback } from "react";
import {
  type RealtimeTableSubscriptionStatus,
  useRealtimeTableSubscription
} from "@/lib/realtime/useRealtimeTableSubscription";

export function useGameTableAssignmentsRealtime(options: {
  gameTableId?: string;
  enabled?: boolean;
  onAssignmentsChange: () => void;
  onStatusChange?: (status: RealtimeTableSubscriptionStatus) => void;
}): void {
  const { enabled = true, gameTableId, onAssignmentsChange, onStatusChange } = options;

  const handleChange = useCallback(() => {
    onAssignmentsChange();
  }, [onAssignmentsChange]);

  useRealtimeTableSubscription({
    channelName: gameTableId
      ? `game-table-assignments-${gameTableId}`
      : "game-table-assignments-idle",
    table: "game_table_character_assignments",
    filter: gameTableId ? `table_id=eq.${gameTableId}` : undefined,
    enabled: enabled && Boolean(gameTableId),
    onChange: handleChange,
    onStatusChange
  });
}
