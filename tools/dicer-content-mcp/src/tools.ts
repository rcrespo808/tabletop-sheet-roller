import { groupBy } from "./utils";
import { assertProjectConfirmation, loadDicerContentConfig, type DicerContentConfig } from "./config";
import { JSON_TARGETS, TABLE_SELECT_COLUMNS, WRITABLE_TABLES, type WritableTable } from "./constants";
import {
  applyJsonPatchDocument,
  assertJsonColumn,
  compareJson,
  hashJson,
  hashRowJsonTargets,
  pickJsonTargets,
  requiresExpectedHash
} from "./json";
import { normalizeContentPackRows } from "./normalizers";
import { writeRunLog } from "./runLog";
import { validateContentPack } from "./schemas";
import {
  auditSchema,
  createServiceClient,
  executePostgresSql,
  fetchRowById,
  listContentContext,
  upsertRows,
  type SupabaseAnyClient
} from "./supabase";
import type { ApplyResult, ContentPack, JsonPatchOperation, JsonPatchRequest, JsonValue, PreviewResult } from "./types";
import { generateContentPack, type GenerateContentPackInput, type ResponsesLikeClient } from "./openai";

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CHARACTER_JSON_COLUMNS = [
  "sheets",
  "inventory",
  "wallet",
  "reward_history",
  "rewardHistory",
  "progression",
  "conditions"
] as const;

type TableFilter = {
  column: string;
  value: JsonValue;
};

type ReadTableInput = {
  table: string;
  select?: string;
  filters?: TableFilter[];
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
};

type WriteTableRowsInput = {
  table: string;
  operation: "insert" | "upsert" | "update" | "delete";
  rows?: Record<string, unknown>[];
  values?: Record<string, unknown>;
  filters?: TableFilter[];
  confirmProjectRef?: string;
  dryRun?: boolean;
};

type ExecuteSqlInput = {
  sql: string;
  readOnly?: boolean;
  adminWrite?: boolean;
  confirmProjectRef?: string;
  dryRun?: boolean;
};

type UpdateCharacterProfileInput = {
  id: string;
  confirmProjectRef?: string;
  dryRun?: boolean;
  scalars?: Partial<{
    ownerUserId: string | null;
    ownerLabel: string | null;
    characterKind: string | null;
    gameTableId: string | null;
    name: string;
    subtitle: string | null;
    concept: string | null;
    portraitImage: string | null;
    defaultSystem: string;
  }>;
  json?: Partial<Record<(typeof CHARACTER_JSON_COLUMNS)[number], JsonValue>>;
  patches?: Array<{
    column: (typeof CHARACTER_JSON_COLUMNS)[number];
    operations: JsonPatchOperation[];
  }>;
};

export async function handleAuditSchema(input: unknown, config = loadDicerContentConfig(), client?: SupabaseAnyClient) {
  return auditSchema(config, client);
}

export async function handleListContentContext(
  input: { gameTableId?: string; campaignId?: string; roomSlug?: string; limit?: number },
  config = loadDicerContentConfig(),
  client?: SupabaseAnyClient
) {
  return listContentContext(input, config, client);
}

export async function handleReadTable(input: ReadTableInput, config = loadDicerContentConfig(), client?: SupabaseAnyClient) {
  assertSafeIdentifier(input.table, "table");
  const supabase = client ?? createServiceClient(config);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 1000);
  let query = supabase.from(input.table).select(input.select ?? "*").limit(limit);

  for (const filter of input.filters ?? []) {
    assertSafeIdentifier(filter.column, "filter column");
    query = query.eq(filter.column, filter.value);
  }

  if (input.orderBy) {
    assertSafeIdentifier(input.orderBy, "orderBy");
    query = query.order(input.orderBy, { ascending: input.ascending ?? true });
  }

  const { data, error } = await query;
  if (error) throw new Error(`${input.table} read failed: ${error.message}`);
  return {
    ok: true,
    projectRef: config.projectRef,
    table: input.table,
    count: Array.isArray(data) ? data.length : 0,
    rows: data ?? []
  };
}

