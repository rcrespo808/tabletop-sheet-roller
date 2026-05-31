import { ensureActionIds } from "@/data/characters";
import type {
  ActiveCondition,
  CharacterProgression,
  CurrencyWallet,
  CharacterInventoryItem,
  CharacterKind,
  CharacterProfile,
  GameSystem,
  SystemSheet
} from "@/lib/sheets/types";

export type CharacterProfileRow = {
  id: string;
  owner_user_id: string | null;
  owner_label: string | null;
  character_kind: CharacterKind | null;
  name: string;
  subtitle: string | null;
  concept: string | null;
  portrait_image: string | null;
  default_system: GameSystem;
  sheets: unknown;
  inventory?: unknown;
  wallet?: unknown;
  reward_history?: unknown;
  progression?: unknown;
  conditions?: unknown;
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

function parseInventory(value: unknown): CharacterInventoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object" && typeof item.id === "string");
    })
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      return {
        id,
        name: typeof item.name === "string" ? item.name : id,
        codexEntryId:
          typeof item.codexEntryId === "string"
            ? item.codexEntryId
            : typeof item.sourceCodexEntryId === "string"
              ? item.sourceCodexEntryId
              : undefined,
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
        equipped: typeof item.equipped === "boolean" ? item.equipped : false,
        rarity: typeof item.rarity === "string" ? item.rarity : undefined,
        notes:
          typeof item.notes === "string"
            ? item.notes
            : typeof item.description === "string"
              ? item.description
              : undefined,
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        sourceCodexEntryId:
          typeof item.sourceCodexEntryId === "string" ? item.sourceCodexEntryId : undefined,
        metadata:
          item.metadata && typeof item.metadata === "object"
            ? (item.metadata as CharacterInventoryItem["metadata"])
            : undefined
      };
    });
}

function parseWallet(value: unknown): CurrencyWallet {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const custom =
    input.custom && typeof input.custom === "object"
      ? Object.fromEntries(
          Object.entries(input.custom as Record<string, unknown>).filter((entry): entry is [string, number] => {
            return typeof entry[1] === "number";
          })
        )
      : undefined;

  return {
    gp: typeof input.gp === "number" ? input.gp : undefined,
    sp: typeof input.sp === "number" ? input.sp : undefined,
    cp: typeof input.cp === "number" ? input.cp : undefined,
    xp: typeof input.xp === "number" ? input.xp : undefined,
    custom
  };
}

function parseRewardHistory(value: unknown): CharacterProfile["rewardHistory"] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.characterId === "string" &&
          typeof item.description === "string" &&
          typeof item.createdAt === "string"
      );
    })
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      characterId: typeof item.characterId === "string" ? item.characterId : "",
      source: typeof item.source === "string" ? item.source : undefined,
      type:
        item.type === "currency" ||
        item.type === "item" ||
        item.type === "xp" ||
        item.type === "codex" ||
        item.type === "manual"
          ? item.type
          : "manual",
      description: typeof item.description === "string" ? item.description : "",
      delta:
        item.delta && typeof item.delta === "object"
          ? (item.delta as Record<string, unknown>)
          : {},
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
    }));
}

function parseProgression(value: unknown): CharacterProgression {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  return {
    level: typeof input.level === "number" ? input.level : undefined,
    xp: typeof input.xp === "number" ? input.xp : undefined,
    milestones: Array.isArray(input.milestones)
      ? input.milestones.filter((milestone): milestone is string => typeof milestone === "string")
      : []
  };
}

function parseConditions(value: unknown): ActiveCondition[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object" && typeof item.id === "string");
    })
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      codexEntryId: typeof item.codexEntryId === "string" ? item.codexEntryId : undefined,
      name: typeof item.name === "string" ? item.name : String(item.id),
      description: typeof item.description === "string" ? item.description : undefined,
      source: typeof item.source === "string" ? item.source : undefined,
      expiresAt:
        typeof item.expiresAt === "string" || item.expiresAt === null ? item.expiresAt : undefined
    }));
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
    ownerUserId: row.owner_user_id ?? undefined,
    ownerLabel: row.owner_label ?? undefined,
    characterKind: row.character_kind ?? "player_character",
    name: row.name,
    subtitle: row.subtitle ?? undefined,
    concept: row.concept ?? undefined,
    portraitImage: row.portrait_image ?? undefined,
    defaultSystem,
    sheets,
    inventory: parseInventory(row.inventory),
    wallet: parseWallet(row.wallet),
    rewardHistory: parseRewardHistory(row.reward_history),
    progression: parseProgression(row.progression),
    conditions: parseConditions(row.conditions),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function characterProfileToInsert(profile: CharacterProfile) {
  return {
    id: profile.id,
    owner_user_id: profile.ownerUserId ?? undefined,
    owner_label: profile.ownerLabel ?? null,
    character_kind: profile.characterKind ?? "player_character",
    name: profile.name,
    subtitle: profile.subtitle ?? null,
    concept: profile.concept ?? null,
    portrait_image: profile.portraitImage ?? null,
    default_system: profile.defaultSystem,
    sheets: profile.sheets,
    inventory: profile.inventory ?? [],
    wallet: profile.wallet ?? {},
    reward_history: profile.rewardHistory ?? [],
    progression: profile.progression ?? {},
    conditions: profile.conditions ?? []
  };
}

export function characterProfileToUpdate(profile: CharacterProfile) {
  return {
    owner_user_id: profile.ownerUserId ?? undefined,
    owner_label: profile.ownerLabel ?? null,
    character_kind: profile.characterKind ?? "player_character",
    name: profile.name,
    subtitle: profile.subtitle ?? null,
    concept: profile.concept ?? null,
    portrait_image: profile.portraitImage ?? null,
    default_system: profile.defaultSystem,
    sheets: profile.sheets,
    inventory: profile.inventory ?? [],
    wallet: profile.wallet ?? {},
    reward_history: profile.rewardHistory ?? [],
    progression: profile.progression ?? {},
    conditions: profile.conditions ?? []
  };
}
