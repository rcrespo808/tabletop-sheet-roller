"use client";

import { useCallback } from "react";
import type { CombatEncounter } from "@/lib/combat/types";
import {
  type RealtimeTableSubscriptionStatus,
  useRealtimeTableSubscription
} from "@/lib/realtime/useRealtimeTableSubscription";
import { getSupabaseEncounter } from "@/lib/storage/supabaseCombatRepository";

function rowId(row: Record<string, unknown>): string | undefined {
  return typeof row.id === "string" ? row.id : undefined;
}

export function useCombatEncounterRealtime(options: {
  encounterId?: string;
  enabled?: boolean;
  onEncounterChange: (encounter: CombatEncounter) => void;
  onEncounterDelete?: (encounterId: string) => void;
  onStatusChange?: (status: RealtimeTableSubscriptionStatus) => void;
}): void {
  const {
    enabled = true,
    encounterId,
    onEncounterChange,
    onEncounterDelete,
    onStatusChange
  } = options;

  const handleChange = useCallback(
    async (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      const changedId = rowId(payload.eventType === "DELETE" ? payload.old : payload.new);
      if (!changedId) return;

      if (payload.eventType === "DELETE") {
        onEncounterDelete?.(changedId);
        return;
      }

      const encounter = await getSupabaseEncounter(changedId);
      if (encounter) onEncounterChange(encounter);
    },
    [onEncounterChange, onEncounterDelete]
  );

  useRealtimeTableSubscription({
    channelName: encounterId ? `combat-encounter-${encounterId}` : "combat-encounter-idle",
    table: "combat_encounters",
    filter: encounterId ? `id=eq.${encounterId}` : undefined,
    enabled: enabled && Boolean(encounterId),
    onChange: handleChange,
    onStatusChange
  });
}
