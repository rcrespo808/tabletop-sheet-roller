import { CharacterCard } from "@/components/CharacterCard";
import { characters } from "@/data/characters";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-charcoal px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-white/10 pb-6">
          <p className="text-sm font-semibold uppercase text-nwod-teal">Tabletop Sheet Roller</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Character Gallery
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Open a sheet, roll prepared actions, and keep a local session log for the
            table.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard character={character} key={character.id} />
          ))}
        </section>
      </div>
    </main>
  );
}
