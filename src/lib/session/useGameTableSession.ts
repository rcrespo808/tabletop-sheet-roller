"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCurrentAuthState,
  onAuthStateChanged,
  type AppUserProfile,
  type AuthState
} from "@/lib/auth/supabaseAuth";
import {
  getTable,
  listTableAssignments,
  listTableMembers
} from "@/lib/session/gameTableRepository";
import { resolveSeatRole } from "@/lib/session/resolveSeatRole";
import type {
  GameTable,
  GameTableCharacterAssignment,
  GameTableMember
} from "@/lib/session/types";
import { useGameTableAssignmentsRealtime } from "@/lib/session/useGameTableAssignmentsRealtime";
import { useGameTableMembersRealtime } from "@/lib/session/useGameTableMembersRealtime";
import {
  canManageTable,
  createSeatContext,
  type SeatContext,
  type SeatRole
} from "@/lib/session/permissions";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export type { GameTable, GameTableMember, GameTableCharacterAssignment } from "@/lib/session/types";

export type GameTableSession = {
  user: User | null;
  profile: AppUserProfile | null;
  table: GameTable | null;
  members: GameTableMember[];
  assignments: GameTableCharacterAssignment[];
  seatContext: SeatContext;
  role: SeatRole;
  isGm: boolean;
  canManageTable: boolean;
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
  const [assignments, setAssignments] = useState<GameTableCharacterAssignment[]>([]);
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

  const refreshMembers = useCallback(async () => {
    if (!isUuid(gameTableId)) {
      setMembers([]);
      return;
    }

    try {
      setMembers(await listTableMembers(gameTableId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh table members.");
    }
  }, [gameTableId]);

  const refreshAssignments = useCallback(async () => {
    if (!isUuid(gameTableId) || !userId) {
      setAssignments([]);
      return;
    }

    try {
      setAssignments(await listTableAssignments(gameTableId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh assignments.");
    }
  }, [gameTableId, userId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isUuid(gameTableId) || !userId) {
        setTable(null);
        setMembers([]);
        setAssignments([]);
        return;
      }

      const tableId = gameTableId;
      const [loadedTable, loadedMembers, loadedAssignments] = await Promise.all([
        getTable(tableId),
        listTableMembers(tableId),
        listTableAssignments(tableId)
      ]);

      setTable(loadedTable);
      setMembers(loadedMembers);
      setAssignments(loadedAssignments);
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

  const realtimeEnabled = isSupabaseConfigured() && Boolean(userId) && isUuid(gameTableId);

  useGameTableMembersRealtime({
    gameTableId,
    enabled: realtimeEnabled,
    onMembersChange: refreshMembers
  });

  useGameTableAssignmentsRealtime({
    gameTableId,
    enabled: realtimeEnabled,
    onAssignmentsChange: refreshAssignments
  });

  const role = useMemo(
    () =>
      resolveSeatRole({
        gameTableId,
        userId: authState.user?.id,
        profile: authState.profile,
        table,
        members
      }),
    [authState.profile, authState.user?.id, gameTableId, members, table]
  );

  const controlledCharacterIds = useMemo(() => {
    if (!userId) return [];
    if (isUuid(gameTableId)) {
      return assignments
        .filter((assignment) => assignment.userId === userId)
        .map((assignment) => assignment.characterId);
    }

    return [];
  }, [assignments, gameTableId, userId]);

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

  const tableCanManage = useMemo(
    () => canManageTable(seatContext, table),
    [seatContext, table]
  );

  return {
    user: authState.user,
    profile: authState.profile,
    table,
    members,
    assignments,
    seatContext,
    role,
    isGm: role === "gm",
    canManageTable: tableCanManage,
    controlledCharacterIds,
    loading,
    error,
    reload
  };
}
