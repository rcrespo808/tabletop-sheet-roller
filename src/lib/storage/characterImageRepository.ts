import {
  CHARACTER_IMAGES_BUCKET,
  isSupabaseStorageUrl,
  storagePathFromPublicUrl
} from "@/lib/storage/characterImageStorage";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import type { CharacterImageAsset, CharacterImageKind } from "@/lib/storage/characterImages";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";

export type CharacterImageAssetRow = {
  id: string;
  character_id: string;
  image_kind: CharacterImageKind;
  game_system: GameSystem | null;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  byte_size: number | null;
  created_at: string;
  updated_at: string;
};

function rowToAsset(row: CharacterImageAssetRow): CharacterImageAsset {
  return {
    id: row.id,
    characterId: row.character_id,
    kind: row.image_kind,
    system: row.game_system ?? undefined,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type ?? undefined,
    byteSize: row.byte_size ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function upsertCharacterImageAsset(input: {
  characterId: string;
  kind: CharacterImageKind;
  system?: GameSystem;
  storagePath: string;
  publicUrl: string;
  mimeType?: string;
  byteSize?: number;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const payload = {
    character_id: input.characterId,
    image_kind: input.kind,
    game_system: input.kind === "sheet" ? (input.system ?? null) : null,
    storage_bucket: CHARACTER_IMAGES_BUCKET,
    storage_path: input.storagePath,
    public_url: input.publicUrl,
    mime_type: input.mimeType ?? null,
    byte_size: input.byteSize ?? null
  };

  const { error } = await client.from("character_image_assets").upsert(payload, {
    onConflict: "storage_path"
  });

  if (error) {
    console.warn("[characterImageRepository] Failed to upsert image asset metadata.", error);
  }
}

export async function syncCharacterImageAssets(
  profile: CharacterProfile,
  uploads: Array<{
    kind: CharacterImageKind;
    system?: GameSystem;
    storagePath: string;
    publicUrl: string;
    mimeType?: string;
    byteSize?: number;
  }>
): Promise<void> {
  for (const upload of uploads) {
    if (!isSupabaseStorageUrl(upload.publicUrl)) continue;

    await upsertCharacterImageAsset({
      characterId: profile.id,
      kind: upload.kind,
      system: upload.system,
      storagePath: upload.storagePath,
      publicUrl: upload.publicUrl,
      mimeType: upload.mimeType,
      byteSize: upload.byteSize
    });
  }
}

export async function listCharacterImageAssets(
  characterId: string
): Promise<CharacterImageAsset[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("character_image_assets")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[characterImageRepository] Failed to list image assets.", error);
    return [];
  }

  return (data as CharacterImageAssetRow[]).map(rowToAsset);
}

export async function deleteCharacterImageAssets(characterId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const assets = await listCharacterImageAssets(characterId);
  const paths = assets.map((asset) => asset.storagePath).filter(Boolean);

  if (paths.length > 0) {
    await client.storage.from(CHARACTER_IMAGES_BUCKET).remove(paths);
  }

  const { error } = await client
    .from("character_image_assets")
    .delete()
    .eq("character_id", characterId);

  if (error) {
    console.warn("[characterImageRepository] Failed to delete image asset rows.", error);
  }
}

export function inferStoragePathFromUrl(publicUrl: string): string | null {
  return storagePathFromPublicUrl(publicUrl);
}
