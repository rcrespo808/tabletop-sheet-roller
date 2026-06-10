import OpenAI from "openai";
import { assertOpenAiConfigured, loadDicerContentConfig, type DicerContentConfig } from "./config";
import { validateContentPack } from "./schemas";
import type { ContentPack } from "./types";

export type GenerateContentPackInput = {
  theme: {
    name: string;
    system?: "dnd5e" | "nwod" | "generic";
    tags?: string[];
    tone?: string;
    prompt?: string;
  };
  defaults?: {
    campaignId?: string;
    gameTableId?: string;
    roomSlug?: string;
    createdBy?: string;
  };
  contentKinds?: string[];
  rowCounts?: Record<string, number>;
  context?: unknown;
  model?: string;
};

export type ResponsesLikeClient = {
  responses: {
    create(input: unknown): Promise<unknown>;
  };
};

const CONTENT_PACK_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["theme", "rows"],
  properties: {
    contentPackId: { type: "string" },
    runId: { type: "string" },
    generatedAt: { type: "string" },
    theme: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string" },
        system: { type: "string", enum: ["dnd5e", "nwod", "generic"] },
        tags: { type: "array", items: { type: "string" } },
        tone: { type: "string" },
        prompt: { type: "string" }
      }
    },
    defaults: {
      type: "object",
      additionalProperties: false,
      properties: {
        campaignId: { type: "string" },
        gameTableId: { type: "string" },
        roomSlug: { type: "string" },
        createdBy: { type: "string" }
      }
    },
    rows: {
      type: "object",
      additionalProperties: false,
      properties: {
        codex_entries: { type: "array", items: { type: "object", additionalProperties: true } },
        loot_tables: { type: "array", items: { type: "object", additionalProperties: true } },
        handouts: { type: "array", items: { type: "object", additionalProperties: true } },
        markets: { type: "array", items: { type: "object", additionalProperties: true } },
        character_profiles: { type: "array", items: { type: "object", additionalProperties: true } },
        combat_encounters: { type: "array", items: { type: "object", additionalProperties: true } },
        roll_logs: { type: "array", items: { type: "object", additionalProperties: true } },
        market_transactions: { type: "array", items: { type: "object", additionalProperties: true } }
      }
    },
    patches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true
      }
    },
    metadata: {
      type: "object",
      additionalProperties: true
    }
  }
} as const;

export async function generateContentPack(
  input: GenerateContentPackInput,
  config: DicerContentConfig = loadDicerContentConfig(),
  injectedClient?: ResponsesLikeClient
): Promise<ContentPack> {
  assertOpenAiConfigured(config);
  const client = injectedClient ?? new OpenAI({ apiKey: config.openAiApiKey });
  const model = input.model || config.model;

  const response = await client.responses.create({
    model,
    instructions:
      "Generate original tabletop campaign content for Dicer. Do not copy long rules text. Return only schema-valid JSON. Use snake_case database column names for rows. Use UUID strings for codex_entries, loot_tables, handouts, markets, combat_encounters, and market_transactions. character_profiles and roll_logs may use stable text ids. Only include rows the request asks for.",
    input: JSON.stringify({
      request: input,
      writableTables: [
        "codex_entries",
        "loot_tables",
        "handouts",
        "markets",
        "character_profiles",
        "combat_encounters",
        "roll_logs",
        "market_transactions"
      ],
      importantJsonColumns: {
        codex_entries: ["action_template", "grants", "prerequisites", "metadata"],
        loot_tables: ["entries"],
        handouts: ["reward_payloads"],
        markets: ["stores", "metadata"],
        character_profiles: ["sheets", "inventory", "wallet", "reward_history", "progression", "conditions"],
        combat_encounters: ["combatants"],
        roll_logs: ["details"],
        market_transactions: ["item", "price"]
      }
    }),
    text: {
      format: {
        type: "json_schema",
        name: "dicer_content_pack",
        strict: false,
        schema: CONTENT_PACK_JSON_SCHEMA
      }
    }
  } as any);

  const jsonText = extractResponseText(response);
  const parsed = JSON.parse(jsonText);
  return validateContentPack(parsed);
}

export function extractResponseText(response: unknown): string {
  const outputText = (response as { output_text?: unknown }).output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText;

  const output = (response as { output?: unknown }).output;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        const text = (block as { text?: unknown }).text;
        if (typeof text === "string") parts.push(text);
      }
    }
    const joined = parts.join("");
    if (joined.trim()) return joined;
  }

  throw new Error("OpenAI response did not contain output_text JSON.");
}
