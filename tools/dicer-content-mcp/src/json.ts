import { createHash, randomUUID } from "node:crypto";
import { applyPatch, compare, validate, type Operation } from "fast-json-patch";
import { JSON_TARGETS, STATEFUL_JSON_TABLES, type WritableTable } from "./constants";
import type { JsonPatchOperation, JsonValue } from "./types";

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashJson(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function pickJsonTargets(table: WritableTable, row: Record<string, unknown>): Record<string, unknown> {
  const targets = JSON_TARGETS[table];
  return Object.fromEntries(targets.map((column) => [column, row[column] ?? null]));
}

export function hashRowJsonTargets(table: WritableTable, row: Record<string, unknown>): string {
  return hashJson(pickJsonTargets(table, row));
}

export function compareJson(left: unknown, right: unknown): JsonPatchOperation[] {
  return compare(canonicalize(left) as any, canonicalize(right) as any) as JsonPatchOperation[];
}

export function assertJsonColumn(table: WritableTable, column: string) {
  if (!JSON_TARGETS[table].includes(column)) {
    throw new Error(`${table}.${column} is not an allowed JSON write target.`);
  }
}

export function requiresExpectedHash(table: WritableTable): boolean {
  return STATEFUL_JSON_TABLES.includes(table as (typeof STATEFUL_JSON_TABLES)[number]);
}

export function applyJsonPatchDocument(document: JsonValue, operations: JsonPatchOperation[]): JsonValue {
  const patch = operations as Operation[];
  const validationError = validate(patch, document);
  if (validationError) {
    throw validationError;
  }

  return applyPatch(document, patch, true, false, true).newDocument as JsonValue;
}

export function createRunId(prefix = "dicer-content"): string {
  return `${prefix}-${randomUUID()}`;
}
