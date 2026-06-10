import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  JSON_TARGETS,
  TABLE_REQUIRED_COLUMNS,
  UUID_TABLES,
  WRITABLE_TABLES,
  type WritableTable
} from "./constants";
import { createRunId } from "./json";
import type { ContentPack, DbRow, JsonPatchRequest, JsonValue } from "./types";

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

export const jsonRecordSchema = z.record(z.string(), jsonValueSchema);

export const writableTableSchema = z.enum(WRITABLE_TABLES);

const dbRowSchema = z.object({ id: z.string().min(1).optional(), _expectedHash: z.string().optional() }).passthrough();

const tableRowsShape = Object.fromEntries(
  WRITABLE_TABLES.map((table) => [table, z.array(dbRowSchema).optional()])
) as Record<WritableTable, z.ZodOptional<z.ZodArray<typeof dbRowSchema>>>;

export const jsonPatchOperationSchema = z
  .object({
    op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
    path: z.string().startsWith("/"),
    from: z.string().startsWith("/").optional(),
    value: jsonValueSchema.optional()
  })
  .superRefine((operation, context) => {
    if ((operation.op === "move" || operation.op === "copy") && !operation.from) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: `${operation.op} operations require from.`
      });
    }

    if (
      (operation.op === "add" || operation.op === "replace" || operation.op === "test") &&
      operation.value === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: `${operation.op} operations require value.`
      });
    }
  });

export const jsonPatchRequestSchema = z
  .object({
    table: writableTableSchema,
    id: z.string().min(1),
    column: z.string().min(1),
    expectedHash: z.string().min(8).optional(),
    operations: z.array(jsonPatchOperationSchema).min(1)
  })
  .superRefine((request, context) => {
    if (!JSON_TARGETS[request.table].includes(request.column)) {
      context.addIssue({
        code: "custom",
        path: ["column"],
        message: `${request.table}.${request.column} is not a writable JSON target.`
      });
    }
  });

export const contentPackSchema = z.object({
  contentPackId: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  generatedAt: z.string().datetime().optional(),
  theme: z.object({
    name: z.string().min(1),
    system: z.enum(["dnd5e", "nwod", "generic"]).optional(),
    tags: z.array(z.string()).optional(),
    tone: z.string().optional(),
    prompt: z.string().optional()
  }),
  defaults: z
    .object({
      campaignId: z.string().optional(),
      gameTableId: z.string().optional(),
      roomSlug: z.string().optional(),
      createdBy: z.string().optional()
    })
    .optional(),
  rows: z.object(tableRowsShape).partial().default({}),
  patches: z.array(jsonPatchRequestSchema).optional().default([]),
  metadata: jsonRecordSchema.optional()
});

export function validateContentPack(input: unknown): ContentPack {
  const parsed = contentPackSchema.parse(input);

  return {
    contentPackId: parsed.contentPackId || randomUUID(),
    runId: parsed.runId || createRunId(),
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    theme: parsed.theme,
    defaults: parsed.defaults,
    rows: Object.fromEntries(
      WRITABLE_TABLES.map((table) => [table, (parsed.rows[table] ?? []) as DbRow[]])
    ),
    patches: parsed.patches as JsonPatchRequest[],
    metadata: parsed.metadata
  };
}

export function isUuidTable(table: WritableTable): boolean {
  return UUID_TABLES.includes(table as (typeof UUID_TABLES)[number]);
}

export function validateDbRow(table: WritableTable, row: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const rowId = row.id;

  if (typeof rowId !== "string" || !rowId.trim()) {
    errors.push(`${table} row is missing id.`);
  } else if (isUuidTable(table) && !z.string().uuid().safeParse(rowId).success) {
    errors.push(`${table}.${rowId} must use a UUID id.`);
  }

  for (const column of TABLE_REQUIRED_COLUMNS[table]) {
    if (row[column] === undefined || row[column] === null || row[column] === "") {
      errors.push(`${table}.${String(rowId ?? "unknown")} is missing required column ${column}.`);
    }
  }

  for (const column of JSON_TARGETS[table]) {
    if (row[column] !== undefined && !jsonValueSchema.safeParse(row[column]).success) {
      errors.push(`${table}.${String(rowId ?? "unknown")}.${column} is not valid JSON.`);
    }
  }

  if (table === "codex_entries") {
    if (!["dnd5e", "nwod", "generic"].includes(String(row.system))) {
      errors.push(`${table}.${String(rowId)} has invalid system.`);
    }
    if (
      ![
        "ability",
        "spell",
        "power",
        "feat",
        "merit",
        "rite",
        "condition",
        "disease",
        "curse",
        "blessing",
        "item",
        "loot",
        "note"
      ].includes(String(row.type))
    ) {
      errors.push(`${table}.${String(rowId)} has invalid type.`);
    }
    if (!["gm_only", "campaign", "public"].includes(String(row.visibility))) {
      errors.push(`${table}.${String(rowId)} has invalid visibility.`);
    }
  }

  if (table === "character_profiles" && !["dnd5e", "nwod"].includes(String(row.default_system))) {
    errors.push(`${table}.${String(rowId)} has invalid default_system.`);
  }

  if (table === "combat_encounters") {
    if (!["dnd5e", "nwod"].includes(String(row.system))) {
      errors.push(`${table}.${String(rowId)} has invalid combat system.`);
    }
    if (!["draft", "active", "completed"].includes(String(row.status))) {
      errors.push(`${table}.${String(rowId)} has invalid status.`);
    }
  }

  if (table === "roll_logs" && !["roll", "note", "system", "combat"].includes(String(row.kind))) {
    errors.push(`${table}.${String(rowId)} has invalid kind.`);
  }

  if (table === "market_transactions" && !["buy", "sell"].includes(String(row.type))) {
    errors.push(`${table}.${String(rowId)} has invalid transaction type.`);
  }

  return errors;
}
