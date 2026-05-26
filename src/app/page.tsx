import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { CharacterCard } from "@/components/CharacterCard";
import { GlassPanel } from "@/components/GlassPanel";
import { characters } from "@/data/characters";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-700/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
              <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-cyan-200">
                Tabletop Sheet Roller
              </p>
              <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
                Character Gallery
              </h1>
            </div>
          </div>
          <Link
            className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/20 px-4 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
            href="/characters/he-zhen"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Open He Zhen
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">Your Characters</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Select a character to open their sheet, trigger prepared actions, and keep a
            browser-session roll log.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard character={character} key={character.id} />
          ))}
        </section>

        <div className="mt-12 border-t border-slate-700/20 pt-8">
          <GlassPanel level="tertiary" className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              The MVP is static and local-first. Realtime rooms are the next system layer.
            </p>
          </GlassPanel>
        </div>
      </div>
    </main>
  );
}
