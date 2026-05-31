import { ensureActionIds, getCharacterProfile, characterProfiles } from "@/data/characters";
import type {
  CharacterKind,
  CharacterProfile,
  GameSystem,
  LegacyCharacterSheet,
  SheetAction,
  SystemSheet
} from "@/lib/sheets/types";

const STORAGE_KEY_V2 = "tsr.customCharacters.v2";
const STORAGE_KEY_V1 = "tsr.customCharacters.v1";

/** Legacy bookmark aliases → profile + optional default system tab */
const LEGACY_ID_ALIASES: Record<string, { profileId: string; system?: GameSystem }> = {
  "he-zhen-nwod": { profileId: "he-zhen", system: "nwod" }
};

export type CharacterLookupResult = {
  profile: CharacterProfile;
  initialSystem?: GameSystem;
};

export function normalizeCharacterProfile(profile: CharacterProfile): CharacterProfile {
  const sheets: CharacterProfile["sheets"] = {};

  for (const system of ["dnd5e", "nwod"] as const) {
    const sheet = profile.sheets[system];
    if (!sheet) continue;

    sheets[system] = {
      ...sheet,
      system,
      actions: ensureActionIds(sheet.actions)
    };
  }

  return {
    ...profile,
    id: profile.id.trim(),
    ownerUserId: profile.ownerUserId,
    ownerLabel: profile.ownerLabel?.trim(),
    characterKind: profile.characterKind ?? "player_character",
    name: profile.name.trim(),
    subtitle: profile.subtitle?.trim(),
    concept: profile.concept?.trim(),
    portraitImage: profile.portraitImage?.trim(),
    defaultSystem: profile.defaultSystem,
    sheets,
    inventory: profile.inventory ?? [],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

function isGameSystem(value: unknown): value is GameSystem {
  return value === "dnd5e" || value === "nwod";
}

function isCharacterKind(value: unknown): value is CharacterKind {
  return value === "player_character" || value === "gm_character";
}

function parseSystemSheet(input: unknown, system: GameSystem): SystemSheet | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  if (!Array.isArray(candidate.actions)) return null;

  return {
    system,
    label: typeof candidate.label === "string" ? candidate.label : undefined,
    levelLabel: typeof candidate.levelLabel === "string" ? candidate.levelLabel : undefined,
    sheetImage: typeof candidate.sheetImage === "string" ? candidate.sheetImage : undefined,
    attributes:
      candidate.attributes && typeof candidate.attributes === "object"
        ? (candidate.attributes as SystemSheet["attributes"])
        : undefined,
    stats:
      candidate.stats && typeof candidate.stats === "object"
        ? (candidate.stats as SystemSheet["stats"])
        : undefined,
    skills:
      candidate.skills && typeof candidate.skills === "object"
        ? (candidate.skills as SystemSheet["skills"])
        : undefined,
    actions: ensureActionIds(candidate.actions as Omit<SheetAction, "id">[]),
    metadata:
      candidate.metadata && typeof candidate.metadata === "object"
        ? (candidate.metadata as SystemSheet["metadata"])
        : undefined
  };
}

function wrapLegacyFlatSheet(input: Record<string, unknown>): CharacterProfile | null {
  if (!isGameSystem(input.system)) return null;
  if (typeof input.id !== "string" || typeof input.name !== "string") return null;
  if (typeof input.sheetImage !== "string") return null;
  if (!Array.isArray(input.actions)) return null;

  const system = input.system;

  return normalizeCharacterProfile({
    id: input.id,
    name: input.name,
    subtitle: typeof input.subtitle === "string" ? input.subtitle : undefined,
    defaultSystem: system,
    portraitImage: input.sheetImage,
    sheets: {
      [system]: {
        system,
        sheetImage: input.sheetImage,
        actions: ensureActionIds(input.actions as Omit<SheetAction, "id">[])
      }
    }
  });
}

export function parseCharacterProfile(input: unknown): CharacterProfile | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;

  if (isGameSystem(candidate.system) && Array.isArray(candidate.actions) && !candidate.sheets) {
    return wrapLegacyFlatSheet(candidate);
  }

  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return null;
  if (!isGameSystem(candidate.defaultSystem)) return null;
  if (!candidate.sheets || typeof candidate.sheets !== "object") return null;

  const sheetsInput = candidate.sheets as Record<string, unknown>;
  const sheets: CharacterProfile["sheets"] = {};

  for (const system of ["dnd5e", "nwod"] as const) {
    const parsed = parseSystemSheet(sheetsInput[system], system);
    if (parsed) sheets[system] = parsed;
  }

  if (Object.keys(sheets).length === 0) return null;

  const sheetSystems = Object.keys(sheets) as GameSystem[];
  const defaultSystem =
    candidate.defaultSystem in sheets ? candidate.defaultSystem : sheetSystems[0];

  return normalizeCharacterProfile({
    id: candidate.id,
    name: candidate.name,
    ownerUserId: typeof candidate.ownerUserId === "string" ? candidate.ownerUserId : undefined,
    ownerLabel: typeof candidate.ownerLabel === "string" ? candidate.ownerLabel : undefined,
    characterKind: isCharacterKind(candidate.characterKind)
      ? candidate.characterKind
      : "player_character",
    subtitle: typeof candidate.subtitle === "string" ? candidate.subtitle : undefined,
    concept: typeof candidate.concept === "string" ? candidate.concept : undefined,
    portraitImage:
      typeof candidate.portraitImage === "string" ? candidate.portraitImage : undefined,
    defaultSystem,
    sheets,
    inventory: Array.isArray(candidate.inventory) ? candidate.inventory : [],
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined
  });
}