export async function handleWriteTableRows(
  input: WriteTableRowsInput,
  config = loadDicerContentConfig(),
  client?: SupabaseAnyClient
) {
  assertProjectConfirmation(input.confirmProjectRef, config.projectRef);
  assertSafeIdentifier(input.table, "table");

  const planned = {
    table: input.table,
    operation: input.operation,
    rowCount: input.rows?.length ?? (input.values ? 1 : 0),
    filters: input.filters ?? []
  };
  if (input.dryRun) {
    return { ok: true, projectRef: config.projectRef, dryRun: true, planned, rows: [] };
  }

  const supabase = client ?? createServiceClient(config);
  let query: any;

  if (input.operation === "insert") {
    const rows = assertRows(input.rows, "insert");
    query = supabase.from(input.table).insert(rows).select("*");
  } else if (input.operation === "upsert") {
    const rows = assertRows(input.rows, "upsert");
    query = supabase.from(input.table).upsert(rows, { onConflict: "id" }).select("*");
  } else if (input.operation === "update") {
    if (!input.values || Object.keys(input.values).length === 0) {
      throw new Error("update requires values.");
    }
    query = applyFilters(supabase.from(input.table).update(input.values), input.filters).select("*");
  } else {
    query = applyFilters(supabase.from(input.table).delete(), input.filters).select("*");
  }

  const { data, error } = await query;
  if (error) throw new Error(`${input.table} ${input.operation} failed: ${error.message}`);
  return {
    ok: true,
    projectRef: config.projectRef,
    dryRun: false,
    planned,
    count: Array.isArray(data) ? data.length : 0,
    rows: data ?? []
  };
}

export async function handleExecuteSql(input: ExecuteSqlInput, config = loadDicerContentConfig()) {
  const readOnly = input.readOnly ?? false;
  if (!readOnly) {
    assertProjectConfirmation(input.confirmProjectRef, config.projectRef);
  }
  if (readOnly && !looksReadOnlySql(input.sql)) {
    throw new Error("readOnly SQL must start with SELECT, WITH, SHOW, or EXPLAIN.");
  }
  if (input.dryRun) {
    return {
      ok: true,
      projectRef: config.projectRef,
      dryRun: true,
      readOnly,
      adminWrite: Boolean(input.adminWrite),
      sql: input.sql
    };
  }

  const results = await executePostgresSql(input.sql, config, { adminWrite: input.adminWrite && !readOnly });
  return {
    ok: true,
    projectRef: config.projectRef,
    dryRun: false,
    readOnly,
    adminWrite: Boolean(input.adminWrite && !readOnly),
    results
  };
}

export async function handleUpdateCharacterProfile(
  input: UpdateCharacterProfileInput,
  config = loadDicerContentConfig(),
  client?: SupabaseAnyClient
) {
  assertProjectConfirmation(input.confirmProjectRef, config.projectRef);
  const supabase = client ?? createServiceClient(config);
  const current = await fetchRowById(supabase, "character_profiles", input.id);
  if (!current) throw new Error(`character_profiles.${input.id} does not exist.`);

  const update: Record<string, unknown> = {};
  const scalarColumns = toCharacterScalarColumns(input.scalars ?? {});
  Object.assign(update, scalarColumns);

  const jsonDiffs: Array<{
    column: string;
    previousHash: string;
    nextHash: string;
    diff: JsonPatchOperation[];
  }> = [];

  const replacements = toCharacterJsonColumns(input.json ?? {});
  for (const [column, value] of Object.entries(replacements)) {
    update[column] = value;
  }

  for (const patch of input.patches ?? []) {
    const column = normalizeCharacterJsonColumn(patch.column);
    assertJsonColumn("character_profiles", column);
    const baseValue = (update[column] ?? current[column] ?? null) as JsonValue;
    update[column] = applyJsonPatchDocument(baseValue, patch.operations);
  }

  for (const column of JSON_TARGETS.character_profiles) {
    if (!(column in update)) continue;
    const previousValue = (current[column] ?? null) as JsonValue;
    const nextValue = update[column] as JsonValue;
    jsonDiffs.push({
      column,
      previousHash: hashJson(previousValue),
      nextHash: hashJson(nextValue),
      diff: compareJson(previousValue, nextValue)
    });
  }

  if (Object.keys(update).length === 0) {
    throw new Error("update_character_profile requires at least one scalar, json, or patch update.");
  }

  if (input.dryRun) {
    return {
      ok: true,
      projectRef: config.projectRef,
      dryRun: true,
      id: input.id,
      writeColumns: Object.keys(update).sort(),
      jsonDiffs
    };
  }

  const { data, error } = await supabase
    .from("character_profiles")
    .update(update)
    .eq("id", input.id)
    .select(TABLE_SELECT_COLUMNS.character_profiles)
    .single();
  if (error) throw new Error(`character_profiles.${input.id} update failed: ${error.message}`);

  return {
    ok: true,
    projectRef: config.projectRef,
    dryRun: false,
    id: input.id,
    writeColumns: Object.keys(update).sort(),
    jsonDiffs,
    row: data
  };
}

