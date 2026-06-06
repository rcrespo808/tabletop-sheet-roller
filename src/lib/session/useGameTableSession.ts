"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCurrentAuthState,
  onAuthStateChanged,
  type AppUserProfile,
  type AuthState
} from "@/lib/auth/supabaseAuth";
import { listCharacters } from "@/lib/storage/characterRepository";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import {
  createSeatContext,
  type SeatContext,
  type SeatRole
} from "@/lib/session/permissions";

export type GameTable = {
  id: string;
  ownerUserId?: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GameTableMember = {
  tableId: string;
  userId: string;
  userLevel: "gm" | "player";
  joinedAt?: string;
};

type GameTableRow = {
  id: string;
  owner_user_id: string | null;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

type GameTableMemberRow = {
  table_id: string;
  user_id: string;
  user_level: "gm" | "player";
  joined_at: string;
};

export type GameTableSession = {
  user: User | null;
  profile: AppUserProfile | null;
  table: GameTable | null;
  members: GameTableMember[];
  seatContext: SeatContext;
  isGm: boolean;
  controlledCharacterIds: string[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

function rowToTable(row: GameTableRow): GameTable {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id ?? undefined,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToMember(row: GameTableMemberRow): GameTableMember {
  return {
    tableId: row.table_id,
    userId: row.user_id,
    userLevel: row.user_level,
    joinedAt: row.joined_at
  };
}

function resolveSeatRole(input: {
  userId?: string;
  profile: AppUserProfile | null;
  table: GameTable | null;
  members: GameTableMember[];
}): SeatRole {
  if (!input.userId) return "spectator";
  if (input.table?.ownerUserId === input.userId) return "gm";

  const membership = input.members.find((member) => member.userId === input.userId);
  if (membership?.userLevel === "gm") return "gm";
  if (membership?.userLevel === "player") return "player";

  return input.profile?.userLevel === "gm" ? "gm" : "player";
}

export function useGameTableSession(
  gameTableId?: string,
  providedAuthState?: AuthState | null
): GameTableSession {
  const [localAuthState, setLocalAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const [table, setTable] = useState<GameTable | null>(null);
  const [members, setMembers] = useState<GameTableMember[]>([]);
  const [controlledCharacterIds, setControlledCharacterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authState = providedAuthState ?? localAuthState;

  useEffect(() => {
    if (providedAuthState !== undefined) return;

    let mounted = true;
    getCurrentAuthState().then((state) => {
      if (mounted) setLocalAuthState(state);
    });

    const unsubscribe = onAuthStateChanged((state) => {
      if (mounted) setLocalAuthState(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [providedAuthState]);

  const userId = authState.user?.id;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const shouldQueryTable = Boolean(client && isUuid(gameTableId) && userId);

      const [tableResult, memberResult, characters] = await Promise.all([
        shouldQueryTable && client
          ? client
              .from("game_tables")
              .select("*")
              .eq("id", gameTableId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        shouldQueryTable && client
          ? client.from("game_table_members").select("*").eq("table_id", gameTableId)
          : Promise.resolve({ data: [], error: null }),
        listCharacters()
      ]);

      if (tableResult.error) throw tableResult.error;
      if (memberResult.error) throw memberResult.error;

      setTable(tableResult.data ? rowToTable(tableResult.data as GameTableRow) : null);
      setMembers(((memberResult.data ?? []) as GameTableMemberRow[]).map(rowToMember));
      setControlledCharacterIds(
        characters
          .filter((character) => {
            if (!userId || character.ownerUserId !== userId) return false;
            return !gameTableId || !character.gameTableId || character.gameTableId === gameTableId;
          })
          .map((character) => character.id)
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load table session.");
    } finally {
      setLoading(false);
    }
  }, [gameTableId, userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  const role = useMemo(
    () =>
      resolveSeatRole({
        userId: authState.user?.id,
        profile: authState.profile,
        table,
        members
      }),
    [authState.profile, authState.user?.id, members, table]
  );

  const seatContext = useMemo(
    () =>
      createSeatContext({
        gameTableId,
        currentUserId: authState.user?.id,
        role,
        controlledCharacterIds
      }),
    [authState.user?.id, controlledCharacterIds, gameTableId, role]
  );

  return {
    user: authState.user,
    profile: authState.profile,
    table,
    members,
    seatContext,
    isGm: role === "gm",
    controlledCharacterIds,
    loading,
    error,
    reload
  };
}
