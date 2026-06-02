"use client";

export type CombatMode = "setup" | "gm" | "player";

const MODES: { id: CombatMode; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "gm", label: "GM View" },
  { id: "player", label: "Player View" }
];

export function CombatModeTabs({
  active,
  onChange
}: {
  active: CombatMode;
  onChange: (mode: CombatMode) => void;
}) {
  return (
    <div
      aria-label="Combat mode"
      className="flex gap-1 overflow-x-auto rounded-lg border border-slate-700/30 bg-slate-950/60 p-1"
      role="tablist"
    >
      {MODES.map((mode) => {
        const isSelected = mode.id === active;
        return (
          <button
            aria-selected={isSelected}
            className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition sm:px-4 ${
              isSelected
                ? "border border-red-500/40 bg-red-500/20 text-red-100"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            key={mode.id}
            onClick={() => onChange(mode.id)}
            role="tab"
            type="button"
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
