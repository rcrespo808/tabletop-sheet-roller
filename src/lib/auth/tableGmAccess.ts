import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export async function fetchIsTableGmAnywhere(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const client = getSupabaseClient();
  if (!client) return false;

  const { data, error } = await client.rpc("is_table_gm_anywhere");
  if (error) {
    console.warn("[tableGmAccess] Failed to resolve table GM status.", error);
    return false;
  }

  return Boolean(data);
}