export async function handleGenerateContentPack(
  input: GenerateContentPackInput,
  config = loadDicerContentConfig(),
  openaiClient?: ResponsesLikeClient
) {
  const pack = await generateContentPack(input, config, openaiClient);
  const runLogPath = await writeRunLog(config, pack.runId, {
    kind: "generate_content_pack",
    generatedAt: new Date().toISOString(),
    pack
  });
  return { ...pack, runLogPath };
}

export async function previewContentPack(
  rawPack: unknown,
  input: { checkCloud?: boolean } = {},
  config: DicerContentConfig = loadDicerContentConfig(),
  client?: SupabaseAnyClient
): Promise<PreviewResult> {
  const pack = validateContentPack(rawPack);
  const normalized = normalizeContentPackRows(pack);
  const checkCloud = input.checkCloud ?? true;
  const supabase = checkCloud && config.supabaseUrl && config.serviceRoleKey ? client ?? createServiceClient(config) : null;
  const errors = [...normalized.errors];
  const warnings = [...normalized.warnings];
  const rows: PreviewResult["rows"] = [];
  const duplicateRisks = findDuplicateRisks(pack);
  const referenceWarnings = findReferenceWarnings(pack);

  for (const item of normalized.rows) {
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    let existing: Record<string, unknown> | null = null;
    let action: "insert" | "update" | "unknown" = "unknown";
    let currentHash: string | undefined;
    let hashMatches: boolean | undefined;

    if (supabase) {
      existing = await fetchRowById(supabase, item.table, item.id);
      action = existing ? "update" : "insert";
      if (existing) {
        currentHash = hashRowJsonTargets(item.table, existing);
        hashMatches = item.expectedHash ? item.expectedHash === currentHash : undefined;
        if (item.expectedHash && !hashMatches) {
          rowErrors.push(
            `${item.table}.${item.id} expectedHash mismatch: expected ${item.expectedHash}, current ${currentHash}.`
          );
        }
        if (!item.expectedHash && requiresExpectedHash(item.table)) {
          rowErrors.push(`${item.table}.${item.id} is stateful and requires _expectedHash before update.`);
        }
      }
    } else if (checkCloud) {
      rowWarnings.push("Cloud check skipped because Supabase service credentials are not configured.");
    }

    const nextHash = hashRowJsonTargets(item.table, item.row);
    const before = existing ? pickJsonTargets(item.table, existing) : null;
    const after = pickJsonTargets(item.table, item.row);
    const diff = existing
      ? compareJson(before, after)
      : [{ op: "add" as const, path: "/", value: after as any }];

    rows.push({
      table: item.table,
      id: item.id,
      action,
      expectedHash: item.expectedHash,
      currentHash,
      nextHash,
      hashMatches,
      writeColumns: Object.keys(item.row).sort(),
      diff,
      warnings: rowWarnings,
      errors: rowErrors
    });
    errors.push(...rowErrors);
  }

  const patchPreviews = await previewPatches(pack.patches, supabase);
  for (const patch of patchPreviews) {
    errors.push(...patch.errors);
  }

  return {
    ok: errors.length === 0,
    projectRef: config.projectRef,
    contentPackId: pack.contentPackId,
    runId: pack.runId,
    checkCloud,
    rows,
    patches: patchPreviews,
    duplicateRisks,
    referenceWarnings,
    errors,
    warnings
  };
}

