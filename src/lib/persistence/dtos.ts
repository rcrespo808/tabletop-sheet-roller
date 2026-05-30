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
  room_id: string | null;
  character_id: string | null;
  character_name: string | null;
  action_label: string | null;
  system: GameSystem;
  expression: string;
  result_text: string;
  details: string;
  created_at: string;
};

export type SupabaseRollLogInsert = {
  room_id?: string | null;
  character_id?: string | null;
  character_name?: string | null;
  action_label?: string | null;
  system: GameSystem;
  expression: string;
  result_text: string;
  details: string;
};

export type SupabaseRollLogUpdate = Partial<Omit<SupabaseRollLogInsert, "system">>;

export function toSupabaseRollLogInsert(
  entry: Omit<RollLogEntry, "id" | "createdAt"> & {
    roomId?: string | null;
    characterId?: string | null;
  }
): SupabaseRollLogInsert {
  return {
    room_id: entry.roomId ?? null,
    character_id: entry.characterId ?? null,
    character_name: entry.characterName ?? null,
    action_label: entry.actionLabel ?? null,
    system: entry.system ?? "dnd5e",
    expression: entry.expression ?? entry.actionLabel ?? "",
    result_text: entry.resultText,
    details: entry.details ?? ""
  };
}
