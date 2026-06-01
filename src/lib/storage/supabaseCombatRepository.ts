import type { CombatEncounter } from "@/lib/combat/types";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";

type SupabaseCombatEncounterRow = {
  id: string;
  game_table_id: string | null;
  name: string;
  system: string | null;
  round: number;
  turn_index: number;
  status: string;
  combatants: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToEncounter(row: SupabaseCombatEncounterRow): CombatEncounter {
  return {
    id: row.id,
    gameTableId: row.game_table_id ?? undefined,
    name: row.name,
    system: (row.system as CombatEncounter["system"]) ?? undefined,
    round: row.round,
    turnIndex: row.turn_index,
    status: row.status as CombatEncounter["status"],
    combatants: Array.isArray(row.combatants) ? row.combatants : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function encounterToInsert(encounter: CombatEncounter) {
  return {
    id: encounter.id,
    game_table_id: encounter.gameTableId ?? null,
    name: encounter.name,
    system: encounter.system ?? null,
    round: encounter.round,
    turn_index: encounter.turnIndex,
    status: encounter.status,
    combatants: encounter.combatants,
    updated_at: new Date().toISOString()
  };
}

export async function listSupabaseEncounters(gameTableId?: string): Promise<CombatEncounter[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  let query = client.from("combat_encounters").select("*").order("updated_at", { ascending: false });

  if (gameTableId) {
    query = query.eq("game_table_id", gameTableId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as SupabaseCombatEncounterRow[]).map(rowToEncounter);
}

export async function getSupabaseEncounter(id: string): Promise<CombatEncounter | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("combat_encounters").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToEncounter(data as SupabaseCombatEncounterRow);
}

export async function saveSupabaseEncounter(encounter: CombatEncounter): Promise<CombatEncounter> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = encounterToInsert(encounter);
  const { data, error } = await client
    .from("combat_encounters")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return rowToEncounter(data as SupabaseCombatEncounterRow);
}

export async function deleteSupabaseEncounter(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("combat_encounters").delete().eq("id", id);
  if (error) throw error;
}
