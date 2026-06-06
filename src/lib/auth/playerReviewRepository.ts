import type { PlayStatus } from "@/lib/auth/supabaseAuth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export type PendingPlayerProfile = {
  id: string;
  email?: string;
  displayName?: string;
  playStatus: PlayStatus;
  createdAt?: string;
};

type AppUserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  play_status: PlayStatus;
  created_at: string;
};

function rowToPendingPlayer(row: AppUserProfileRow): PendingPlayerProfile {
  return {
    id: row.id,
    email: row.email ?? undefined,
    displayName: row.display_name ?? undefined,
    playStatus: row.play_status,
    createdAt: row.created_at
  };
}

export async function listPendingPlayers(): Promise<PendingPlayerProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("app_user_profiles")
    .select("id, email, display_name, play_status, created_at")
    .eq("play_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AppUserProfileRow[]).map(rowToPendingPlayer);
}

export async function reviewPlayer(
  userId: string,
  action: "approve" | "reject"
): Promise<PlayStatus> {
  if (!isSupabaseConfigured()) {
    throw new Error("Player review requires Supabase.");
  }

  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable.");

  const { data, error } = await client.rpc("review_player_access", {
    p_user_id: userId,
    p_action: action
  });

  if (error) throw error;
  return data as PlayStatus;
}

export async function countPendingPlayers(): Promise<number> {
  const players = await listPendingPlayers();
  return players.length;
}
