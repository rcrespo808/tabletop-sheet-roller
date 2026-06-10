import { CONTENT_GENERATOR_NAME, WRITABLE_TABLES, type WritableTable } from "./constants";
import { hashRowJsonTargets } from "./json";
import { validateDbRow } from "./schemas";
import type { ContentPack, DbRow, JsonRecord, NormalizedRow } from "./types";

const CAMEL_TO_SNAKE: Record<string, string> = {
  actionTemplate: "action_template",
  campaignId: "campaign_id",
  codexEntryIds: "codex_entry_ids",
  createdAt: "created_at",
  createdBy: "created_by",
  defaultSystem: "default_system",
  gameTableId: "game_table_id",
  gmNotes: "gm_notes",
  itemName: "item_name",
  ownerLabel: "owner_label",
  ownerUserId: "owner_user_id",
  portraitImage: "portrait_image",
  rewardHistory: "reward_history",
  rewardPayloads: "reward_payloads",
  rulesText: "rules_text",
  selectedPlayerIds: "selected_player_ids",
  sourceLabel: "source_label",
  storeId: "store_id",
  turnIndex: "turn_index",
  userId: "user_id"
};

function toDbKeys(row: DbRow): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    output[CAMEL_TO_SNAKE[key] ?? key] = value;
  }
  return output;
}

function withDefaults(table: WritableTable, row: Record<string, unknown>, pack: ContentPack) {
  const defaults = pack.defaults ?? {};

  if (table === "codex_entries") {
    row.campaign_id ??= defaults.campaignId ?? defaults.gameTableId ?? null;
    row.tags ??= pack.theme.tags ?? [];
    row.visibility ??= "campaign";
    row.system ??= pack.theme.system ?? "generic";
    row.metadata = mergeMetadata(row.metadata, pack);
    row.grants ??= [];
    row.prerequisites ??= [];
  }

  if (table === "loot_tables") {
    row.campaign_id ??= defaults.campaignId ?? defaults.gameTableId;
    row.visibility ??= "gm_only";
    row.entries ??= [];
  }

  if (table === "handouts") {
    row.game_table_id ??= defaults.gameTableId ?? defaults.campaignId;
    row.visibility ??= "gm_only";
    row.selected_player_ids ??= [];
    row.tags ??= pack.theme.tags ?? [];
    row.reward_payloads ??= [];
    row.codex_entry_ids ??= [];
  }

  if (table === "markets") {
    row.game_table_id ??= defaults.gameTableId ?? defaults.campaignId;
    row.status ??= "draft";
    row.stores ??= [];
    row.metadata = mergeMetadata(row.metadata, pack);
  }

  if (table === "character_profiles") {
    row.default_system ??= pack.theme.system === "nwod" ? "nwod" : "dnd5e";
    row.game_table_id ??= defaults.gameTableId ?? defaults.campaignId ?? null;
    row.sheets ??= {};
    row.inventory ??= [];
    row.wallet ??= {};
    row.reward_history ??= [];
    row.progression ??= {};
    row.conditions ??= [];
  }

  if (table === "combat_encounters") {
    row.game_table_id ??= defaults.gameTableId ?? defaults.campaignId ?? null;
    row.system ??= pack.theme.system === "nwod" ? "nwod" : "dnd5e";
    row.round ??= 1;
    row.turn_index ??= 0;
    row.status ??= "draft";
    row.combatants = normalizeCombatants(row.combatants, pack);
  }

  if (table === "roll_logs") {
    row.room_slug ??= defaults.roomSlug ?? "default";
    row.kind ??= "system";
    row.details = mergeNestedMetadata(row.details, pack);
  }

  if (table === "market_transactions") {
    row.quantity ??= 1;
    row.price ??= {};
    row.item = mergeNestedMetadata(row.item, pack);
  }

  if (defaults.createdBy && ["codex_entries", "loot_tables", "handouts", "markets"].includes(table)) {
    row.created_by ??= defaults.createdBy;
  }

  return row;
}

function mergeMetadata(value: unknown, pack: ContentPack): JsonRecord {
  const base =
    value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  return {
    ...base,
    generatedBy: CONTENT_GENERATOR_NAME,
    contentPackId: pack.contentPackId,
    runId: pack.runId,
    theme: pack.theme as unknown as JsonRecord,
    generatedAt: pack.generatedAt
  };
}

function mergeNestedMetadata(value: unknown, pack: ContentPack): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value ?? { metadata: mergeMetadata(undefined, pack) };
  }

  const objectValue = value as Record<string, unknown>;
  return {
    ...objectValue,
    metadata: mergeMetadata(objectValue.metadata, pack)
  };
}

function normalizeCombatants(value: unknown, pack: ContentPack): unknown {
  if (Array.isArray(value)) {
    return {
      combatants: value,
      pendingAction: null,
      actionHistory: [],
      metadata: mergeMetadata(undefined, pack)
    };
  }

  if (!value || typeof value !== "object") {
    return {
      combatants: [],
      pendingAction: null,
      actionHistory: [],
      metadata: mergeMetadata(undefined, pack)
    };
  }

  const objectValue = value as Record<string, unknown>;
  return {
    combatants: Array.isArray(objectValue.combatants) ? objectValue.combatants : [],
    pendingAction: objectValue.pendingAction ?? null,
    actionHistory: Array.isArray(objectValue.actionHistory) ? objectValue.actionHistory : [],
    metadata: mergeMetadata(objectValue.metadata, pack)
  };
}

export function normalizeContentPackRows(pack: ContentPack): {
  rows: NormalizedRow[];
  errors: string[];
  warnings: string[];
} {
  const normalized: NormalizedRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const table of WRITABLE_TABLES) {
    for (const rawRow of pack.rows[table] ?? []) {
      const row = withDefaults(table, toDbKeys(rawRow), pack);
      const id = row.id;
      if (typeof id !== "string") {
        errors.push(`${table} row is missing id.`);
        continue;
      }

      for (const error of validateDbRow(table, row)) {
        errors.push(error);
      }

      const expectedHash =
        typeof rawRow._expectedHash === "string"
          ? rawRow._expectedHash
          : typeof row.expected_hash === "string"
            ? row.expected_hash
            : undefined;
      delete row._expectedHash;
      delete row.expected_hash;

      normalized.push({
        table,
        id,
        expectedHash,
        row
      });

      if (!expectedHash && ["character_profiles", "combat_encounters"].includes(table)) {
        warnings.push(`${table}.${id} is stateful and has no _expectedHash; inserts are safe, updates will fail preview.`);
      }
    }
  }

  return { rows: normalized, errors, warnings };
}

export function getRowHash(row: NormalizedRow): string {
  return hashRowJsonTargets(row.table, row.row);
}
