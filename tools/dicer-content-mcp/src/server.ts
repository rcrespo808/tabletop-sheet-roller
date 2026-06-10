import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadDicerContentConfig } from "./config";
import {
  applyContentPack,
  handleAuditSchema,
  handleExecuteSql,
  handleGenerateContentPack,
  handleListContentContext,
  handleReadTable,
  handleUpdateCharacterProfile,
  handleWriteTableRows,
  patchJsonRows,
  previewContentPack
} from "./tools";
import { contentPackSchema, jsonPatchOperationSchema, jsonPatchRequestSchema, jsonValueSchema } from "./schemas";
import type { JsonPatchRequest } from "./types";

export const DICER_CONTENT_MCP_INSTRUCTIONS =
  "Dicer content MCP has admin read/write access to the configured Dicer Supabase project when service credentials are present. Prefer update_character_profile for character edits because it fetches current state, computes JSON diffs, and writes scalar + JSON columns in one call. Use read_table/write_table_rows for direct table work, execute_sql only when SUPABASE_DB_URL is configured and raw SQL is genuinely needed. Writes require exact confirmProjectRef. If credentials are missing, use dry-run/preview only.";

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ],
    structuredContent: value as Record<string, unknown>
  };
}

export function createDicerContentMcpServer() {
  const server = new McpServer(
    {
      name: "dicer-content",
      version: "0.1.0"
    },
    {
      instructions: DICER_CONTENT_MCP_INSTRUCTIONS
    }
  );

  server.registerTool(
    "audit_schema",
    {
      title: "Audit Dicer Supabase JSON schema",
      description:
        "Read-only audit of configured Supabase cloud access, known writable JSON targets, row counts, and samples.",
      inputSchema: z.object({}).optional()
    },
    async (input) => jsonResult(await handleAuditSchema(input))
  );

  server.registerTool(
    "read_table",
    {
      title: "Read any Supabase Data API table",
      description:
        "Admin-read rows from a Supabase table using service credentials. Use for quick diagnosis before writes.",
      inputSchema: z.object({
        table: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
        select: z.string().optional(),
        filters: z
          .array(
            z.object({
              column: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
              value: jsonValueSchema
            })
          )
          .optional(),
        orderBy: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
        ascending: z.boolean().optional(),
        limit: z.number().int().positive().max(1000).optional()
      })
    },
    async (input) => jsonResult(await handleReadTable(input))
  );

  server.registerTool(
    "write_table_rows",
    {
      title: "Write Supabase Data API table rows",
      description:
        "Admin insert/upsert/update/delete rows through Supabase service credentials. Requires confirmProjectRef.",
      inputSchema: z.object({
        table: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
        operation: z.enum(["insert", "upsert", "update", "delete"]),
        rows: z.array(z.record(z.string(), z.unknown())).optional(),
        values: z.record(z.string(), z.unknown()).optional(),
        filters: z
          .array(
            z.object({
              column: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
              value: jsonValueSchema
            })
          )
          .optional(),
        confirmProjectRef: z.string(),
        dryRun: z.boolean().optional()
      })
    },
    async (input) => jsonResult(await handleWriteTableRows(input))
  );

  server.registerTool(
    "execute_sql",
    {
      title: "Execute direct Postgres SQL",
      description:
        "Full database access through SUPABASE_DB_URL/DATABASE_URL. Use readOnly for SELECT/SHOW/EXPLAIN. Mutations require confirmProjectRef. adminWrite sets dicer.admin_write for reward-state triggers.",
      inputSchema: z.object({
        sql: z.string().min(1),
        readOnly: z.boolean().optional(),
        adminWrite: z.boolean().optional(),
        confirmProjectRef: z.string().optional(),
        dryRun: z.boolean().optional()
      })
    },
    async (input) => jsonResult(await handleExecuteSql(input))
  );

  server.registerTool(
    "list_content_context",
    {
      title: "List Dicer content context",
      description:
        "Read game tables, characters, codex entries, loot tables, handouts, markets, combat summaries, and roll logs for prompt grounding.",
      inputSchema: z.object({
        gameTableId: z.string().optional(),
        campaignId: z.string().optional(),
        roomSlug: z.string().optional(),
        limit: z.number().int().positive().max(100).optional()
      })
    },
    async (input) => jsonResult(await handleListContentContext(input))
  );

  server.registerTool(
    "update_character_profile",
    {
      title: "Update a Dicer character profile in one call",
      description:
        "Preferred character-edit tool. Fetches the current character, applies scalar updates, JSON replacements, and JSON Patch operations without caller-provided hashes, then writes through service credentials.",
      inputSchema: z.object({
        id: z.string().min(1),
        confirmProjectRef: z.string(),
        dryRun: z.boolean().optional(),
        scalars: z
          .object({
            ownerUserId: z.string().nullable().optional(),
            ownerLabel: z.string().nullable().optional(),
            characterKind: z.string().nullable().optional(),
            gameTableId: z.string().nullable().optional(),
            name: z.string().optional(),
            subtitle: z.string().nullable().optional(),
            concept: z.string().nullable().optional(),
            portraitImage: z.string().nullable().optional(),
            defaultSystem: z.string().optional()
          })
          .optional(),
        json: z
          .object({
            sheets: jsonValueSchema.optional(),
            inventory: jsonValueSchema.optional(),
            wallet: jsonValueSchema.optional(),
            reward_history: jsonValueSchema.optional(),
            rewardHistory: jsonValueSchema.optional(),
            progression: jsonValueSchema.optional(),
            conditions: jsonValueSchema.optional()
          })
          .optional(),
        patches: z
          .array(
            z.object({
              column: z.enum([
                "sheets",
                "inventory",
                "wallet",
                "reward_history",
                "rewardHistory",
                "progression",
                "conditions"
              ]),
              operations: z.array(jsonPatchOperationSchema).min(1)
            })
          )
          .optional()
      })
    },
    async (input) => jsonResult(await handleUpdateCharacterProfile(input as Parameters<typeof handleUpdateCharacterProfile>[0]))
  );

  server.registerTool(
    "generate_content_pack",
    {
      title: "Generate Dicer content pack",
      description:
        "Call OpenAI Structured Outputs to generate original themed JSON/JSONB content for Dicer tables.",
      inputSchema: z.object({
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
        contentKinds: z.array(z.string()).optional(),
        rowCounts: z.record(z.string(), z.number().int().nonnegative()).optional(),
        context: z.unknown().optional(),
        model: z.string().optional()
      })
    },
    async (input) => jsonResult(await handleGenerateContentPack(input))
  );

  server.registerTool(
    "preview_content_pack",
    {
      title: "Preview Dicer content pack",
      description:
        "Validate a content pack, check duplicate/reference risks, compare expected hashes, and show the exact JSON write diff without writing.",
      inputSchema: z.object({
        contentPack: contentPackSchema,
        checkCloud: z.boolean().optional()
      })
    },
    async (input) => jsonResult(await previewContentPack(input.contentPack, { checkCloud: input.checkCloud }))
  );

  server.registerTool(
    "apply_content_pack",
    {
      title: "Apply Dicer content pack",
      description:
        "Upsert a preview-safe content pack into Supabase cloud. Requires confirmProjectRef to exactly match SUPABASE_PROJECT_ID.",
      inputSchema: z.object({
        contentPack: contentPackSchema,
        confirmProjectRef: z.string()
      })
    },
    async (input) => jsonResult(await applyContentPack(input.contentPack, { confirmProjectRef: input.confirmProjectRef }))
  );

  server.registerTool(
    "patch_json_rows",
    {
      title: "Patch Dicer JSON rows",
      description:
        "Apply JSON Patch operations to allowlisted JSON/JSONB columns. Stateful tables require expectedHash.",
      inputSchema: z.object({
        patches: z.array(jsonPatchRequestSchema).min(1),
        confirmProjectRef: z.string(),
        dryRun: z.boolean().optional()
      })
    },
    async (input) =>
      jsonResult(
        await patchJsonRows(input.patches as JsonPatchRequest[], {
          confirmProjectRef: input.confirmProjectRef,
          dryRun: input.dryRun
        })
      )
  );

  return server;
}

export async function main() {
  loadDicerContentConfig();
  const server = createDicerContentMcpServer();
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