export async function applyContentPack(
  rawPack: unknown,
  input: { confirmProjectRef?: string },
  config: DicerContentConfig = loadDicerContentConfig(),
  client?: SupabaseAnyClient
): Promise<ApplyResult> {
  assertProjectConfirmation(input.confirmProjectRef, config.projectRef);
  const pack = validateContentPack(rawPack);
  const supabase = client ?? createServiceClient(config);
  const preview = await previewContentPack(pack, { checkCloud: true }, config, supabase);
  if (!preview.ok) {
    throw new Error(`Content pack preview failed: ${preview.errors.join("; ")}`);
  }

  const normalized = normalizeContentPackRows(pack);
  if (normalized.errors.length) {
    throw new Error(`Content pack validation failed: ${normalized.errors.join("; ")}`);
  }

  const written: ApplyResult["written"] = [];
  const rowsByTable = groupBy(normalized.rows, (row) => row.table);

  for (const table of WRITABLE_TABLES) {
    const tableRows = rowsByTable[table] ?? [];
    if (!tableRows.length) continue;

    const result = await upsertRows(
      supabase,
      table,
      tableRows.map((row) => row.row)
    );
    written.push({
      table,
      count: result.length,
      ids: result.map((row) => String(row.id))
    });

    if (table === "handouts") {
      await upsertHandoutGmNotes(supabase, tableRows.map((row) => row.row));
    }
  }

  const patchResult = await patchJsonRows(pack.patches, { confirmProjectRef: input.confirmProjectRef }, config, supabase);
  const applyResult: ApplyResult = {
    ok: true,
    projectRef: config.projectRef,
    contentPackId: pack.contentPackId,
    runId: pack.runId,
    written,
    patches: patchResult.patches
  };

  applyResult.runLogPath = await writeRunLog(config, pack.runId, {
    kind: "apply_content_pack",
    appliedAt: new Date().toISOString(),
    preview,
    result: applyResult
  });

  return applyResult;
}

export async function patchJsonRows(
  patches: JsonPatchRequest[],
  input: { confirmProjectRef?: string; dryRun?: boolean },
  config: DicerContentConfig = loadDicerContentConfig(),
  client?: SupabaseAnyClient
) {
  assertProjectConfirmation(input.confirmProjectRef, config.projectRef);
  const supabase = client ?? createServiceClient(config);
  const results: Array<{
    table: WritableTable;
    id: string;
    column: string;
    previousHash: string;
    nextHash: string;
  }> = [];

  for (const patch of patches) {
    assertJsonColumn(patch.table, patch.column);
    const row = await fetchRowById(supabase, patch.table, patch.id, `id,${patch.column}`);
    if (!row) throw new Error(`${patch.table}.${patch.id} does not exist.`);

    const currentValue = (row[patch.column] ?? null) as any;
    const currentHash = hashJson(currentValue);
    if (requiresExpectedHash(patch.table) && !patch.expectedHash) {
      throw new Error(`${patch.table}.${patch.id}.${patch.column} requires expectedHash.`);
    }
    if (patch.expectedHash && patch.expectedHash !== currentHash) {
      throw new Error(
        `${patch.table}.${patch.id}.${patch.column} expectedHash mismatch: expected ${patch.expectedHash}, current ${currentHash}.`
      );
    }

    const nextValue = applyJsonPatchDocument(currentValue, patch.operations);
    const nextHash = hashJson(nextValue);

    if (!input.dryRun) {
      const { error } = await supabase
        .from(patch.table)
        .update({ [patch.column]: nextValue })
        .eq("id", patch.id)
        .select("id")
        .single();
      if (error) throw new Error(`${patch.table}.${patch.id}.${patch.column} patch failed: ${error.message}`);
    }

    results.push({
      table: patch.table,
      id: patch.id,
      column: patch.column,
      previousHash: currentHash,
      nextHash
    });
  }

  return { ok: true, projectRef: config.projectRef, dryRun: Boolean(input.dryRun), patches: results };
}

function assertSafeIdentifier(value: string, label: string) {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(`${label} must be a safe SQL identifier.`);
  }
}

