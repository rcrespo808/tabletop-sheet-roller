import type { CharacterInventoryItem, SheetAction } from "@/lib/sheets/types";

export type CodexEntryType =
  | "ability"
  | "spell"
  | "power"
  | "feat"
  | "merit"
  | "rite"
  | "condition"
  | "disease"
  | "curse"
  | "blessing"
  | "item"
  | "loot"
  | "note";

export type CodexSystem = "dnd5e" | "nwod" | "generic";

export type CodexVisibility = "gm_only" | "campaign" | "public";

export type CodexGrant =
  | {
      type: "action";
      action: SheetAction;
    }
  | {
      type: "inventory_item";
      item: CharacterInventoryItem;
    }
  | {
      type: "note";
      title: string;
      body: string;
      visibility?: "public" | "gm_only" | "assigned";
    }
  | {
      type: "stat_modifier";
      target: string;
      value: number;
      mode: "add" | "set";
    };

export type CodexPrerequisite = {
  label: string;
  rule?: string;
};

export type CodexEntry = {
  id: string;
  campaignId?: string | null;
  system: CodexSystem;
  type: CodexEntryType;
  name: string;
  subtitle?: string;
  description: string;
  rulesText?: string;
  tags: string[];
  visibility: CodexVisibility;
  actionTemplate?: SheetAction;
  grants?: CodexGrant[];
  prerequisites?: CodexPrerequisite[];
  sourceLabel?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const CODEX_SYSTEMS: CodexSystem[] = ["generic", "dnd5e", "nwod"];

export const CODEX_ENTRY_TYPES: CodexEntryType[] = [
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
];

export const CODEX_VISIBILITIES: CodexVisibility[] = ["campaign", "gm_only", "public"];
