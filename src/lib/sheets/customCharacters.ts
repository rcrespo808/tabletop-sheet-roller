import type { CharacterSheet } from "@/lib/sheets/types";

const STORAGE_KEY = "tsr.customCharacters.v1";

export function normalizeCharacter(character: CharacterSheet): CharacterSheet {
  return {
    ...character,
    id: character.id.trim(),
    name: character.name.trim(),
    subtitle: character.subtitle?.trim(),
    sheetImage: character.sheetImage.trim()
  };
}

export function parseCharacterSheet(input: unknown): CharacterSheet | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.id !== "string") return null;
  if (typeof candidate.name !== "string") return null;
  if (candidate.system !== "dnd5e" && candidate.system !== "nwod") return null;
  if (typeof candidate.sheetImage !== "string") return null;
  if (!Array.isArray(candidate.actions)) return null;

  return normalizeCharacter({
    id: candidate.id,
    name: candidate.name,
    system: candidate.system,
    subtitle: typeof candidate.subtitle === "string" ? candidate.subtitle : undefined,
    sheetImage: candidate.sheetImage,
    actions: candidate.actions as CharacterSheet["actions"]
  });
}

export function loadCustomCharacters(): CharacterSheet[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => parseCharacterSheet(entry))
      .filter((entry): entry is CharacterSheet => Boolean(entry));
  } catch {
    return [];
  }
}

export function saveCustomCharacters(characters: CharacterSheet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(characters.map(normalizeCharacter)));
}
