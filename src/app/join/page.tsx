"use client";

import Link from "next/link";
import { Home, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { GlassPanel } from "@/components/GlassPanel";
import { joinTableByCode } from "@/lib/session/gameTableRepository";
import { setActiveTableId } from "@/lib/session/activeTable";

export default function JoinTablePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const tableId = await joinTableByCode(joinCode);
      setActiveTableId(tableId);
      router.push(`/tables/${tableId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join table.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20">
              <Users className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-cyan-200">Game Table</p>
              <h1 className="text-2xl font-bold">Join a Table</h1>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/70"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <AuthPanel />

        <GlassPanel level="secondary" className="mt-6 p-6">
          <p className="text-sm text-muted-foreground">
            Enter the join code from your GM to register at the campaign table.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleJoin}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Join code</span>
              <input
                className="h-11 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm uppercase tracking-widest text-foreground outline-none focus:border-cyan-500/50"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCD1234"
                autoComplete="off"
                required
              />
            </label>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
            >
              {busy ? "Joining…" : "Join table"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Already at a table?{" "}
            <Link href="/tables" className="font-semibold text-cyan-200 hover:text-cyan-100">
              View your tables
            </Link>
          </p>
        </GlassPanel>
      </div>
    </main>
  );
}
