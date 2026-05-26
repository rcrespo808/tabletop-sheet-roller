import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { CharacterSheet } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";
import { SystemBadge } from "./SystemBadge";

type CharacterCardProps = {
  character: CharacterSheet;
};

export function CharacterCard({ character }: CharacterCardProps) {
  const accent =
    character.system === "dnd5e"
      ? "from-amber-500/60 to-orange-600/60"
      : "from-cyan-400/60 to-cyan-600/60";

  return (
    <Link className="group block transition-transform duration-300 hover:-translate-y-1" href={`/characters/${character.id}`}>
      <GlassPanel level="tertiary" glow="subtle" className="overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
          <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-slate-950/50" />
          <Sparkles
            className="absolute right-3 top-3 h-5 w-5 text-purple-300 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
          <div className="flex h-full items-center justify-center">
            <div className="rounded-full border border-slate-700/30 bg-slate-950/40 px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Sheet</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {character.name.slice(0, 2)}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-purple-100">
              {character.name}
            </h2>
            {character.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{character.subtitle}</p>
            ) : null}
          </div>
          <SystemBadge system={character.system} />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>{character.actions.length} actions</span>
            <span>{character.sheetImage ? "Image slot" : "No image"}</span>
          </div>
          <span className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/20 text-sm font-semibold text-purple-100 transition group-hover:bg-purple-500/30">
            Open Sheet
          </span>
        </div>
      </GlassPanel>
    </Link>
  );
}
