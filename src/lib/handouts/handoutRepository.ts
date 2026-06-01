import { starterHandouts } from "@/data/handouts/starterHandouts";
import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import {
  LOCAL_DEMO_GAME_TABLE_ID,
  type HandoutKind,
  type Handout,
  type HandoutRewardApplication,
  type HandoutVisibility
} from "@/lib/handouts/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";
import type { RewardGrant } from "@/lib/loot/types";

const STORAGE_KEY = "tsr.handouts.v1";
const APPLICATION_STORAGE_KEY = "tsr.handoutRewardApplications.v1";

type HandoutRow = {
  id: string;
  game_table_id: string;
  kind?: HandoutKind | null;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  image_path: string | null;
  attachment_url: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  visibility: HandoutVisibility;
  selected_player_ids: string[] | null;
  tags: string[] | null;
  reward_payloads: unknown;
  codex_entry_ids: string[] | null;
  revealed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  handout_gm_notes?: { gm_notes: string | null }[] | { gm_notes: string | null } | null;
};

type HandoutRewardApplicationRow = {
  id: string;
  handout_id: string;
  character_id: string;
  game_table_id: string;
  applied_by: string | null;
  reward_summary: string;
  created_at: string;
};

let lastHandoutStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getHandoutStorageMode(): StorageMode {
  return lastHandoutStorageMode;
}

function isVisibility(value: unknown): value is HandoutVisibility {
  return (
    value === "gm_only" ||
    value === "selected_players" ||
    value === "campaign" ||
    value === "public"
  );
}

