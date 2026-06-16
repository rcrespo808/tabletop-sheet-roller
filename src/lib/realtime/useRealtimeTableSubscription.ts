"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";

let realtimeSubscriptionId = 0;

function createRealtimeChannelName(baseName: string): string {
  realtimeSubscriptionId += 1;
  return `${baseName}-${realtimeSubscriptionId}`;
}

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
  const onChangeRef = useRef(onChange);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onChangeRef.current = onChange;
    onStatusChangeRef.current = onStatusChange;
  }, [onChange, onStatusChange]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!enabled || !client || !isSupabaseConfigured()) {
      onStatusChangeRef.current?.("idle");
      return;
    }

    const channel = client
      .channel(createRealtimeChannelName(channelName))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter
        },
        (payload) => onChangeRef.current(payload as RealtimeTableChangePayload)
      )
      .subscribe((status) => onStatusChangeRef.current?.(status));

    return () => {
      void client.removeChannel(channel);
    };
  }, [channelName, enabled, filter, table]);
}
