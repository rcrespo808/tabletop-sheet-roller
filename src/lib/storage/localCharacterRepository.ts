import { characterProfiles } from "@/data/characters";
import {
  loadCustomProfiles,
  normalizeCharacterProfile,
  saveCustomProfiles
} from "@/lib/sheets/customCharacters";
import type { CharacterProfile } from "@/lib/sheets/types";

function mergeWithSeed(profiles: CharacterProfile[]): CharacterProfile[] {
  const merged = new Map<string, CharacterProfile>();

  for (const profile of characterProfiles) {
    merged.set(profile.id, profile);
  }
  for (const profile of profiles) {
    merged.set(profile.id, profile);
  }

  return Array.from(merged.values());
}

export async function listLocalCharacters(): Promise<CharacterProfile[]> {
  return mergeWithSeed(loadCustomProfiles());
}

export async function getLocalCharacter(id: string): Promise<CharacterProfile | null> {
  const profiles = await listLocalCharacters();
  return profiles.find((profile) => profile.id === id) ?? null;
}

export async function saveLocalCharacter(profile: CharacterProfile): Promise<CharacterProfile> {
  const normalized = normalizeCharacterProfile(profile);
  const custom = loadCustomProfiles().filter((entry) => entry.id !== normalized.id);
  saveCustomProfiles([...custom, normalized]);
  return normalized;
}

export async function deleteLocalCharacter(id: string): Promise<void> {
  const custom = loadCustomProfiles().filter((entry) => entry.id !== id);
  saveCustomProfiles(custom);
}

export function isSeedCharacter(id: string): boolean {
  return characterProfiles.some((profile) => profile.id === id);
}