function isKind(value: unknown): value is HandoutKind {
  return (
    value === "lore" ||
    value === "wanted_poster" ||
    value === "spell_scroll" ||
    value === "treasure_note" ||
    value === "contract" ||
    value === "clue" ||
    value === "condition_notice" ||
    value === "faction_letter"
  );
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function parseRewardPayloads(value: unknown): RewardGrant[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is RewardGrant => {
    return Boolean(entry && typeof entry === "object" && typeof (entry as RewardGrant).type === "string");
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractGmNotes(row: HandoutRow): string | undefined {
  const notes = row.handout_gm_notes;
  if (Array.isArray(notes)) return notes[0]?.gm_notes ?? undefined;
  return notes?.gm_notes ?? undefined;
}

function rowToHandout(row: HandoutRow): Handout {
  return {
    id: row.id,
    gameTableId: row.game_table_id,
    kind: isKind(row.kind) ? row.kind : "lore",
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body ?? undefined,
    imageUrl: row.image_url ?? undefined,
    imagePath: row.image_path ?? undefined,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentPath: row.attachment_path ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentMimeType: row.attachment_mime_type ?? undefined,
    attachmentSize: row.attachment_size ?? undefined,
    visibility: isVisibility(row.visibility) ? row.visibility : "gm_only",
    selectedPlayerIds: parseStringArray(row.selected_player_ids),
    tags: parseStringArray(row.tags),
    gmNotes: extractGmNotes(row),
    rewardPayloads: parseRewardPayloads(row.reward_payloads),
    codexEntryIds: parseStringArray(row.codex_entry_ids),
    revealedAt: row.revealed_at,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function handoutToUpsert(handout: Handout) {
  const authState = await getCurrentAuthState();
  return {
    id: handout.id || crypto.randomUUID(),
    game_table_id: handout.gameTableId,
    kind: handout.kind ?? "lore",
    title: handout.title.trim(),
    subtitle: handout.subtitle?.trim() || null,
    body: handout.body?.trim() || null,
    image_url: handout.imageUrl?.trim() || null,
    image_path: handout.imagePath?.trim() || null,
    attachment_url: handout.attachmentUrl?.trim() || null,
    attachment_path: handout.attachmentPath?.trim() || null,
    attachment_name: handout.attachmentName?.trim() || null,
    attachment_mime_type: handout.attachmentMimeType?.trim() || null,
    attachment_size: handout.attachmentSize ?? null,
    visibility: handout.visibility,
    selected_player_ids: handout.selectedPlayerIds ?? [],
    tags: handout.tags.map((tag) => tag.trim()).filter(Boolean),
    reward_payloads: handout.rewardPayloads ?? [],
    codex_entry_ids: (handout.codexEntryIds ?? []).filter(isUuid),
    revealed_at: handout.revealedAt ?? null,
    created_by: handout.createdBy ?? authState.user?.id
  };
}

function normalizeHandout(handout: Handout): Handout {
  const now = new Date().toISOString();
  return {
    ...handout,
    id: handout.id || crypto.randomUUID(),
    gameTableId: handout.gameTableId || LOCAL_DEMO_GAME_TABLE_ID,
    kind: isKind(handout.kind) ? handout.kind : "lore",
    title: handout.title.trim(),
    subtitle: handout.subtitle?.trim() || undefined,
    body: handout.body?.trim() || undefined,
    imageUrl: handout.imageUrl?.trim() || undefined,
    imagePath: handout.imagePath?.trim() || undefined,
    attachmentUrl: handout.attachmentUrl?.trim() || undefined,
    attachmentPath: handout.attachmentPath?.trim() || undefined,
    attachmentName: handout.attachmentName?.trim() || undefined,
    attachmentMimeType: handout.attachmentMimeType?.trim() || undefined,
    attachmentSize: handout.attachmentSize,
    visibility: handout.visibility ?? "gm_only",
    selectedPlayerIds: handout.selectedPlayerIds ?? [],
    tags: (handout.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    gmNotes: handout.gmNotes?.trim() || undefined,
    rewardPayloads: handout.rewardPayloads ?? [],
    codexEntryIds: handout.codexEntryIds ?? [],
    revealedAt: handout.revealedAt ?? null,
    createdAt: handout.createdAt ?? now,
    updatedAt: now
  };
}

function readLocalStore(): Handout[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Handout => Boolean(entry && typeof entry === "object" && typeof entry.id === "string"))
      .map(normalizeHandout);
  } catch {
    return [];
  }
}

function writeLocalStore(handouts: Handout[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handouts.map(normalizeHandout)));
}

function rowToApplication(row: HandoutRewardApplicationRow): HandoutRewardApplication {
  return {
    id: row.id,
    handoutId: row.handout_id,
    characterId: row.character_id,
    gameTableId: row.game_table_id,
    appliedBy: row.applied_by ?? undefined,
    rewardSummary: row.reward_summary,
    createdAt: row.created_at
  };
}

function normalizeApplication(application: HandoutRewardApplication): HandoutRewardApplication {
  return {
    ...application,
    id: application.id || crypto.randomUUID(),
    gameTableId: application.gameTableId || LOCAL_DEMO_GAME_TABLE_ID,
    rewardSummary: application.rewardSummary.trim(),
    createdAt: application.createdAt ?? new Date().toISOString()
  };
}

function readLocalApplicationStore(): HandoutRewardApplication[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APPLICATION_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is HandoutRewardApplication => {
        return Boolean(
          entry &&
            typeof entry === "object" &&
            typeof entry.id === "string" &&
            typeof entry.handoutId === "string" &&
            typeof entry.characterId === "string"
        );
      })
      .map(normalizeApplication);
  } catch {
    return [];
  }
}

function writeLocalApplicationStore(applications: HandoutRewardApplication[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPLICATION_STORAGE_KEY,
    JSON.stringify(applications.map(normalizeApplication))
  );
}

function duplicateKey(handout: Pick<Handout, "gameTableId" | "title">): string {
  return `${handout.gameTableId}|${handout.title.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

async function listSupabaseHandouts(gameTableId: string): Promise<Handout[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("handouts")
    .select("*, handout_gm_notes(gm_notes)")
    .eq("game_table_id", gameTableId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as HandoutRow[]).map(rowToHandout);
}

async function getSupabaseHandout(id: string): Promise<Handout | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("handouts")
    .select("*, handout_gm_notes(gm_notes)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToHandout(data as HandoutRow) : null;
}

async function saveSupabaseHandout(handout: Handout): Promise<Handout> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = await handoutToUpsert(handout);
  const { data, error } = await client.from("handouts").upsert(payload).select("*").single();
  if (error) throw error;

  if (handout.gmNotes?.trim()) {
    const { error: notesError } = await client.from("handout_gm_notes").upsert({
      handout_id: data.id,
      gm_notes: handout.gmNotes.trim()
    });
    if (notesError) throw notesError;
  } else {
    const { error: notesDeleteError } = await client
      .from("handout_gm_notes")
      .delete()
      .eq("handout_id", data.id);
    if (notesDeleteError) throw notesDeleteError;
  }

  return (await getSupabaseHandout(data.id)) ?? rowToHandout(data as HandoutRow);
}

async function deleteSupabaseHandout(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("handouts").delete().eq("id", id);
  if (error) throw error;
}

async function listSupabaseRewardApplications(gameTableId: string): Promise<HandoutRewardApplication[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("handout_reward_applications")
    .select("*")
    .eq("game_table_id", gameTableId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HandoutRewardApplicationRow[]).map(rowToApplication);
}

async function saveSupabaseRewardApplication(
  application: Omit<HandoutRewardApplication, "id" | "createdAt">
): Promise<HandoutRewardApplication> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const authState = await getCurrentAuthState();
  const { data, error } = await client
    .from("handout_reward_applications")
    .insert({
      handout_id: application.handoutId,
      character_id: application.characterId,
      game_table_id: application.gameTableId,
      applied_by: application.appliedBy ?? authState.user?.id,
      reward_summary: application.rewardSummary
    })
    .select("*")
    .single();

  if (error) throw error;
  return rowToApplication(data as HandoutRewardApplicationRow);
}

export async function listHandouts(gameTableId = LOCAL_DEMO_GAME_TABLE_ID): Promise<Handout[]> {
  if (isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      const remote = await listSupabaseHandouts(gameTableId);
      lastHandoutStorageMode = "supabase";
      return remote;
    } catch (error) {
      console.warn("[handoutRepository] Supabase list failed, using local storage.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  } else {
    lastHandoutStorageMode = "local";
  }

  return readLocalStore().filter((handout) => handout.gameTableId === gameTableId);
}

export async function listHandoutRewardApplications(
  gameTableId = LOCAL_DEMO_GAME_TABLE_ID
): Promise<HandoutRewardApplication[]> {
  if (isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      const remote = await listSupabaseRewardApplications(gameTableId);
      lastHandoutStorageMode = "supabase";
      return remote;
    } catch (error) {
      console.warn("[handoutRepository] Supabase application list failed, using local storage.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  }

  return readLocalApplicationStore().filter((application) => application.gameTableId === gameTableId);
}

export async function createHandoutRewardApplication(
  application: Omit<HandoutRewardApplication, "id" | "createdAt">
): Promise<HandoutRewardApplication> {
  let saved: HandoutRewardApplication = normalizeApplication({
    ...application,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  });

  if (isSupabaseConfigured() && application.gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      saved = await saveSupabaseRewardApplication(application);
      lastHandoutStorageMode = "supabase";
    } catch (error) {
      console.warn("[handoutRepository] Supabase application save failed, caching locally.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  }

  writeLocalApplicationStore([saved, ...readLocalApplicationStore()]);
  return saved;
}

export async function getHandout(id: string): Promise<Handout | null> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabaseHandout(id);
      if (remote) {
        lastHandoutStorageMode = "supabase";
        return remote;
      }
      lastHandoutStorageMode = "supabase";
      return null;
    } catch (error) {
      console.warn("[handoutRepository] Supabase get failed, using local storage.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  } else {
    lastHandoutStorageMode = "local";
  }

  return readLocalStore().find((handout) => handout.id === id) ?? null;
}

export async function saveHandout(handout: Handout): Promise<Handout> {
  const normalized = normalizeHandout(handout);
  let saved = normalized;

  if (isSupabaseConfigured() && normalized.gameTableId !== LOCAL_DEMO_GAME_TABLE_ID) {
    try {
      saved = await saveSupabaseHandout(normalized);
      lastHandoutStorageMode = "supabase";
    } catch (error) {
      console.warn("[handoutRepository] Supabase save failed, caching locally.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  } else {
    lastHandoutStorageMode = "local";
  }

  const local = readLocalStore().filter((entry) => entry.id !== saved.id);
  writeLocalStore([...local, saved]);
  return saved;
}

export async function deleteHandout(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseHandout(id);
      lastHandoutStorageMode = "supabase";
    } catch (error) {
      console.warn("[handoutRepository] Supabase delete failed, removing locally.", error);
      lastHandoutStorageMode = "supabase-fallback";
    }
  } else {
    lastHandoutStorageMode = "local";
  }

  writeLocalStore(readLocalStore().filter((handout) => handout.id !== id));
}

export async function revealHandout(
  id: string,
  visibility: HandoutVisibility,
  selectedPlayerIds: string[] = []
): Promise<Handout> {
  const handout = await getHandout(id);
  if (!handout) throw new Error("Handout not found.");

  return saveHandout({
    ...handout,
    visibility,
    selectedPlayerIds,
    revealedAt: visibility === "gm_only" ? handout.revealedAt ?? null : new Date().toISOString()
  });
}

export async function importHandouts(
  handouts: Handout[],
  gameTableId = LOCAL_DEMO_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  const existing = await listHandouts(gameTableId);
  const seen = new Set(existing.map(duplicateKey));
  let inserted = 0;
  let skipped = 0;

  for (const handout of handouts) {
    const candidate = normalizeHandout({
      ...handout,
      id: isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_GAME_TABLE_ID ? crypto.randomUUID() : handout.id,
      gameTableId
    });
    const key = duplicateKey(candidate);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }

    await saveHandout(candidate);
    seen.add(key);
    inserted += 1;
  }

  return { inserted, skipped };
}

export async function importStarterHandouts(
  gameTableId = LOCAL_DEMO_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  return importHandouts(starterHandouts, gameTableId);
}
