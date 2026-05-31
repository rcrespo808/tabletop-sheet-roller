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
import { starterCodexEntries } from "@/data/codex";
import type { CodexEntry } from "@/lib/codex/types";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";

let lastCodexStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export type ListCodexEntriesOptions = {
  campaignId?: string | null;
};

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

function normalizeDuplicateKey(entry: Pick<CodexEntry, "system" | "type" | "name"> & {
  campaignId?: string | null;
}): string {
  return [
    entry.campaignId ?? "global",
    entry.system,
    entry.type,
    entry.name.trim().toLowerCase().replace(/\s+/g, " ")
  ].join("|");
}

function normalizeCodexEntry(entry: CodexEntry): CodexEntry {
  const now = new Date().toISOString();
  return {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    campaignId: entry.campaignId?.trim() || null,
    name: entry.name.trim(),
    subtitle: entry.subtitle?.trim() || undefined,
    description: entry.description.trim(),
    rulesText: entry.rulesText?.trim() || undefined,
    tags: entry.tags.map((tag) => tag.trim()).filter(Boolean),
    grants: entry.grants ?? [],
    prerequisites: entry.prerequisites ?? [],
    sourceLabel: entry.sourceLabel?.trim() || undefined,
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt ?? now,
    updatedAt: now
  };
}

export async function listCodexEntries(
  options: ListCodexEntriesOptions = {}
): Promise<CodexEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await listSupabaseCodexEntries();
      lastCodexStorageMode = "supabase";
      const local = await listLocalCodexEntries();
      return mergeEntries(remote, local).filter((entry) => {
        if (options.campaignId === undefined) return true;
        return (entry.campaignId ?? null) === (options.campaignId ?? null);
      });
    } catch (error) {
      console.warn("[codexRepository] Supabase list failed, using local storage.", error);
      lastCodexStorageMode = "supabase-fallback";
    }
  } else {
    lastCodexStorageMode = "local";
  }

  const local = await listLocalCodexEntries();
  return local.filter((entry) => {
    if (options.campaignId === undefined) return true;
    return (entry.campaignId ?? null) === (options.campaignId ?? null);
  });
}

export async function saveCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  const normalized = normalizeCodexEntry(entry);

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

export async function createCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  return saveCodexEntry(entry);
}

export async function updateCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  return saveCodexEntry(entry);
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

export async function importCodexEntries(
  entries: CodexEntry[],
  campaignId?: string | null
): Promise<{ inserted: number; skipped: number }> {
  const existing = await listCodexEntries();
  const seenKeys = new Set(existing.map(normalizeDuplicateKey));
  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const candidate = normalizeCodexEntry({
      ...entry,
      id: isSupabaseConfigured() ? crypto.randomUUID() : entry.id || crypto.randomUUID(),
      campaignId: campaignId ?? entry.campaignId ?? null,
      metadata: {
        ...(entry.metadata ?? {}),
        seedKey:
          typeof entry.metadata?.seedKey === "string"
            ? entry.metadata.seedKey
            : normalizeDuplicateKey({ ...entry, campaignId: campaignId ?? entry.campaignId ?? null })
      }
    });
    const key = normalizeDuplicateKey(candidate);
    if (seenKeys.has(key)) {
      skipped += 1;
      continue;
    }

    await saveCodexEntry(candidate);
    seenKeys.add(key);
    inserted += 1;
  }

  return { inserted, skipped };
}

export async function importSeedCodex(
  campaignId?: string | null
): Promise<{ inserted: number; skipped: number }> {
  return importCodexEntries(starterCodexEntries, campaignId);
}
