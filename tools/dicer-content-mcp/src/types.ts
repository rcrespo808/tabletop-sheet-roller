import type { WritableTable } from "./constants";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = { [key: string]: JsonValue };

export type DbRow = Record<string, unknown> & {
  id?: string;
  _expectedHash?: string;
};

export type ContentTheme = {
  name: string;
  system?: "dnd5e" | "nwod" | "generic";
  tags?: string[];
  tone?: string;
  prompt?: string;
};

export type ContentPackDefaults = {
  campaignId?: string;
  gameTableId?: string;
  roomSlug?: string;
  createdBy?: string;
};

export type ContentPackRows = Partial<Record<WritableTable, DbRow[]>>;

export type JsonPatchOperation =
  | { op: "add" | "replace" | "test"; path: string; value: JsonValue }
  | { op: "remove"; path: string }
  | { op: "move" | "copy"; path: string; from: string };

export type JsonPatchRequest = {
  table: WritableTable;
  id: string;
  column: string;
  operations: JsonPatchOperation[];
  expectedHash?: string;
};

export type ContentPack = {
  contentPackId: string;
  runId: string;
  generatedAt: string;
  theme: ContentTheme;
  defaults?: ContentPackDefaults;
  rows: ContentPackRows;
  patches: JsonPatchRequest[];
  metadata?: JsonRecord;
};

export type NormalizedRow = {
  table: WritableTable;
  id: string;
  expectedHash?: string;
  row: Record<string, unknown>;
};

export type RowPreview = {
  table: WritableTable;
  id: string;
  action: "insert" | "update" | "unknown";
  expectedHash?: string;
  currentHash?: string;
  nextHash: string;
  hashMatches?: boolean;
  writeColumns: string[];
  diff: JsonPatchOperation[];
  warnings: string[];
  errors: string[];
};

export type PreviewResult = {
  ok: boolean;
  projectRef: string;
  contentPackId: string;
  runId: string;
  checkCloud: boolean;
  rows: RowPreview[];
  patches: Array<{
    table: WritableTable;
    id: string;
    column: string;
    expectedHash?: string;
    currentHash?: string;
    nextHash?: string;
    dryRun: true;
    errors: string[];
  }>;
  duplicateRisks: string[];
  referenceWarnings: string[];
  errors: string[];
  warnings: string[];
};

export type ApplyResult = {
  ok: boolean;
  projectRef: string;
  contentPackId: string;
  runId: string;
  written: Array<{
    table: WritableTable;
    count: number;
    ids: string[];
  }>;
  patches: Array<{
    table: WritableTable;
    id: string;
    column: string;
    previousHash: string;
    nextHash: string;
  }>;
  runLogPath?: string;
};
