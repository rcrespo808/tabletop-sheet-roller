import type { GameSystem } from "@/lib/sheets/types";

type SystemBadgeProps = {
  system: GameSystem;
};

const labels: Record<GameSystem, string> = {
  dnd5e: "D&D 5e",
  nwod: "NWoD"
};

export function SystemBadge({ system }: SystemBadgeProps) {
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
