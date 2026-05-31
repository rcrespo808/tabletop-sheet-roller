import {
  deleteLocalCodexEntry,
  listLocalCodexEntries,
  saveLocalCodexEntry
} from "@/lib/codex/localCodexRepository";
import {
  deleteSupabaseCodexEntry,
  listSupabaseCodexEntries,
  saveSupabaseCodexEntry
} from "@/lib/codex/supabaseCodexRepository";
import type { CodexEntry } from "@/lib/codex/types";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";

let lastCodexStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getCodexStorageMode(): StorageMode {
  return lastCodexStorageMode;
}

function mergeEntries(primary: CodexEntry[], fallback: CodexEntry[]): CodexEntry[] {
  const merged = new Map<string, CodexEntry>();

  for (const entry of fallback) {
    merged.set(entry.id, entry);
  }
  for (const entry of primary) {
    merged.set(entry.id, entry);
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.updatedAt ?? b.createdAt ?? b.name).localeCompare(a.updatedAt ?? a.createdAt ?? a.name)
  );
}

export async function listCodexEntries(): Promise<CodexEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await listSupabaseCodexEntries();
      lastCodexStorageMode = "supabase";
      const local = await listLocalCodexEntries();
      return mergeEntries(remote, local);
    } catch (error) {
      console.warn("[codexRepository] Supabase list failed, using local storage.", error);
      lastCodexStorageMode = "supabase-fallback";
    }
  } else {
    lastCodexStorageMode = "local";
  }

  return listLocalCodexEntries();
}

export async function saveCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  const now = new Date().toISOString();
  const normalized: CodexEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    name: entry.name.trim(),
    subtitle: entry.subtitle?.trim() || undefined,
    description: entry.description.trim(),
    rulesText: entry.rulesText?.trim() || undefined,
    tags: entry.tags.map((tag) => tag.trim()).filter(Boolean),
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt ?? now,
    updatedAt: now
  };

  let saved = normalized;
  if (isSupabaseConfigured()) {
    try {
      saved = await saveSupabaseCodexEntry(normalized);
      lastCodexStorageMode = "supabase";
    } catch (error) {
      console.warn("[codexRepository] Supabase save failed, caching locally.", error);
      lastCodexStorageMode = "supabase-fallback";
    }
  } else {
    lastCodexStorageMode = "local";
  }

  return saveLocalCodexEntry(saved);
}

export async function deleteCodexEntry(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseCodexEntry(id);
      lastCodexStorageMode = "supabase";
    } catch (error) {
      console.warn("[codexRepository] Supabase delete failed, removing locally.", error);
      lastCodexStorageMode = "supabase-fallback";
    }
  } else {
    lastCodexStorageMode = "local";
  }

  await deleteLocalCodexEntry(id);
}
