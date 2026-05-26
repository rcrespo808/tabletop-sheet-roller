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
      ? "border-dnd-gold/40 bg-dnd-red/20 text-dnd-gold"
      : "border-nwod-teal/40 bg-nwod-teal/15 text-nwod-teal";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${className}`}
    >
      {labels[system]}
    </span>
  );
}
