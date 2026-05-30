import { DEFAULT_ROOM_SLUG } from "@/lib/rollLog/constants";
import {
  clearLocalRollLogs,
  listLocalRollLogs,
  replaceLocalRollLogs,
  saveLocalRollLog
} from "@/lib/storage/localRollLogRepository";
import {
  clearSupabaseRollLogs,
  listSupabaseRollLogs,
  saveSupabaseRollLog
} from "@/lib/storage/supabaseRollLogRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";
import type { RollLogEntry } from "@/lib/sheets/types";

let lastRollLogStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getRollLogStorageMode(): StorageMode {
  return lastRollLogStorageMode;
}

export async function listRollLogs(roomSlug = DEFAULT_ROOM_SLUG): Promise<RollLogEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await listSupabaseRollLogs(roomSlug);
      lastRollLogStorageMode = "supabase";
      return replaceLocalRollLogs(roomSlug, remote);
    } catch (error) {
      console.warn("[rollLogRepository] Supabase list failed, using local storage.", error);
      lastRollLogStorageMode = "supabase-fallback";
    }
  } else {
    lastRollLogStorageMode = "local";
  }

  return listLocalRollLogs(roomSlug);
}

export async function saveRollLog(
  roomSlug: string,
  entry: RollLogEntry,
  options?: { characterId?: string }
): Promise<RollLogEntry> {
  let saved = entry;

  if (isSupabaseConfigured()) {
    try {
      saved = await saveSupabaseRollLog(roomSlug, entry, options?.characterId ?? null);
      lastRollLogStorageMode = "supabase";
    } catch (error) {
      console.warn("[rollLogRepository] Supabase save failed, caching locally.", error);
      lastRollLogStorageMode = "supabase-fallback";
    }
  } else {
    lastRollLogStorageMode = "local";
  }

  return saveLocalRollLog(roomSlug, saved);
}

export async function clearRollLogs(roomSlug = DEFAULT_ROOM_SLUG): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await clearSupabaseRollLogs(roomSlug);
      lastRollLogStorageMode = "supabase";
    } catch (error) {
      console.warn("[rollLogRepository] Supabase clear failed, clearing locally.", error);
      lastRollLogStorageMode = "supabase-fallback";
    }
  } else {
    lastRollLogStorageMode = "local";
  }

  clearLocalRollLogs(roomSlug);
}

export { DEFAULT_ROOM_SLUG };
