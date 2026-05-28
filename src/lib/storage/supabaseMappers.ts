import { ensureActionIds } from "@/data/characters";
import type { CharacterProfile, GameSystem, SystemSheet } from "@/lib/sheets/types";

export type CharacterProfileRow = {
  id: string;
  owner_label: string | null;
  name: string;
  subtitle: string | null;
  concept: string | null;
  portrait_image: string | null;
  default_system: GameSystem;
  sheets: unknown;
  created_at: string;
  updated_at: string;
};

function isGameSystem(value: unknown): value is GameSystem {
  return value === "dnd5e" || value === "nwod";
}

function parseSheets(value: unknown): CharacterProfile["sheets"] {
  if (!value || typeof value !== "object") return {};

  const input = value as Record<string, unknown>;
  const sheets: CharacterProfile["sheets"] = {};

  for (const system of ["dnd5e", "nwod"] as const) {
    const raw = input[system];
    if (!raw || typeof raw !== "object") continue;

    const sheet = raw as Record<string, unknown>;
    if (!Array.isArray(sheet.actions)) continue;

    sheets[system] = {
      system,
      label: typeof sheet.label === "string" ? sheet.label : undefined,
      levelLabel: typeof sheet.levelLabel === "string" ? sheet.levelLabel : undefined,
      sheetImage: typeof sheet.sheetImage === "string" ? sheet.sheetImage : undefined,
      attributes:
        sheet.attributes && typeof sheet.attributes === "object"
          ? (sheet.attributes as SystemSheet["attributes"])
          : undefined,
      stats:
        sheet.stats && typeof sheet.stats === "object"
          ? (sheet.stats as SystemSheet["stats"])
          : undefined,
      skills:
        sheet.skills && typeof sheet.skills === "object"
          ? (sheet.skills as SystemSheet["skills"])
          : undefined,
      actions: ensureActionIds(sheet.actions as SystemSheet["actions"]),
      metadata:
        sheet.metadata && typeof sheet.metadata === "object"
          ? (sheet.metadata as SystemSheet["metadata"])
          : undefined
    };
  }

  return sheets;
}

export function rowToCharacterProfile(row: CharacterProfileRow): CharacterProfile {
  const sheets = parseSheets(row.sheets);
  const sheetSystems = Object.keys(sheets) as GameSystem[];
  const defaultSystem =
    isGameSystem(row.default_system) && sheets[row.default_system]
      ? row.default_system
      : sheetSystems[0] ?? "dnd5e";

  return {
    id: row.id,
    ownerLabel: row.owner_label ?? undefined,
    name: row.name,
    subtitle: row.subtitle ?? undefined,
    concept: row.concept ?? undefined,
    portraitImage: row.portrait_image ?? undefined,
    defaultSystem,
    sheets,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function characterProfileToInsert(profile: CharacterProfile) {
  return {
    id: profile.id,
    owner_label: profile.ownerLabel ?? null,
    name: profile.name,
    subtitle: profile.subtitle ?? null,
    concept: profile.concept ?? null,
    portrait_image: profile.portraitImage ?? null,
    default_system: profile.defaultSystem,
    sheets: profile.sheets
  };
}

export function characterProfileToUpdate(profile: CharacterProfile) {
  return {
    owner_label: profile.ownerLabel ?? null,
    name: profile.name,
    subtitle: profile.subtitle ?? null,
    concept: profile.concept ?? null,
    portrait_image: profile.portraitImage ?? null,
    default_system: profile.defaultSystem,
    sheets: profile.sheets
  };
}
