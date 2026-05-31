import type { CodexEntry, CodexEntryType, CodexSystem, CodexVisibility } from "@/lib/codex/types";
import type { SheetAction } from "@/lib/sheets/types";

export type CodexEntryRow = {
  id: string;
  campaign_id: string | null;
  system: string;
  type: string;
  name: string;
  subtitle: string | null;
  description: string;
  rules_text: string | null;
  tags: string[];
  visibility: string;
  action_template: unknown;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function isCodexSystem(value: string): value is CodexSystem {
  return value === "dnd5e" || value === "nwod" || value === "generic";
}

function isCodexType(value: string): value is CodexEntryType {
  return ["ability", "spell", "power", "feat", "item", "loot", "note"].includes(value);
}

function isCodexVisibility(value: string): value is CodexVisibility {
  return value === "gm_only" || value === "campaign" || value === "public";
}

function parseActionTemplate(value: unknown): SheetAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SheetAction>;
  if (typeof candidate.id !== "string" || typeof candidate.label !== "string") return undefined;
  if (
    candidate.type !== "dnd-roll" &&
    candidate.type !== "dnd-check" &&
    candidate.type !== "nwod-pool" &&
    candidate.type !== "nwod-check" &&
    candidate.type !== "note"
  ) {
    return undefined;
  }
  return candidate as SheetAction;
}

export function rowToCodexEntry(row: CodexEntryRow): CodexEntry {
  return {
    id: row.id,
    campaignId: row.campaign_id ?? undefined,
    system: isCodexSystem(row.system) ? row.system : "generic",
    type: isCodexType(row.type) ? row.type : "note",
    name: row.name,
    subtitle: row.subtitle ?? undefined,
    description: row.description,
    rulesText: row.rules_text ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    visibility: isCodexVisibility(row.visibility) ? row.visibility : "campaign",
    actionTemplate: parseActionTemplate(row.action_template),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function codexEntryToUpsert(entry: CodexEntry) {
  return {
    id: entry.id,
    campaign_id: entry.campaignId ?? null,
    system: entry.system,
    type: entry.type,
    name: entry.name,
    subtitle: entry.subtitle ?? null,
    description: entry.description,
    rules_text: entry.rulesText ?? null,
    tags: entry.tags,
    visibility: entry.visibility,
    action_template: entry.actionTemplate ?? null,
    metadata: entry.metadata ?? {}
  };
}
