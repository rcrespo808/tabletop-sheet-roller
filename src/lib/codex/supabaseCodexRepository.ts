import { codexEntryToUpsert, rowToCodexEntry, type CodexEntryRow } from "@/lib/codex/supabaseMappers";
import type { CodexEntry } from "@/lib/codex/types";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";

export async function listSupabaseCodexEntries(): Promise<CodexEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("codex_entries")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as CodexEntryRow[]).map(rowToCodexEntry);
}

export async function saveSupabaseCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { data, error } = await client
    .from("codex_entries")
    .upsert(codexEntryToUpsert(entry), { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return rowToCodexEntry(data as CodexEntryRow);
}

export async function deleteSupabaseCodexEntry(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("codex_entries").delete().eq("id", id);
  if (error) throw error;
}
