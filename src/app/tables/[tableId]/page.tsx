"use client";

import Link from "next/link";
import { Copy, Home, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CampaignDashboard } from "@/components/campaign/CampaignDashboard";
import { AuthPanel } from "@/components/AuthPanel";
import { CreateCharacterPanel } from "@/components/CreateCharacterPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import { canReviewPlayers } from "@/lib/auth/accessControl";
import { countPendingPlayers } from "@/lib/auth/playerReviewRepository";
import { fetchIsTableGmAnywhere } from "@/lib/auth/tableGmAccess";
import { getCurrentAuthState, type AuthState } from "@/lib/auth/supabaseAuth";
import { setActiveTableId } from "@/lib/session/activeTable";
import {
  assignCharacter,
  getGameTableStorageMode,
  leaveTable,
  listTableCharacters,
  regenerateJoinCode,
  removeMember,
  unassignCharacter,
  updateMemberRole
} from "@/lib/session/gameTableRepository";
import { useGameTableSession } from "@/lib/session/useGameTableSession";
import { saveCharacter } from "@/lib/storage/characterRepository";
import type { CharacterProfile } from "@/lib/sheets/types";

function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

export default function TableLobbyPage() {
  const params = useParams<{ tableId: string }>();
  const router = useRouter();
  const tableId = params.tableId;

  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [canReview, setCanReview] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const session = useGameTableSession(tableId, authState);

  useEffect(() => {
    void (async () => {
      const [state, isTableGm] = await Promise.all([
        getCurrentAuthState(),
        fetchIsTableGmAnywhere()
      ]);
      setAuthState(state);
      const reviewAllowed = canReviewPlayers(state, { isTableGmAnywhere: isTableGm });
      setCanReview(reviewAllowed);
      if (reviewAllowed) {
        setPendingCount(await countPendingPlayers());
      } else {
        setPendingCount(0);
      }
    })();
  }, []);

  const refreshCharacters = useCallback(async () => {
    if (!tableId) return;
    try {
      setCharacters(await listTableCharacters(tableId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load table characters.");
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    setActiveTableId(tableId);
    queueMicrotask(() => void refreshCharacters());
  }, [refreshCharacters, tableId]);

  useEffect(() => {
    const drafts: Record<string, string> = {};
    for (const assignment of session.assignments) {
      drafts[assignment.characterId] = assignment.userId;
    }
    queueMicrotask(() => setAssignmentDrafts(drafts));
  }, [session.assignments]);

  const myAssignments = useMemo(
    () => session.assignments.filter((assignment) => assignment.userId === authState?.user?.id),
    [authState?.user?.id, session.assignments]
  );

  const assignedCharacterNames = useMemo(() => {
    const byId = new Map(characters.map((character) => [character.id, character.name]));
    return myAssignments.map((assignment) => ({
      assignment,
      name: byId.get(assignment.characterId) ?? assignment.characterId
    }));
  }, [characters, myAssignments]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyAction(key);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyJoinCode() {
    if (!session.table?.joinCode) return;
    await navigator.clipboard.writeText(session.table.joinCode);
    setMessage("Join code copied.");
  }

  async function handleRegenerateJoinCode() {
    await runAction("regenerate-code", async () => {
      const code = await regenerateJoinCode(tableId);
      setMessage(`New join code: ${code}`);
      await session.reload();
    });
  }

  async function handleLeaveTable() {
    await runAction("leave", async () => {
      await leaveTable(tableId);
      setActiveTableId(undefined);
      router.push("/tables");
    });
  }

  async function handleAssignCharacter(characterId: string) {
    const userId = assignmentDrafts[characterId];
    if (!userId) return;

    await runAction(`assign-${characterId}`, async () => {
      await assignCharacter(tableId, characterId, userId);
      setMessage("Character assigned.");
      await Promise.all([session.reload(), refreshCharacters()]);
    });
  }

  async function handleUnassignCharacter(characterId: string) {
    await runAction(`unassign-${characterId}`, async () => {
      await unassignCharacter(tableId, characterId);
      setMessage("Assignment removed.");
      await session.reload();
    });
  }

  async function handleAddTableCharacter(profile: CharacterProfile) {
    await saveCharacter({ ...profile, gameTableId: tableId });
    await refreshCharacters();
    setMessage(`Added ${profile.name} to this table.`);
  }

  if (session.loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 text-foreground">
        <GlassPanel level="secondary" className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
          Loading table lobby…
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20">
                <Users className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-cyan-200">Table Lobby</p>
                <h1 className="text-3xl font-bold">{session.table?.name ?? "Unknown table"}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={getGameTableStorageMode()} />
              <span className="rounded-full border border-slate-700/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                {session.role}
              </span>
              {canReview ? (
                <Link
                  href="/review/players"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-900/40"
                >
                  Review players
                  {pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Link>
              ) : null}
              <Link
                href="/tables"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
              >
                All tables
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Home
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Seat at this table: <strong className="text-foreground">{session.role}</strong>
            {session.controlledCharacterIds.length > 0
              ? ` · ${session.controlledCharacterIds.length} assigned character(s)`
              : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <AuthPanel onAuthChange={setAuthState} />

        {session.error ? (
          <GlassPanel level="secondary" className="p-4 text-sm text-red-300">
            {session.error}
          </GlassPanel>
        ) : null}
        {error ? (
          <GlassPanel level="secondary" className="p-4 text-sm text-red-300">
            {error}
          </GlassPanel>
        ) : null}
        {message ? (
          <GlassPanel level="secondary" className="p-4 text-sm text-emerald-300">
            {message}
          </GlassPanel>
        ) : null}

        <CampaignDashboard
          assignmentCount={session.assignments.length}
          memberCount={session.members.length}
          tableId={tableId}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel level="secondary" className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Join code</h2>
            <p className="text-sm text-muted-foreground">
              Share this code so players can register at{" "}
              <Link href="/join" className="text-cyan-200 hover:text-cyan-100">
                /join
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-slate-900/80 px-3 py-2 text-lg font-bold tracking-widest text-cyan-100">
                {session.table?.joinCode ?? "—"}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyJoinCode()}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy
              </button>
              {session.canManageTable ? (
                <button
                  type="button"
                  disabled={busyAction === "regenerate-code"}
                  onClick={() => void handleRegenerateJoinCode()}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Regenerate
                </button>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel level="secondary" className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Your seat</h2>
            {session.role === "spectator" ? (
              <p className="text-sm text-muted-foreground">
                You are not seated at this table yet. Use a join code or ask the GM to add you.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Role: <strong className="text-foreground">{session.role}</strong>
                </p>
                {assignedCharacterNames.length > 0 ? (
                  <ul className="space-y-1 text-sm text-foreground">
                    {assignedCharacterNames.map((entry) => (
                      <li key={entry.assignment.characterId}>{entry.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No characters assigned yet.</p>
                )}
                {session.role === "player" ? (
                  <button
                    type="button"
                    disabled={busyAction === "leave"}
                    onClick={() => void handleLeaveTable()}
                    className="inline-flex h-10 items-center rounded-md border border-red-500/40 px-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
                  >
                    Leave table
                  </button>
                ) : null}
              </>
            )}
          </GlassPanel>
        </div>

        <GlassPanel level="secondary" className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Roster ({session.members.length})</h2>
          {session.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {session.members.map((member) => (
                <li
                  key={`${member.tableId}-${member.userId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/30 bg-slate-900/40 px-3 py-2"
                >
                  <span className="text-sm text-foreground">
                    {shortUserId(member.userId)}
                    {member.userId === authState?.user?.id ? " (you)" : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-cyan-200">
                      {member.userLevel}
                    </span>
                    {session.canManageTable && member.userId !== session.table?.ownerUserId ? (
                      <>
                        <select
                          className="h-8 rounded-md border border-slate-700/30 bg-slate-900/60 px-2 text-xs text-foreground"
                          value={member.userLevel}
                          onChange={(event) =>
                            void runAction(`role-${member.userId}`, async () => {
                              await updateMemberRole(
                                tableId,
                                member.userId,
                                event.target.value as "gm" | "player"
                              );
                              await session.reload();
                            })
                          }
                        >
                          <option value="player">player</option>
                          <option value="gm">gm</option>
                        </select>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-300 hover:text-red-200"
                          onClick={() =>
                            void runAction(`remove-${member.userId}`, async () => {
                              await removeMember(tableId, member.userId);
                              await session.reload();
                            })
                          }
                        >
                          Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        {session.canManageTable ? (
          <>
            <CreateCharacterPanel onAdd={handleAddTableCharacter} gameTableId={tableId} />

            <GlassPanel level="secondary" className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">Character assignments</h2>
              <p className="text-sm text-muted-foreground">
                Assign table-scoped characters to seated players. Ownership stays with the creator.
              </p>
              {characters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No table characters yet. Create one above.
                </p>
              ) : (
                <ul className="space-y-3">
                  {characters.map((character) => (
                    <li
                      key={character.id}
                      className="flex flex-col gap-2 rounded-md border border-slate-700/30 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{character.name}</p>
                        <p className="text-xs text-muted-foreground">{character.id}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 min-w-[10rem] rounded-md border border-slate-700/30 bg-slate-900/60 px-2 text-sm text-foreground"
                          value={assignmentDrafts[character.id] ?? ""}
                          onChange={(event) =>
                            setAssignmentDrafts((current) => ({
                              ...current,
                              [character.id]: event.target.value
                            }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {session.members
                            .filter((member) => member.userLevel === "player")
                            .map((member) => (
                              <option key={member.userId} value={member.userId}>
                                Player {shortUserId(member.userId)}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={!assignmentDrafts[character.id] || busyAction === `assign-${character.id}`}
                          onClick={() => void handleAssignCharacter(character.id)}
                          className="inline-flex h-9 items-center rounded-md bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
                        >
                          Assign
                        </button>
                        {session.assignments.some(
                          (assignment) => assignment.characterId === character.id
                        ) ? (
                          <button
                            type="button"
                            disabled={busyAction === `unassign-${character.id}`}
                            onClick={() => void handleUnassignCharacter(character.id)}
                            className="inline-flex h-9 items-center rounded-md border border-slate-700/40 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70 disabled:opacity-60"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </>
        ) : null}

        <GlassPanel level="secondary" className="p-6">
          <h2 className="text-lg font-semibold">Play tools</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This table is active in your session. Open combat, markets, or handouts with this context.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/combat"
              className="inline-flex h-10 items-center rounded-md bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Combat
            </Link>
            <Link
              href="/markets"
              className="inline-flex h-10 items-center rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            >
              Markets
            </Link>
            <Link
              href="/handouts"
              className="inline-flex h-10 items-center rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
            >
              Handouts
            </Link>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
