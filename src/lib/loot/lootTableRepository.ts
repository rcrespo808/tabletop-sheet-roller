import { starterLootTables } from "@/data/loot/starterLootTables";
import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import { LOCAL_DEMO_CAMPAIGN_ID, type LootTable, type LootTableEntry } from "@/lib/loot/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";

const STORAGE_KEY = "tsr.lootTables.v1";

type LootTableRow = {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  visibility: "gm_only" | "campaign";
  entries: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

let lastLootStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getLootStorageMode(): StorageMode {
  return lastLootStorageMode;
}

function parseEntries(value: unknown): LootTableEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => {
      return Boolean(
        entry &&
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          typeof entry.label === "string" &&
          typeof entry.reward === "object" &&
          entry.reward
      );
    })
    .map((entry) => ({
      id: entry.id as string,
      label: entry.label as string,
      weight: typeof entry.weight === "number" && Number.isFinite(entry.weight) ? entry.weight : 1,
      reward: entry.reward as LootTableEntry["reward"],
      notes: typeof entry.notes === "string" ? entry.notes : undefined
    }));
}

function rowToLootTable(row: LootTableRow): LootTable {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    description: row.description ?? undefined,
    visibility: row.visibility,
    entries: parseEntries(row.entries),
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function lootTableToUpsert(table: LootTable) {
  const authState = await getCurrentAuthState();
  return {
    id: table.id || crypto.randomUUID(),
    campaign_id: table.campaignId || LOCAL_DEMO_CAMPAIGN_ID,
    name: table.name.trim(),
    description: table.description?.trim() || null,
    visibility: table.visibility,
    entries: table.entries ?? [],
    created_by: table.createdBy ?? authState.user?.id ?? null
  };
}

function readLocalStore(): LootTable[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((table): table is LootTable => {
        return Boolean(table && typeof table === "object" && typeof table.id === "string");
      })
      .map(normalizeLootTable);
  } catch {
    return [];
  }
}

function writeLocalStore(tables: LootTable[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tables.map(normalizeLootTable)));
}

function normalizeLootTable(table: LootTable): LootTable {
  const now = new Date().toISOString();
  return {
    ...table,
    id: table.id || crypto.randomUUID(),
    campaignId: table.campaignId || LOCAL_DEMO_CAMPAIGN_ID,
    name: table.name.trim(),
    description: table.description?.trim() || undefined,
    visibility: table.visibility ?? "gm_only",
    entries: parseEntries(table.entries),
    createdAt: table.createdAt ?? now,
    updatedAt: now
  };
}

function mergeTables(primary: LootTable[], fallback: LootTable[]): LootTable[] {
  const merged = new Map<string, LootTable>();
  for (const table of fallback) merged.set(table.id, table);
  for (const table of primary) merged.set(table.id, table);
  return Array.from(merged.values()).sort((a, b) =>
    (b.updatedAt ?? b.createdAt ?? b.name).localeCompare(a.updatedAt ?? a.createdAt ?? a.name)
  );
}

function duplicateKey(table: Pick<LootTable, "campaignId" | "name">): string {
  return `${table.campaignId || LOCAL_DEMO_CAMPAIGN_ID}|${table.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

async function listSupabaseLootTables(campaignId: string): Promise<LootTable[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("loot_tables")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as LootTableRow[]).map(rowToLootTable);
}

async function getSupabaseLootTable(id: string): Promise<LootTable | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("loot_tables").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToLootTable(data as LootTableRow) : null;
}

async function saveSupabaseLootTable(table: LootTable): Promise<LootTable> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = await lootTableToUpsert(table);
  const { data, error } = await client.from("loot_tables").upsert(payload).select("*").single();
  if (error) throw error;
  return rowToLootTable(data as LootTableRow);
}

async function deleteSupabaseLootTable(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("loot_tables").delete().eq("id", id);
  if (error) throw error;
}

export async function listLootTables(campaignId = LOCAL_DEMO_CAMPAIGN_ID): Promise<LootTable[]> {
  if (isSupabaseConfigured() && campaignId !== LOCAL_DEMO_CAMPAIGN_ID) {
    try {
      const remote = await listSupabaseLootTables(campaignId);
      lastLootStorageMode = "supabase";
      return mergeTables(remote, readLocalStore().filter((table) => table.campaignId === campaignId));
    } catch (error) {
      console.warn("[lootTableRepository] Supabase list failed, using local storage.", error);
      lastLootStorageMode = "supabase-fallback";
    }
  } else {
    lastLootStorageMode = "local";
  }

  return readLocalStore().filter((table) => table.campaignId === campaignId);
}

export async function getLootTable(id: string): Promise<LootTable | null> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabaseLootTable(id);
      if (remote) {
        lastLootStorageMode = "supabase";
        return remote;
      }
    } catch (error) {
      console.warn("[lootTableRepository] Supabase get failed, using local storage.", error);
      lastLootStorageMode = "supabase-fallback";
    }
  } else {
    lastLootStorageMode = "local";
  }

  return readLocalStore().find((table) => table.id === id) ?? null;
}

export async function saveLootTable(table: LootTable): Promise<LootTable> {
  const normalized = normalizeLootTable(table);
  let saved = normalized;

  if (isSupabaseConfigured() && normalized.campaignId !== LOCAL_DEMO_CAMPAIGN_ID) {
    try {
      saved = await saveSupabaseLootTable(normalized);
      lastLootStorageMode = "supabase";
    } catch (error) {
      console.warn("[lootTableRepository] Supabase save failed, caching locally.", error);
      lastLootStorageMode = "supabase-fallback";
    }
  } else {
    lastLootStorageMode = "local";
  }

  const local = readLocalStore().filter((entry) => entry.id !== saved.id);
  writeLocalStore([...local, saved]);
  return saved;
}

export async function deleteLootTable(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseLootTable(id);
      lastLootStorageMode = "supabase";
    } catch (error) {
      console.warn("[lootTableRepository] Supabase delete failed, removing locally.", error);
      lastLootStorageMode = "supabase-fallback";
    }
  } else {
    lastLootStorageMode = "local";
  }

  writeLocalStore(readLocalStore().filter((table) => table.id !== id));
}

export async function importLootTables(
  tables: LootTable[],
  campaignId = LOCAL_DEMO_CAMPAIGN_ID
): Promise<{ inserted: number; skipped: number }> {
  const existing = await listLootTables(campaignId);
  const seen = new Set(existing.map(duplicateKey));
  let inserted = 0;
  let skipped = 0;

  for (const table of tables) {
    const candidate = normalizeLootTable({
      ...table,
      id: isSupabaseConfigured() && campaignId !== LOCAL_DEMO_CAMPAIGN_ID ? crypto.randomUUID() : table.id,
      campaignId
    });
    const key = duplicateKey(candidate);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }

    await saveLootTable(candidate);
    seen.add(key);
    inserted += 1;
  }

  return { inserted, skipped };
}

export async function importStarterLootTables(
  campaignId = LOCAL_DEMO_CAMPAIGN_ID
): Promise<{ inserted: number; skipped: number }> {
  return importLootTables(starterLootTables, campaignId);
}
