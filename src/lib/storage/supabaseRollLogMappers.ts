import type { RollLogDetails, RollLogEntry, RollLogEntryKind } from "@/lib/sheets/types";
import type { SupabaseRollLogInsert, SupabaseRollLogRow } from "@/lib/persistence/dtos";

function detailsToJson(details?: RollLogDetails): SupabaseRollLogInsert["details"] {
  if (!details) return null;
  if (typeof details === "object") return details;
  return { text: details };
}

function detailsFromJson(details: SupabaseRollLogRow["details"]): RollLogDetails | undefined {
  if (!details) return undefined;
  if (typeof details === "string") return details;
  if (typeof details === "object" && "text" in details && typeof details.text === "string") {
    return details.text;
  }
  return details;
}

export function rollLogEntryToInsert(
  entry: RollLogEntry,
  roomSlug: string,
  characterId?: string | null
): SupabaseRollLogInsert {
  return {
    id: entry.id,
    room_slug: roomSlug,
    character_id: characterId ?? null,
    character_name: entry.characterName ?? null,
    action_label: entry.actionLabel ?? null,
    system: entry.system ?? null,
    kind: entry.kind ?? "roll",
    expression: entry.expression ?? null,
    result_text: entry.resultText,
    details: detailsToJson(entry.details),
    created_at: entry.createdAt
  };
}

export function rowToRollLogEntry(row: SupabaseRollLogRow): RollLogEntry {
  return {
    id: row.id,
    kind: row.kind as RollLogEntryKind,
    characterName: row.character_name ?? undefined,
    actionLabel: row.action_label ?? undefined,
    system: row.system ?? undefined,
    expression: row.expression ?? undefined,
    resultText: row.result_text,
    details: detailsFromJson(row.details),
    createdAt: row.created_at
  };
}
