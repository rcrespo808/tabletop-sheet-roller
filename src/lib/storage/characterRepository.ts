import { characterProfiles } from "@/data/characters";
import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import { normalizeCharacterProfile } from "@/lib/sheets/customCharacters";
import {
  deleteLocalCharacter,
  getLocalCharacter,
  listLocalCharacters,
  saveLocalCharacter
} from "@/lib/storage/localCharacterRepository";
import {
  deleteSupabaseCharacter,
  getSupabaseCharacter,
  listSupabaseCharacters,
  saveSupabaseCharacter
} from "@/lib/storage/supabaseCharacterRepository";
import { deleteCharacterImageAssets, upsertCharacterImageAsset } from "@/lib/storage/characterImageRepository";
import { isSupabaseStorageUrl, storagePathFromPublicUrl } from "@/lib/storage/characterImageStorage";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import { collectProfileImageUrls } from "@/lib/storage/characterImages";
import type { StorageMode } from "@/lib/storage/types";
import type { CharacterProfile } from "@/lib/sheets/types";

let lastStorageMode: StorageMode = isSupabaseConfigured() ? "auth-required" : "local";

export function getStorageMode(): StorageMode {
  return lastStorageMode;
}

function mergeProfiles(fallback: CharacterProfile[], primary: CharacterProfile[]): CharacterProfile[] {
  const merged = new Map<string, CharacterProfile>();

  for (const profile of fallback) {
    merged.set(profile.id, profile);
  }
  for (const profile of primary) {
    merged.set(profile.id, profile);
  }

  return Array.from(merged.values());
}

function withSeedIfEmpty(profiles: CharacterProfile[]): CharacterProfile[] {
  if (profiles.length > 0) return profiles;
  return [...characterProfiles];
}

async function syncProfileImageAssets(profile: CharacterProfile): Promise<void> {
  for (const image of collectProfileImageUrls(profile)) {
    if (!isSupabaseStorageUrl(image.publicUrl)) continue;

    const storagePath = storagePathFromPublicUrl(image.publicUrl);
    if (!storagePath) continue;

    await upsertCharacterImageAsset({
      characterId: profile.id,
      kind: image.kind,
      system: image.system,
      storagePath,
      publicUrl: image.publicUrl
    });
  }
}

export async function listCharacters(): Promise<CharacterProfile[]> {
  if (isSupabaseConfigured()) {
    const authState = await getCurrentAuthState();
    if (!authState.user) {
      lastStorageMode = "auth-required";
      return listLocalCharacters();
    }

    try {
      const remote = await listSupabaseCharacters();
      lastStorageMode = "supabase";
      const local = await listLocalCharacters();
      for (const profile of remote) {
        await saveLocalCharacter(profile);
      }
      return withSeedIfEmpty(mergeProfiles(local, remote));
    } catch (error) {
      console.warn("[characterRepository] Supabase list failed, using local storage.", error);
      lastStorageMode = "supabase-fallback";
    }
  } else {
    lastStorageMode = "local";
  }

  return listLocalCharacters();
}

export async function getCharacter(id: string): Promise<CharacterProfile | null> {
  if (isSupabaseConfigured()) {
    const authState = await getCurrentAuthState();
    if (!authState.user) {
      lastStorageMode = "auth-required";
      return getLocalCharacter(id);
    }

    try {
      const remote = await getSupabaseCharacter(id);
      if (remote) {
        lastStorageMode = "supabase";
        await saveLocalCharacter(remote);
        return remote;
      }
    } catch (error) {
      console.warn("[characterRepository] Supabase get failed, using local storage.", error);
      lastStorageMode = "supabase-fallback";
    }
  } else {
    lastStorageMode = "local";
  }

  return getLocalCharacter(id);
}

export async function saveCharacter(profile: CharacterProfile): Promise<CharacterProfile> {
  const authState = isSupabaseConfigured() ? await getCurrentAuthState() : null;
  const baseProfile = normalizeCharacterProfile(profile);
  const normalized =
    authState?.user && !baseProfile.ownerUserId
      ? {
          ...baseProfile,
          ownerUserId: authState.user.id
        }
      : baseProfile;
  let saved = normalized;

  if (isSupabaseConfigured() && authState?.user) {
    try {
      saved = await saveSupabaseCharacter(normalized);
      await syncProfileImageAssets(saved);
      lastStorageMode = "supabase";
    } catch (error) {
      console.warn("[characterRepository] Supabase save failed, caching locally.", error);
      lastStorageMode = "supabase-fallback";
    }
  } else {
    lastStorageMode = "local";
  }

  return saveLocalCharacter(saved);
}

export async function deleteCharacter(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteCharacterImageAssets(id);
      await deleteSupabaseCharacter(id);
      lastStorageMode = "supabase";
    } catch (error) {
      console.warn("[characterRepository] Supabase delete failed, removing locally.", error);
      lastStorageMode = "supabase-fallback";
    }
  } else {
    lastStorageMode = "local";
  }

  await deleteLocalCharacter(id);
}

export async function resolveCharacterLookup(
  characterId: string
): Promise<{ profile: CharacterProfile; initialSystem?: "dnd5e" | "nwod" } | null> {
  const LEGACY_ALIASES: Record<string, { profileId: string; system?: "dnd5e" | "nwod" }> = {
    "he-zhen-nwod": { profileId: "he-zhen", system: "nwod" }
  };

  const alias = LEGACY_ALIASES[characterId];
  const resolvedId = alias?.profileId ?? characterId;
  const profile = await getCharacter(resolvedId);

  if (!profile) return null;
  return { profile, initialSystem: alias?.system };
}
