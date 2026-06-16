import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import type {
  GameTable,
  GameTableCharacterAssignment,
  GameTableMember
} from "@/lib/session/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";
import type { CharacterProfile } from "@/lib/sheets/types";
import { listCharacters } from "@/lib/storage/characterRepository";
import { rowToCharacterProfile, type CharacterProfileRow } from "@/lib/storage/supabaseMappers";

const LOCAL_TABLES_KEY = "tsr.gameTables.v1";
const LOCAL_MEMBERS_KEY = "tsr.gameTableMembers.v1";
const LOCAL_ASSIGNMENTS_KEY = "tsr.gameTableAssignments.v1";

type GameTableRow = {
  id: string;
  owner_user_id: string | null;
  name: string;
  slug: string;
  join_code?: string | null;
  created_at: string;
  updated_at: string;
};

type GameTableMemberRow = {
  table_id: string;
  user_id: string;
  user_level: "gm" | "player";
  joined_at: string;
};

type GameTableAssignmentRow = {
  table_id: string;
  character_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
};

let lastGameTableStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getGameTableStorageMode(): StorageMode {
  return lastGameTableStorageMode;
}

function rowToTable(row: GameTableRow): GameTable {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id ?? undefined,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code ?? undefined,
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

function rowToAssignment(row: GameTableAssignmentRow): GameTableCharacterAssignment {
  return {
    tableId: row.table_id,
    characterId: row.character_id,
    userId: row.user_id,
    assignedBy: row.assigned_by ?? undefined,
    assignedAt: row.assigned_at
  };
}

function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `table-${Date.now()}`;
}

function readLocalTables(): GameTable[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_TABLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameTable[]) : [];
  } catch {
    return [];
  }
}

function writeLocalTables(tables: GameTable[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TABLES_KEY, JSON.stringify(tables));
}

function readLocalMembers(): GameTableMember[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_MEMBERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameTableMember[]) : [];
  } catch {
    return [];
  }
}

