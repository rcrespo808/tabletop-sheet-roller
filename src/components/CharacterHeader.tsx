import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAvailableSystems, getSystemSheet } from "@/data/characters";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";
import { SystemTabs } from "./SystemTabs";

type CharacterHeaderProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  onSystemChange: (system: GameSystem) => void;
};

export function CharacterHeader({
  profile,
  selectedSystem,
  onSystemChange
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
          {sheet?.levelLabel ? (
            <p className="text-sm text-muted-foreground">{sheet.levelLabel}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
