"use client";

import Link from "next/link";
import { Home, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import { createTable, getGameTableStorageMode, listMyTables } from "@/lib/session/gameTableRepository";
import type { SeatRole } from "@/lib/session/permissions";
import { setActiveTableId } from "@/lib/session/activeTable";
import type { GameTable } from "@/lib/session/types";

function resolveTableListRole(table: GameTable, userId?: string): SeatRole {
  if (!userId) return "spectator";
  if (table.ownerUserId === userId) return "gm";
  return "player";
}

export default function TablesPage() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [tables, setTables] = useState<GameTable[]>([]);
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTables(await listMyTables());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tables.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreateTable(event: React.FormEvent) {
    event.preventDefault();
    if (!tableName.trim()) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createTable(tableName.trim());
      setTableName("");
      setMessage(`Created ${created.name}.`);
      setActiveTableId(created.id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create table.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20">
                <Users className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-cyan-200">Game Tables</p>
                <h1 className="text-3xl font-bold">Your Campaign Tables</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StorageStatusBadge mode={getGameTableStorageMode()} />
              <Link
                href="/join"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
              >
                Join with code
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
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <AuthPanel onAuthChange={(state) => { setAuthState(state); void refresh(); }} />

        <GlassPanel level="secondary" className="mt-6 p-6">
          <h2 className="text-lg font-semibold">Create a table</h2>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateTable}>
            <input
              className="h-10 flex-1 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50"
              value={tableName}
              onChange={(event) => setTableName(event.target.value)}
              placeholder="Campaign name"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {busy ? "Creating…" : "Create table"}
            </button>
          </form>
          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </GlassPanel>

        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">Your tables</h2>
          {loading ? (
            <GlassPanel level="secondary" className="p-6 text-sm text-muted-foreground">
              Loading tables…
            </GlassPanel>
          ) : tables.length === 0 ? (
            <GlassPanel level="secondary" className="space-y-3 p-6 text-sm text-muted-foreground">
              <p>No tables yet. Create one as GM or join with a code.</p>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-cyan-500/40 bg-cyan-950/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/40"
                href="/join"
              >
                Join with code
              </Link>
            </GlassPanel>
          ) : (
            tables.map((table) => {
              const role = resolveTableListRole(table, authState?.user?.id);
              return (
              <GlassPanel key={table.id} level="secondary" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{table.name}</h3>
                      <span className="rounded-full border border-slate-600/40 px-2 py-0.5 text-xs font-semibold uppercase text-slate-300">
                        {role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Join code: {table.joinCode ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTableId(table.id)}
                      className="inline-flex h-10 items-center rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
                    >
                      Set active
                    </button>
                    <Link
                      href={`/tables/${table.id}`}
                      className="inline-flex h-10 items-center rounded-md bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
                    >
                      Open lobby
                    </Link>
                  </div>
                </div>
              </GlassPanel>
            );
            })
          )}
        </section>
      </div>
    </main>
  );
}
