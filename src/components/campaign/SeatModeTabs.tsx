"use client";

export type SeatMode = "manage" | "play";

const MODES: { id: SeatMode; label: string }[] = [
  { id: "manage", label: "Manage" },
  { id: "play", label: "Play" }
];

export function SeatModeTabs({
  active,
  onChange,
  canManage
}: {
  active: SeatMode;
  onChange: (mode: SeatMode) => void;
  canManage: boolean;
}) {
  const visibleModes = canManage ? MODES : MODES.filter((mode) => mode.id === "play");

  return (
    <div
      aria-label="Campaign mode"
      className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-700/30 bg-slate-950/60 p-1"
      role="tablist"
    >
      {visibleModes.map((mode) => {
        const isSelected = mode.id === active;
        return (
          <button
            aria-selected={isSelected}
            className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition sm:px-4 ${
              isSelected
                ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-100"
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
