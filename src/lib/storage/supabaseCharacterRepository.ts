import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import {
  characterProfileToInsert,
  characterProfileToUpdate,
  rowToCharacterProfile,
  type CharacterProfileRow
} from "@/lib/storage/supabaseMappers";
import { normalizeCharacterProfile } from "@/lib/sheets/customCharacters";
import type { CharacterProfile } from "@/lib/sheets/types";

export async function listSupabaseCharacters(): Promise<CharacterProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("character_profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as CharacterProfileRow[]).map(rowToCharacterProfile);
}

export async function getSupabaseCharacter(id: string): Promise<CharacterProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("character_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToCharacterProfile(data as CharacterProfileRow) : null;
}

export async function saveSupabaseCharacter(profile: CharacterProfile): Promise<CharacterProfile> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const normalized = normalizeCharacterProfile(profile);
  const existing = await getSupabaseCharacter(normalized.id);

  if (existing) {
    const { data, error } = await client
      .from("character_profiles")
      .update(characterProfileToUpdate(normalized))
      .eq("id", normalized.id)
      .select("*")
      .single();

    if (error) throw error;
    return rowToCharacterProfile(data as CharacterProfileRow);
  }

  const { data, error } = await client
    .from("character_profiles")
    .insert(characterProfileToInsert(normalized))
    .select("*")
    .single();

  if (error) throw error;
  return rowToCharacterProfile(data as CharacterProfileRow);
}

export async function deleteSupabaseCharacter(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("character_profiles").delete().eq("id", id);
  if (error) throw error;
}
