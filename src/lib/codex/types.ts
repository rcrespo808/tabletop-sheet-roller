import type { SheetAction } from "@/lib/sheets/types";

export type CodexEntryType =
  | "ability"
  | "spell"
  | "power"
  | "feat"
  | "item"
  | "loot"
  | "note";

export type CodexSystem = "dnd5e" | "nwod" | "generic";

export type CodexVisibility = "gm_only" | "campaign" | "public";

export type CodexEntry = {
  id: string;
  campaignId?: string;
  system: CodexSystem;
  type: CodexEntryType;
  name: string;
  subtitle?: string;
  description: string;
  rulesText?: string;
  tags: string[];
  visibility: CodexVisibility;
  actionTemplate?: SheetAction;
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
  "item",
  "loot",
  "note"
];

export const CODEX_VISIBILITIES: CodexVisibility[] = ["campaign", "gm_only", "public"];
