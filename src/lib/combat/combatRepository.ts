import {
  clearLocalEncounters,
  deleteLocalEncounter,
  getLocalEncounter,
  listLocalEncounters,
  replaceLocalEncounters,
  saveLocalEncounter
} from "@/lib/storage/localCombatRepository";
import {
  deleteSupabaseEncounter,
  getSupabaseEncounter,
  listSupabaseEncounters,
  saveSupabaseEncounter
} from "@/lib/storage/supabaseCombatRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";
import type { CombatEncounter } from "@/lib/combat/types";

let lastCombatStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getCombatStorageMode(): StorageMode {
  return lastCombatStorageMode;
}

export async function listEncounters(gameTableId?: string): Promise<CombatEncounter[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await listSupabaseEncounters(gameTableId);
      lastCombatStorageMode = "supabase";
      return replaceLocalEncounters(gameTableId, remote);
    } catch (error) {
      console.warn("[combatRepository] Supabase list failed, using local storage.", error);
      lastCombatStorageMode = "supabase-fallback";
    }
  } else {
    lastCombatStorageMode = "local";
  }

  return listLocalEncounters(gameTableId);
}

export async function getEncounter(id: string): Promise<CombatEncounter | null> {
  const local = getLocalEncounter(id);
  if (local) return local;

  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabaseEncounter(id);
      if (remote) {
        lastCombatStorageMode = "supabase";
        saveLocalEncounter(remote);
        return remote;
      }
    } catch (error) {
      console.warn("[combatRepository] Supabase get failed, using local storage.", error);
      lastCombatStorageMode = "supabase-fallback";
    }
  } else {
    lastCombatStorageMode = "local";
  }

  return null;
}

export async function saveEncounter(encounter: CombatEncounter): Promise<CombatEncounter> {
  let saved = encounter;

  if (isSupabaseConfigured()) {
    try {
      saved = await saveSupabaseEncounter(encounter);
      lastCombatStorageMode = "supabase";
    } catch (error) {
      console.warn("[combatRepository] Supabase save failed, caching locally.", error);
      lastCombatStorageMode = "supabase-fallback";
    }
  } else {
    lastCombatStorageMode = "local";
  }

  return saveLocalEncounter(saved);
}

export async function deleteEncounter(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseEncounter(id);
      lastCombatStorageMode = "supabase";
    } catch (error) {
      console.warn("[combatRepository] Supabase delete failed, removing locally.", error);
      lastCombatStorageMode = "supabase-fallback";
    }
  } else {
    lastCombatStorageMode = "local";
  }

  deleteLocalEncounter(id);
}

export function clearSavedLocalEncounters(gameTableId?: string): void {
  clearLocalEncounters(gameTableId);
}
