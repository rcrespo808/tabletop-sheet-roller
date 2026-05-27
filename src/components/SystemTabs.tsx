import type { GameSystem } from "@/lib/sheets/types";

type SystemTabsProps = {
  systems: GameSystem[];
  selected: GameSystem;
  onSelect: (system: GameSystem) => void;
};

const labels: Record<GameSystem, string> = {
  dnd5e: "D&D 5e",
  nwod: "NWoD"
};

export function SystemTabs({ systems, selected, onSelect }: SystemTabsProps) {
  if (systems.length <= 1) {
    const system = systems[0];
    if (!system) return null;

    const className =
      system === "dnd5e"
        ? "border-amber-500/40 bg-amber-500/20 text-amber-200"
        : "border-cyan-500/40 bg-cyan-500/20 text-cyan-200";

    return (
      <span
        className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium uppercase ${className}`}
      >
        {labels[system]}
      </span>
    );
  }

  return (
    <div
      className="inline-flex rounded-lg border border-slate-700/30 bg-slate-950/60 p-1"
      role="tablist"
      aria-label="Game system"
    >
      {systems.map((system) => {
        const isSelected = system === selected;
        const selectedClass =
          system === "dnd5e"
            ? "border-amber-500/40 bg-amber-500/25 text-amber-100"
            : "border-cyan-500/40 bg-cyan-500/25 text-cyan-100";

        return (
          <button
            key={system}
            className={`min-h-10 rounded-md px-4 text-sm font-semibold transition ${
              isSelected
                ? selectedClass
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            onClick={() => onSelect(system)}
            role="tab"
            aria-selected={isSelected}
            type="button"
          >
            {labels[system]}
          </button>
        );
      })}
    </div>
  );
}
