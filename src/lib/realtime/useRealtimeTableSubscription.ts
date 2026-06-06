"use client";

import { useEffect } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export type RealtimeTableChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  schema: string;
  table: string;
  commit_timestamp?: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export type RealtimeTableSubscriptionStatus =
  | "idle"
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | string;

export function useRealtimeTableSubscription(options: {
  channelName: string;
  table: string;
  filter?: string;
  enabled?: boolean;
  onChange: (payload: RealtimeTableChangePayload) => void;
  onStatusChange?: (status: RealtimeTableSubscriptionStatus) => void;
}): void {
  const { channelName, enabled = true, filter, onChange, onStatusChange, table } = options;

  useEffect(() => {
    const client = getSupabaseClient();
    if (!enabled || !client || !isSupabaseConfigured()) {
      onStatusChange?.("idle");
      return;
    }

    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter
        },
        (payload) => onChange(payload as RealtimeTableChangePayload)
      )
      .subscribe((status) => onStatusChange?.(status));

    return () => {
      void client.removeChannel(channel);
    };
  }, [channelName, enabled, filter, onChange, onStatusChange, table]);
}
