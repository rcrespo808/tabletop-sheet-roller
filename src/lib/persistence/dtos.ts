import type { GameSystem, RollLogEntry, SheetAction } from "@/lib/sheets/types";

/**
 * Browser-safe Supabase env vars (can be exposed to client bundle).
 */
export type PublicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};

/**
 * Server-only Supabase env vars (never expose to browser code).
 */
export type ServerSupabaseEnv = {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type SupabaseCharacterRow = {
  id: string;
  name: string;
  system: GameSystem;
  subtitle: string | null;
  sheet_image: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseCharacterInsert = {
  id: string;
  name: string;
  system: GameSystem;
  subtitle?: string | null;
  sheet_image: string;
};

export type SupabaseCharacterUpdate = Partial<Omit<SupabaseCharacterInsert, "id">>;

export type SupabaseCharacterActionRow = {
  id: string;
  character_id: string;
  position: number;
  action_type: SheetAction["type"];
  label: string;
  roll_expression: string | null;
  pool: number | null;
  again: 8 | 9 | 10 | null;
  rote: boolean | null;
  chance_die: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseCharacterActionInsert = {
  character_id: string;
  position: number;
  action_type: SheetAction["type"];
  label: string;
  roll_expression?: string | null;
  pool?: number | null;
  again?: 8 | 9 | 10 | null;
  rote?: boolean | null;
  chance_die?: boolean | null;
  notes?: string | null;
};

export type SupabaseCharacterActionUpdate = Partial<
  Omit<SupabaseCharacterActionInsert, "character_id" | "position" | "action_type">
>;

export type SupabaseRollLogRow = {
  id: string;
  room_slug: string;
  character_id: string | null;
  character_name: string | null;
  system: GameSystem | null;
  kind: "roll" | "note" | "system";
  action_label: string | null;
  expression: string | null;
  result_text: string;
  details: { text?: string } | string | null;
  created_at: string;
};

export type SupabaseRollLogInsert = {
  id: string;
  room_slug: string;
  character_id?: string | null;
  character_name?: string | null;
  system?: GameSystem | null;
  kind?: "roll" | "note" | "system";
  action_label?: string | null;
  expression?: string | null;
  result_text: string;
  details?: { text?: string } | string | null;
  created_at?: string;
};

export type SupabaseRollLogUpdate = Partial<Omit<SupabaseRollLogInsert, "id" | "room_slug">>;

/** @deprecated Use rollLogEntryToInsert from supabaseRollLogMappers */
export function toSupabaseRollLogInsert(
  entry: Omit<RollLogEntry, "id" | "createdAt"> & {
    id?: string;
    roomId?: string | null;
    roomSlug?: string;
    characterId?: string | null;
    createdAt?: string;
  }
): SupabaseRollLogInsert {
  return {
    id: entry.id ?? crypto.randomUUID(),
    room_slug: entry.roomSlug ?? entry.roomId ?? "default",
    character_id: entry.characterId ?? null,
    character_name: entry.characterName ?? null,
    action_label: entry.actionLabel ?? null,
    system: entry.system ?? null,
    kind: entry.kind ?? "roll",
    expression: entry.expression ?? entry.actionLabel ?? null,
    result_text: entry.resultText,
    details: entry.details ? { text: entry.details } : null,
    created_at: entry.createdAt
  };
}