function writeLocalMembers(members: GameTableMember[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
}

function readLocalAssignments(): GameTableCharacterAssignment[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameTableCharacterAssignment[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAssignments(assignments: GameTableCharacterAssignment[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function listSupabaseTablesForUser(userId: string): Promise<GameTable[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: owned, error: ownedError } = await client
    .from("game_tables")
    .select("*")
    .eq("owner_user_id", userId);

  if (ownedError) throw ownedError;

  const { data: memberships, error: memberError } = await client
    .from("game_table_members")
    .select("table_id")
    .eq("user_id", userId);

  if (memberError) throw memberError;

  const memberTableIds = (memberships ?? [])
    .map((row) => row.table_id as string)
    .filter((id) => !(owned ?? []).some((table) => table.id === id));

  let memberTables: GameTableRow[] = [];
  if (memberTableIds.length > 0) {
    const { data, error } = await client.from("game_tables").select("*").in("id", memberTableIds);
    if (error) throw error;
    memberTables = (data ?? []) as GameTableRow[];
  }

  const merged = new Map<string, GameTable>();
  for (const row of [...((owned ?? []) as GameTableRow[]), ...memberTables]) {
    merged.set(row.id, rowToTable(row));
  }
  return Array.from(merged.values()).sort((a, b) =>
    (b.updatedAt ?? b.name).localeCompare(a.updatedAt ?? a.name)
  );
}

async function getSupabaseTable(tableId: string): Promise<GameTable | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("game_tables").select("*").eq("id", tableId).maybeSingle();
  if (error) throw error;
  return data ? rowToTable(data as GameTableRow) : null;
}

async function ensureSupabaseOwnerMembership(tableId: string, userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from("game_table_members").upsert(
    {
      table_id: tableId,
      user_id: userId,
      user_level: "gm"
    },
    { onConflict: "table_id,user_id" }
  );

  if (error) throw error;
}

export async function listMyTables(): Promise<GameTable[]> {
  const authState = await getCurrentAuthState();
  const userId = authState.user?.id;

  if (isSupabaseConfigured() && userId) {
    try {
      const remote = await listSupabaseTablesForUser(userId);
      lastGameTableStorageMode = "supabase";
      return remote;
    } catch (error) {
      console.warn("[gameTableRepository] Supabase list failed, using local storage.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  if (!userId) return [];
  return readLocalTables().filter(
    (table) =>
      table.ownerUserId === userId ||
      readLocalMembers().some((member) => member.tableId === table.id && member.userId === userId)
  );
}

export async function getTable(tableId: string): Promise<GameTable | null> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabaseTable(tableId);
      if (remote) {
        lastGameTableStorageMode = "supabase";
        return remote;
      }
    } catch (error) {
      console.warn("[gameTableRepository] Supabase get failed, using local storage.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  return readLocalTables().find((table) => table.id === tableId) ?? null;
}

export async function createTable(name: string): Promise<GameTable> {
  const authState = await getCurrentAuthState();
  const userId = authState.user?.id;
  if (!userId) throw new Error("Sign in to create a game table.");

  const slug = `${slugifyName(name)}-${Math.random().toString(16).slice(2, 8)}`;

  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error("Supabase client unavailable");

      const { data, error } = await client
        .from("game_tables")
        .insert({
          name: name.trim(),
          slug,
          owner_user_id: userId
        })
        .select("*")
        .single();

      if (error) throw error;
      lastGameTableStorageMode = "supabase";
      await ensureSupabaseOwnerMembership(data.id as string, userId);
      await getCurrentAuthState();
      return rowToTable(data as GameTableRow);
    } catch (error) {
      console.warn("[gameTableRepository] Supabase create failed, caching locally.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  const table: GameTable = {
    id: crypto.randomUUID(),
    ownerUserId: userId,
    name: name.trim(),
    slug,
    joinCode: generateJoinCode(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  writeLocalTables([...readLocalTables(), table]);
  return table;
}

export async function joinTableByCode(joinCode: string): Promise<string> {
  const authState = await getCurrentAuthState();
  const userId = authState.user?.id;
  if (!userId) throw new Error("Sign in to join a game table.");

  const normalized = joinCode.trim().toUpperCase();
  if (!normalized) throw new Error("Join code is required.");

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { data, error } = await client.rpc("join_game_table", { p_join_code: normalized });
    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return data as string;
  }

  lastGameTableStorageMode = "local";
  const table = readLocalTables().find((entry) => entry.joinCode?.toUpperCase() === normalized);
  if (!table) throw new Error("Invalid join code.");

  const members = readLocalMembers();
  if (!members.some((member) => member.tableId === table.id && member.userId === userId)) {
    writeLocalMembers([
      ...members,
      {
        tableId: table.id,
        userId,
        userLevel: "player",
        joinedAt: new Date().toISOString()
      }
    ]);
  }
  return table.id;
}

export async function leaveTable(tableId: string): Promise<void> {
  const authState = await getCurrentAuthState();
  const userId = authState.user?.id;
  if (!userId) throw new Error("Sign in to leave a game table.");

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { error } = await client.rpc("leave_game_table", { p_table_id: tableId });
    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return;
  }

  lastGameTableStorageMode = "local";
  writeLocalMembers(
    readLocalMembers().filter((member) => !(member.tableId === tableId && member.userId === userId))
  );
  writeLocalAssignments(
    readLocalAssignments().filter(
      (assignment) => !(assignment.tableId === tableId && assignment.userId === userId)
    )
  );
}

export async function listTableMembers(tableId: string): Promise<GameTableMember[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("game_table_members")
        .select("*")
        .eq("table_id", tableId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      lastGameTableStorageMode = "supabase";
      return ((data ?? []) as GameTableMemberRow[]).map(rowToMember);
    } catch (error) {
      console.warn("[gameTableRepository] Supabase members list failed.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  return readLocalMembers().filter((member) => member.tableId === tableId);
}

export async function updateMemberRole(
  tableId: string,
  userId: string,
  userLevel: GameTableMember["userLevel"]
): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { error } = await client
      .from("game_table_members")
      .update({ user_level: userLevel })
      .eq("table_id", tableId)
      .eq("user_id", userId);

    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return;
  }

  lastGameTableStorageMode = "local";
  writeLocalMembers(
    readLocalMembers().map((member) =>
      member.tableId === tableId && member.userId === userId ? { ...member, userLevel } : member
    )
  );
}

export async function removeMember(tableId: string, userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { error } = await client
      .from("game_table_members")
      .delete()
      .eq("table_id", tableId)
      .eq("user_id", userId);

    if (error) throw error;

    await client
      .from("game_table_character_assignments")
      .delete()
      .eq("table_id", tableId)
      .eq("user_id", userId);

    lastGameTableStorageMode = "supabase";
    return;
  }

  lastGameTableStorageMode = "local";
  writeLocalMembers(
    readLocalMembers().filter((member) => !(member.tableId === tableId && member.userId === userId))
  );
  writeLocalAssignments(
    readLocalAssignments().filter(
      (assignment) => !(assignment.tableId === tableId && assignment.userId === userId)
    )
  );
}

export async function listTableCharacters(tableId: string): Promise<CharacterProfile[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("character_profiles")
        .select("*")
        .eq("game_table_id", tableId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      lastGameTableStorageMode = "supabase";
      return (data as CharacterProfileRow[]).map(rowToCharacterProfile);
    } catch (error) {
      console.warn("[gameTableRepository] Supabase table characters failed.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  const characters = await listCharacters();
  return characters.filter((character) => character.gameTableId === tableId);
}

export async function listTableAssignments(
  tableId: string
): Promise<GameTableCharacterAssignment[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("game_table_character_assignments")
        .select("*")
        .eq("table_id", tableId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      lastGameTableStorageMode = "supabase";
      return ((data ?? []) as GameTableAssignmentRow[]).map(rowToAssignment);
    } catch (error) {
      console.warn("[gameTableRepository] Supabase assignments list failed.", error);
      lastGameTableStorageMode = "supabase-fallback";
    }
  } else {
    lastGameTableStorageMode = "local";
  }

  return readLocalAssignments().filter((assignment) => assignment.tableId === tableId);
}

export async function assignCharacter(
  tableId: string,
  characterId: string,
  userId: string
): Promise<GameTableCharacterAssignment> {
  const authState = await getCurrentAuthState();
  const actorId = authState.user?.id;

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { data, error } = await client.rpc("assign_table_character", {
      p_table_id: tableId,
      p_character_id: characterId,
      p_user_id: userId
    });

    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return rowToAssignment(data as GameTableAssignmentRow);
  }

  lastGameTableStorageMode = "local";
  const assignment: GameTableCharacterAssignment = {
    tableId,
    characterId,
    userId,
    assignedBy: actorId,
    assignedAt: new Date().toISOString()
  };
  const others = readLocalAssignments().filter(
    (entry) => !(entry.tableId === tableId && entry.characterId === characterId)
  );
  writeLocalAssignments([...others, assignment]);
  return assignment;
}

export async function unassignCharacter(tableId: string, characterId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { error } = await client.rpc("unassign_table_character", {
      p_table_id: tableId,
      p_character_id: characterId
    });

    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return;
  }

  lastGameTableStorageMode = "local";
  writeLocalAssignments(
    readLocalAssignments().filter(
      (assignment) => !(assignment.tableId === tableId && assignment.characterId === characterId)
    )
  );
}

export async function regenerateJoinCode(tableId: string): Promise<string> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { data, error } = await client.rpc("regenerate_table_join_code", {
      p_table_id: tableId
    });

    if (error) throw error;
    lastGameTableStorageMode = "supabase";
    return data as string;
  }

  lastGameTableStorageMode = "local";
  const code = generateJoinCode();
  writeLocalTables(
    readLocalTables().map((table) =>
      table.id === tableId ? { ...table, joinCode: code, updatedAt: new Date().toISOString() } : table
    )
  );
  return code;
}
