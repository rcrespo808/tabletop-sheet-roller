import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client as PgClient, type QueryResult } from "pg";
import {
  JSON_TARGETS,
  TABLE_SELECT_COLUMNS,
  WRITABLE_TABLES,
  type WritableTable
} from "./constants";
import {
  assertDatabaseConfigured,
  assertSupabaseConfigured,
  getSupabaseHost,
  loadDicerContentConfig,
  type DicerContentConfig
} from "./config";

export type SupabaseAnyClient = SupabaseClient | any;

export function createServiceClient(config = loadDicerContentConfig()): SupabaseClient {
  assertSupabaseConfigured(config);
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function executePostgresSql(
  sql: string,
  config = loadDicerContentConfig(),
  options: { adminWrite?: boolean } = {}
) {
  assertDatabaseConfigured(config);
  const client = new PgClient({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes("sslmode=disable")
      ? undefined
      : {
          rejectUnauthorized: false
        }
  });

  await client.connect();
  try {
    if (options.adminWrite) {
      await client.query("begin");
      await client.query("select set_config('dicer.admin_write', 'on', true)");
      const result = await client.query(sql);
      await client.query("commit");
      return normalizePgResult(result);
    }

    return normalizePgResult(await client.query(sql));
  } catch (error) {
    if (options.adminWrite) {
      try {
        await client.query("rollback");
      } catch {
        // Ignore rollback cleanup errors and surface the original query failure.
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

function normalizePgResult(result: QueryResult | QueryResult[]) {
  const results = Array.isArray(result) ? result : [result];
  return results.map((item) => ({
    command: item.command,
    rowCount: item.rowCount ?? 0,
    fields: item.fields.map((field) => field.name),
    rows: item.rows
  }));
}

export async function auditSchema(config = loadDicerContentConfig(), client?: SupabaseAnyClient) {
  const configured = Boolean(config.supabaseUrl && config.serviceRoleKey);
  const result = {
    configured,
    databaseConfigured: Boolean(config.databaseUrl),
    projectRef: config.projectRef,
    supabaseHost: getSupabaseHost(config),
    credentialKind: config.serviceRoleKeyKind ?? "missing",
    writableJsonTargets: JSON_TARGETS,
    tables: [] as Array<{
      table: WritableTable;
      jsonColumns: readonly string[];
      rowCount?: number;
      samples?: unknown[];
      error?: string;
    }>,
    rlsPolicyAudit: {
      status: "requires_supabase_mcp_or_sql_connection",
      reason:
        "This local MCP uses Supabase Data API via service-role credentials; pg_policies is not exposed through PostgREST. Use the read-only Supabase MCP registration for live policy/advisor checks."
    },
    warnings: [] as string[]
  };

  if (!configured) {
    result.warnings.push(
      "Supabase URL or service-role key is not configured; returning local schema targets only."
    );
    return result;
  }

  const supabase = client ?? createServiceClient(config);
  for (const table of WRITABLE_TABLES) {
    try {
      const countQuery = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });
      const sampleQuery = await supabase.from(table).select(TABLE_SELECT_COLUMNS[table]).limit(3);

      result.tables.push({
        table,
        jsonColumns: JSON_TARGETS[table],
        rowCount: countQuery.count ?? undefined,
        samples: sampleQuery.data ?? [],
        error: countQuery.error?.message ?? sampleQuery.error?.message
      });
    } catch (error) {
      result.tables.push({
        table,
        jsonColumns: JSON_TARGETS[table],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return result;
}

export async function listContentContext(
  input: { gameTableId?: string; campaignId?: string; roomSlug?: string; limit?: number },
  config = loadDicerContentConfig(),
  client?: SupabaseAnyClient
) {
  const supabase = client ?? createServiceClient(config);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const gameTableId = input.gameTableId ?? input.campaignId;
  const campaignId = input.campaignId ?? input.gameTableId;

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  async function fetchTable(table: string, select: string, filters: Record<string, string | undefined> = {}) {
    try {
      let query = supabase.from(table).select(select).limit(limit);
      for (const [column, value] of Object.entries(filters)) {
        if (value) query = query.eq(column, value);
      }
      const { data, error } = await query;
      if (error) errors[table] = error.message;
      results[table] = data ?? [];
    } catch (error) {
      errors[table] = error instanceof Error ? error.message : String(error);
      results[table] = [];
    }
  }

  await Promise.all([
    fetchTable("game_tables", "*", gameTableId ? { id: gameTableId } : {}),
    fetchTable("codex_entries", TABLE_SELECT_COLUMNS.codex_entries, campaignId ? { campaign_id: campaignId } : {}),
    fetchTable("loot_tables", TABLE_SELECT_COLUMNS.loot_tables, campaignId ? { campaign_id: campaignId } : {}),
    fetchTable("handouts", TABLE_SELECT_COLUMNS.handouts, gameTableId ? { game_table_id: gameTableId } : {}),
    fetchTable("markets", TABLE_SELECT_COLUMNS.markets, gameTableId ? { game_table_id: gameTableId } : {}),
    fetchTable(
      "character_profiles",
      TABLE_SELECT_COLUMNS.character_profiles,
      gameTableId ? { game_table_id: gameTableId } : {}
    ),
    fetchTable(
      "combat_encounters",
      TABLE_SELECT_COLUMNS.combat_encounters,
      gameTableId ? { game_table_id: gameTableId } : {}
    ),
    fetchTable("roll_logs", TABLE_SELECT_COLUMNS.roll_logs, input.roomSlug ? { room_slug: input.roomSlug } : {}),
    fetchTable("market_transactions", TABLE_SELECT_COLUMNS.market_transactions)
  ]);

  return {
    projectRef: config.projectRef,
    filters: { gameTableId, campaignId, roomSlug: input.roomSlug, limit },
    results,
    errors
  };
}

export async function fetchRowById(
  client: SupabaseAnyClient,
  table: WritableTable,
  id: string,
  select = TABLE_SELECT_COLUMNS[table]
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.from(table).select(select).eq("id", id).maybeSingle();
  if (error) throw new Error(`${table}.${id} fetch failed: ${error.message}`);
  return data ?? null;
}

export async function upsertRows(
  client: SupabaseAnyClient,
  table: WritableTable,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const { data, error } = await client.from(table).upsert(rows, { onConflict: "id" }).select("*");
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return data ?? [];
}
