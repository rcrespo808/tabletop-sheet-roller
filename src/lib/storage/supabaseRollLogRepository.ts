import { ROLL_LOG_LIST_LIMIT } from "@/lib/rollLog/constants";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import {
  rollLogEntryToInsert,
  rowToRollLogEntry
} from "@/lib/storage/supabaseRollLogMappers";
import type { RollLogEntry } from "@/lib/sheets/types";
import type { SupabaseRollLogRow } from "@/lib/persistence/dtos";

export async function listSupabaseRollLogs(roomSlug: string): Promise<RollLogEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("roll_logs")
    .select("*")
    .eq("room_slug", roomSlug)
    .order("created_at", { ascending: false })
    .limit(ROLL_LOG_LIST_LIMIT);

  if (error) throw error;
  return (data as SupabaseRollLogRow[]).map(rowToRollLogEntry);
}

export async function saveSupabaseRollLog(
  roomSlug: string,
  entry: RollLogEntry,
  characterId?: string | null
): Promise<RollLogEntry> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = rollLogEntryToInsert(entry, roomSlug, characterId);
  const { data, error } = await client.from("roll_logs").upsert(payload).select("*").single();

  if (error) throw error;
  return rowToRollLogEntry(data as SupabaseRollLogRow);
}

export async function clearSupabaseRollLogs(roomSlug: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("roll_logs").delete().eq("room_slug", roomSlug);
  if (error) throw error;
}