function assertRows(rows: Record<string, unknown>[] | undefined, operation: string) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${operation} requires at least one row.`);
  }
  return rows;
}

function applyFilters(query: any, filters: TableFilter[] | undefined) {
  if (!filters?.length) {
    throw new Error("update/delete operations require at least one eq filter.");
  }
  let next = query;
  for (const filter of filters) {
    assertSafeIdentifier(filter.column, "filter column");
    next = next.eq(filter.column, filter.value);
  }
  return next;
}

function looksReadOnlySql(sql: string) {
  const normalized = sql
    .trim()
    .replace(/^\/\*[\s\S]*?\*\//, "")
    .replace(/^--.*$/m, "")
    .trim();
  return /^(select|with|show|explain)\b/i.test(normalized);
}

function toCharacterScalarColumns(input: NonNullable<UpdateCharacterProfileInput["scalars"]>) {
  const map: Record<string, string> = {
    ownerUserId: "owner_user_id",
    ownerLabel: "owner_label",
    characterKind: "character_kind",
    gameTableId: "game_table_id",
    name: "name",
    subtitle: "subtitle",
    concept: "concept",
    portraitImage: "portrait_image",
    defaultSystem: "default_system"
  };
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [map[key] ?? key, value])
  );
}

function normalizeCharacterJsonColumn(column: string) {
  if (column === "rewardHistory") return "reward_history";
  return column;
}

function toCharacterJsonColumns(input: NonNullable<UpdateCharacterProfileInput["json"]>) {
  const output: Record<string, JsonValue> = {};
  for (const [rawColumn, value] of Object.entries(input)) {
    const column = normalizeCharacterJsonColumn(rawColumn);
    assertJsonColumn("character_profiles", column);
    output[column] = value as JsonValue;
  }
  return output;
}

async function previewPatches(patches: JsonPatchRequest[], client: SupabaseAnyClient | null): Promise<PreviewResult["patches"]> {
  const previews: PreviewResult["patches"] = [];
  for (const patch of patches) {
    const errors: string[] = [];
    let currentHash: string | undefined;
    let nextHash: string | undefined;
    try {
      assertJsonColumn(patch.table, patch.column);
      if (requiresExpectedHash(patch.table) && !patch.expectedHash) {
        errors.push(`${patch.table}.${patch.id}.${patch.column} requires expectedHash.`);
      }
      if (client) {
        const row = await fetchRowById(client, patch.table, patch.id, `id,${patch.column}`);
        if (!row) {
          errors.push(`${patch.table}.${patch.id} does not exist.`);
        } else {
          const currentValue = (row[patch.column] ?? null) as any;
          currentHash = hashJson(currentValue);
          if (patch.expectedHash && patch.expectedHash !== currentHash) {
            errors.push(
              `${patch.table}.${patch.id}.${patch.column} expectedHash mismatch: expected ${patch.expectedHash}, current ${currentHash}.`
            );
          }
          nextHash = hashJson(applyJsonPatchDocument(currentValue, patch.operations));
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    previews.push({
      table: patch.table,
      id: patch.id,
      column: patch.column,
      expectedHash: patch.expectedHash,
      currentHash,
      nextHash,
      dryRun: true,
      errors
    });
  }
  return previews;
}

function findDuplicateRisks(pack: ContentPack): string[] {
  const risks: string[] = [];
  for (const table of WRITABLE_TABLES) {
    const ids = new Map<string, number>();
    const labels = new Map<string, number>();
    for (const row of pack.rows[table] ?? []) {
      if (typeof row.id === "string") ids.set(row.id, (ids.get(row.id) ?? 0) + 1);
      const label = typeof row.name === "string" ? row.name : typeof row.title === "string" ? row.title : undefined;
      if (label) labels.set(label.toLowerCase(), (labels.get(label.toLowerCase()) ?? 0) + 1);
    }
    for (const [id, count] of ids) {
      if (count > 1) risks.push(`${table} includes duplicate id ${id}.`);
    }
    for (const [label, count] of labels) {
      if (count > 1) risks.push(`${table} includes duplicate label/name ${label}.`);
    }
  }
  return risks;
}

function findReferenceWarnings(pack: ContentPack): string[] {
  const warnings: string[] = [];
  const codexIds = new Set((pack.rows.codex_entries ?? []).map((row) => row.id).filter(Boolean));
  const marketIds = new Set((pack.rows.markets ?? []).map((row) => row.id).filter(Boolean));

  for (const handout of pack.rows.handouts ?? []) {
    const ids = (handout.codex_entry_ids ?? handout.codexEntryIds) as unknown;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === "string" && !codexIds.has(id)) {
          warnings.push(`handouts.${String(handout.id)} references codex entry ${id} outside this pack.`);
        }
      }
    }
  }

  for (const transaction of pack.rows.market_transactions ?? []) {
    const marketId = transaction.market_id ?? transaction.marketId;
    if (typeof marketId === "string" && !marketIds.has(marketId)) {
      warnings.push(`market_transactions.${String(transaction.id)} references market ${marketId} outside this pack.`);
    }
  }

  return warnings;
}

async function upsertHandoutGmNotes(client: SupabaseAnyClient, rows: Record<string, unknown>[]) {
  const notes = rows
    .filter((row) => typeof row.gm_notes === "string" && typeof row.id === "string")
    .map((row) => ({ handout_id: row.id, gm_notes: row.gm_notes }));
  if (!notes.length) return;
  const { error } = await client.from("handout_gm_notes").upsert(notes, { onConflict: "handout_id" }).select("*");
  if (error) throw new Error(`handout_gm_notes upsert failed: ${error.message}`);
}
