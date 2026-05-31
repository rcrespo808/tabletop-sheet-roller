import type {
  CodexEntry,
  CodexEntryType,
  CodexGrant,
  CodexPrerequisite,
  CodexSystem,
  CodexVisibility
} from "@/lib/codex/types";
import type { CharacterInventoryItem, SheetAction } from "@/lib/sheets/types";

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
  grants?: unknown;
  prerequisites?: unknown;
  source_label?: string | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function isCodexSystem(value: string): value is CodexSystem {
  return value === "dnd5e" || value === "nwod" || value === "generic";
}

function isCodexType(value: string): value is CodexEntryType {
  return [
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
  ].includes(value);
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

function parseInventoryItem(value: unknown): CharacterInventoryItem | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CharacterInventoryItem>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return null;
  return {
    id: candidate.id,
    name: candidate.name,
    quantity: typeof candidate.quantity === "number" ? candidate.quantity : undefined,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    sourceCodexEntryId:
      typeof candidate.sourceCodexEntryId === "string" ? candidate.sourceCodexEntryId : undefined,
    metadata:
      candidate.metadata && typeof candidate.metadata === "object" ? candidate.metadata : undefined
  };
}

function parseGrants(value: unknown): CodexGrant[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((grant): CodexGrant | null => {
      if (!grant || typeof grant !== "object") return null;
      const candidate = grant as Record<string, unknown>;

      if (candidate.type === "action") {
        const action = parseActionTemplate(candidate.action);
        return action ? { type: "action", action } : null;
      }

      if (candidate.type === "inventory_item") {
        const item = parseInventoryItem(candidate.item);
        return item ? { type: "inventory_item", item } : null;
      }

      if (candidate.type === "note") {
        if (typeof candidate.title !== "string" || typeof candidate.body !== "string") return null;
        const visibility =
          candidate.visibility === "public" ||
          candidate.visibility === "gm_only" ||
          candidate.visibility === "assigned"
            ? candidate.visibility
            : undefined;
        return { type: "note", title: candidate.title, body: candidate.body, visibility };
      }

      if (candidate.type === "stat_modifier") {
        if (
          typeof candidate.target !== "string" ||
          typeof candidate.value !== "number" ||
          (candidate.mode !== "add" && candidate.mode !== "set")
        ) {
          return null;
        }
        return {
          type: "stat_modifier",
          target: candidate.target,
          value: candidate.value,
          mode: candidate.mode
        };
      }

      return null;
    })
    .filter((grant): grant is CodexGrant => Boolean(grant));
}

function parsePrerequisites(value: unknown): CodexPrerequisite[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object" && typeof item.label === "string");
    })
    .map((item) => {
      const label = typeof item.label === "string" ? item.label : "";
      return {
        label,
        rule: typeof item.rule === "string" ? item.rule : undefined
      };
    });
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
    grants: parseGrants(row.grants),
    prerequisites: parsePrerequisites(row.prerequisites),
    sourceLabel: row.source_label ?? undefined,
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
    grants: entry.grants ?? [],
    prerequisites: entry.prerequisites ?? [],
    source_label: entry.sourceLabel ?? null,
    metadata: entry.metadata ?? {}
  };
}
