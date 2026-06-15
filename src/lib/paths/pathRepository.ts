import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import {
  LOCAL_DEMO_GAME_TABLE_ID,
  type BranchingPath,
  type PathStatus
} from "@/lib/paths/types";
import {
  pathToUpsert,
  rowToBranchingPath,
  type BranchingPathRow
} from "@/lib/paths/pathMappers";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";

const STORAGE_KEY = "tsr.paths.v1";

let lastPathStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getPathStorageMode(): StorageMode {
  return lastPathStorageMode;
}

function normalizePath(path: BranchingPath): BranchingPath {
  const now = new Date().toISOString();
  return {
    ...path,
    id: path.id || crypto.randomUUID(),
    gameTableId: path.gameTableId || LOCAL_DEMO_GAME_TABLE_ID,
    name: path.name.trim(),
    description: path.description?.trim() || undefined,
    status: path.status ?? "draft",
    visibility: path.visibility ?? "gm_only",
    selectedPlayerIds: path.selectedPlayerIds ?? [],
    currentNodeIds: path.currentNodeIds ?? [],
    startNodeId: path.startNodeId,
    nodes: path.nodes ?? [],
    edges: path.edges ?? [],
    gmNotes: path.gmNotes?.trim() || undefined,
    tags: (path.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    metadata: path.metadata ?? {},
    createdAt: path.createdAt ?? now,
    updatedAt: now
  };
}

function readLocalStore(): BranchingPath[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is BranchingPath =>
          Boolean(entry && typeof entry === "object" && typeof entry.id === "string")
      )
      .map(normalizePath);
  } catch {
    return [];
  }
}

function writeLocalStore(paths: BranchingPath[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paths.map(normalizePath)));
}

function duplicateKey(path: Pick<BranchingPath, "gameTableId" | "name">): string {
  return `${path.gameTableId}|${path.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

async function listSupabasePaths(gameTableId: string): Promise<BranchingPath[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("branching_paths")
    .select("*")
    .eq("game_table_id", gameTableId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as BranchingPathRow[]).map(rowToBranchingPath);
}

async function getSupabasePath(id: string): Promise<BranchingPath | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("branching_paths").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToBranchingPath(data as BranchingPathRow) : null;
}

async function saveSupabasePath(path: BranchingPath): Promise<BranchingPath> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = await pathToUpsert(path);
  const { data, error } = await client.from("branching_paths").upsert(payload).select("*").single();
  if (error) throw error;
  return rowToBranchingPath(data as BranchingPathRow);
}

async function deleteSupabasePath(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("branching_paths").delete().eq("id", id);
  if (error) throw error;
}

export async function listPaths(gameTableId = LOCAL_DEMO_GAME_TABLE_ID): Promise<BranchingPath[]> {
  if (isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      const remote = await listSupabasePaths(gameTableId);
      lastPathStorageMode = "supabase";
      return remote;
    } catch (error) {
      console.warn("[pathRepository] Supabase list failed, using local storage.", error);
      lastPathStorageMode = "supabase-fallback";
    }
  } else {
    lastPathStorageMode = "local";
  }

  return readLocalStore().filter((path) => path.gameTableId === gameTableId);
}

export async function getPath(id: string): Promise<BranchingPath | null> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabasePath(id);
      if (remote) {
        lastPathStorageMode = "supabase";
        return remote;
      }
      lastPathStorageMode = "supabase";
      return null;
    } catch (error) {
      console.warn("[pathRepository] Supabase get failed, using local storage.", error);
      lastPathStorageMode = "supabase-fallback";
    }
  } else {
    lastPathStorageMode = "local";
  }

  return readLocalStore().find((path) => path.id === id) ?? null;
}

export async function savePath(path: BranchingPath): Promise<BranchingPath> {
  const normalized = normalizePath(path);
  let saved = normalized;

  if (isSupabaseConfigured() && normalized.gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      saved = await saveSupabasePath(normalized);
      lastPathStorageMode = "supabase";
    } catch (error) {
      console.warn("[pathRepository] Supabase save failed, caching locally.", error);
      lastPathStorageMode = "supabase-fallback";
    }
  } else {
    lastPathStorageMode = "local";
  }

  const local = readLocalStore().filter((entry) => entry.id !== saved.id);
  writeLocalStore([...local, saved]);
  return saved;
}

export async function deletePath(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabasePath(id);
      lastPathStorageMode = "supabase";
    } catch (error) {
      console.warn("[pathRepository] Supabase delete failed, removing locally.", error);
      lastPathStorageMode = "supabase-fallback";
    }
  } else {
    lastPathStorageMode = "local";
  }

  writeLocalStore(readLocalStore().filter((path) => path.id !== id));
}

export async function activatePath(id: string): Promise<BranchingPath> {
  const path = await getPath(id);
  if (!path) throw new Error("Path not found.");

  return savePath({ ...path, status: "active" });
}

export async function archivePath(id: string): Promise<BranchingPath> {
  const path = await getPath(id);
  if (!path) throw new Error("Path not found.");

  return savePath({ ...path, status: "archived" });
}

export async function createEmptyPath(
  gameTableId: string,
  name = "New Path"
): Promise<BranchingPath> {
  const authState = await getCurrentAuthState();
  const startNodeId = crypto.randomUUID();

  const path: BranchingPath = {
    id: crypto.randomUUID(),
    gameTableId,
    name,
    status: "draft",
    visibility: "gm_only",
    currentNodeIds: [startNodeId],
    startNodeId,
    nodes: [
      {
        id: startNodeId,
        title: "Start",
        kind: "start",
        status: "available"
      }
    ],
    edges: [],
    tags: []
  };

  if (authState.user?.id) {
    path.createdBy = authState.user.id;
  }

  return savePath(path);
}

export async function importPaths(
  paths: BranchingPath[],
  gameTableId = LOCAL_DEMO_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  const existing = await listPaths(gameTableId);
  const seen = new Set(existing.map(duplicateKey));
  let inserted = 0;
  let skipped = 0;

  for (const path of paths) {
    const normalized = normalizePath({ ...path, gameTableId, id: crypto.randomUUID() });
    const key = duplicateKey(normalized);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    await savePath(normalized);
    inserted += 1;
  }

  return { inserted, skipped };
}

export async function importStarterPaths(
  gameTableId = LOCAL_DEMO_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  const { starterPaths } = await import("@/data/paths/starterPaths");
  const clones = starterPaths.map((path) => ({
    ...path,
    id: crypto.randomUUID(),
    gameTableId,
    status: "draft" as PathStatus,
    nodes: path.nodes.map((node) => ({ ...node })),
    edges: path.edges.map((edge) => ({ ...edge }))
  }));
  return importPaths(clones, gameTableId);
}
