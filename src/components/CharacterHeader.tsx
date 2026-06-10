import Link from "next/link";
import { ArrowLeft, RefreshCw, ScrollText } from "lucide-react";
import { getAvailableSystems, getSystemSheet } from "@/data/characters";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";
import { SystemTabs } from "./SystemTabs";

type CharacterHeaderProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  onSystemChange: (system: GameSystem) => void;
  isRollLogOpen?: boolean;
  onRollLogToggle?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

export function CharacterHeader({
  profile,
  selectedSystem,
  onSystemChange,
  isRollLogOpen = false,
  onRollLogToggle,
  isRefreshing = false,
  onRefresh
}: CharacterHeaderProps) {
  const systems = getAvailableSystems(profile);
  const sheet = getSystemSheet(profile, selectedSystem);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground"
            href="/"
            aria-label="Back to gallery"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-foreground">{profile.name}</h1>
            {profile.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{profile.subtitle}</p>
            ) : null}
            {profile.concept ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{profile.concept}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SystemTabs systems={systems} selected={selectedSystem} onSelect={onSystemChange} />
          <div className="flex flex-wrap items-center gap-3">
            {sheet?.levelLabel ? (
              <p className="text-sm text-muted-foreground">{sheet.levelLabel}</p>
            ) : null}
            {onRefresh ? (
              <button
                aria-label="Sync character"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/45 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isRefreshing}
                onClick={onRefresh}
                type="button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Sync
              </button>
            ) : null}
            {onRollLogToggle ? (
              <button
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                  isRollLogOpen
                    ? "border-purple-400/50 bg-purple-600/25 text-purple-100"
                    : "border-slate-700/35 bg-slate-900/50 text-slate-100 hover:bg-slate-800/70"
                }`}
                onClick={onRollLogToggle}
                type="button"
                aria-expanded={isRollLogOpen}
                aria-controls="roll-log-drawer"
              >
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                Roll Log
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
