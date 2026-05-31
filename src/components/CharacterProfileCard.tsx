import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  getActionCount,
  getAvailableSystems,
  getPrimaryImage
} from "@/data/characters";
import { resolveImageUrl } from "@/lib/site";
import type { CharacterProfile } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";
import { SystemBadge } from "./SystemBadge";

type CharacterProfileCardProps = {
  profile: CharacterProfile;
};

export function CharacterProfileCard({ profile }: CharacterProfileCardProps) {
  const systems = getAvailableSystems(profile);
  const primaryImage = getPrimaryImage(profile);

  return (
    <Link
      className="group block transition-transform duration-300 hover:-translate-y-1"
      href={`/characters/${profile.id}`}
    >
      <GlassPanel level="tertiary" glow="subtle" className="overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500/60 via-cyan-500/40 to-crimson-500/50" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-slate-950/50" />
          <Sparkles
            className="absolute right-3 top-3 h-5 w-5 text-purple-300 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
          {primaryImage ? (
            <Image
              alt={`${profile.name} portrait`}
              className="h-full w-full object-cover opacity-60 transition group-hover:opacity-80"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              src={resolveImageUrl(primaryImage)}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-full border border-slate-700/30 bg-slate-950/40 px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Portrait</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {profile.name.slice(0, 2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold text-foreground transition-colors group-hover:text-purple-100">
                {profile.name}
              </h2>
              <span className="shrink-0 rounded-md border border-slate-700/30 bg-slate-900/60 px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                {profile.characterKind === "gm_character" ? "GM" : "PC"}
              </span>
            </div>
            {profile.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{profile.subtitle}</p>
            ) : null}
            {profile.concept ? (
              <p className="mt-2 line-clamp-2 text-xs text-slate-400">{profile.concept}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {systems.map((system) => (
              <SystemBadge key={system} system={system} />
            ))}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            {systems.map((system) => (
              <p key={system}>
                {system === "dnd5e" ? "D&D 5e" : "NWoD"}: {getActionCount(profile, system)} actions
              </p>
            ))}
          </div>

          <span className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/20 text-sm font-semibold text-purple-100 transition group-hover:bg-purple-500/30">
            Open Character
          </span>
        </div>
      </GlassPanel>
    </Link>
  );
}