function migrateLegacyV1Entry(entry: LegacyCharacterSheet): CharacterProfile | null {
  return wrapLegacyFlatSheet(entry as unknown as Record<string, unknown>);
}

function loadLegacyV1Profiles(): CharacterProfile[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY_V1);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => migrateLegacyV1Entry(entry as LegacyCharacterSheet))
      .filter((entry): entry is CharacterProfile => Boolean(entry));
  } catch {
    return [];
  }
}

export function loadCustomProfiles(): CharacterProfile[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY_V2);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => parseCharacterProfile(entry))
          .filter((entry): entry is CharacterProfile => Boolean(entry));
      }
    } catch {
      // Fall through to legacy v1 migration when v2 data is corrupt.
    }
  }

  const migrated = loadLegacyV1Profiles();
  if (migrated.length > 0) {
    saveCustomProfiles(migrated);
  }
  return migrated;
}

export function saveCustomProfiles(profiles: CharacterProfile[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY_V2,
    JSON.stringify(profiles.map(normalizeCharacterProfile))
  );
}

export function getAllProfiles(customProfiles: CharacterProfile[] = []): CharacterProfile[] {
  const merged = new Map<string, CharacterProfile>();

  for (const profile of characterProfiles) {
    merged.set(profile.id, profile);
  }
  for (const profile of customProfiles) {
    merged.set(profile.id, profile);
  }

  return Array.from(merged.values());
}

export function resolveCharacter(characterId: string): CharacterLookupResult | undefined {
  const alias = LEGACY_ID_ALIASES[characterId];
  const resolvedId = alias?.profileId ?? characterId;

  const seeded = getCharacterProfile(resolvedId);
  if (seeded) {
    return { profile: seeded, initialSystem: alias?.system };
  }

  const custom = loadCustomProfiles().find((entry) => entry.id === resolvedId);
  if (custom) {
    return { profile: custom, initialSystem: alias?.system };
  }

  return undefined;
}

/** @deprecated Use parseCharacterProfile */
export function parseCharacterSheet(input: unknown): CharacterProfile | null {
  return parseCharacterProfile(input);
}

/** @deprecated Use loadCustomProfiles */
export function loadCustomCharacters(): CharacterProfile[] {
  return loadCustomProfiles();
}

/** @deprecated Use saveCustomProfiles */
export function saveCustomCharacters(profiles: CharacterProfile[]) {
  saveCustomProfiles(profiles);
}

/** @deprecated Use normalizeCharacterProfile */
export function normalizeCharacter(profile: CharacterProfile): CharacterProfile {
  return normalizeCharacterProfile(profile);
}
