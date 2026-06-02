"use client";

export function DamagePopup({
  amount,
  kind,
  flashToken
}: {
  amount: number;
  kind: "damage" | "healing";
  flashToken?: number | string;
}) {
  if (amount <= 0) return null;

  const label = kind === "healing" ? `+${amount}` : `−${amount}`;

  return (
    <span
      aria-live="polite"
      className={`rpgm-damage-popup pointer-events-none absolute right-2 top-1 z-10 text-lg font-bold drop-shadow-md ${
        kind === "healing" ? "text-emerald-300" : "text-red-300"
      }`}
      key={flashToken}
    >
      {label}
    </span>
  );
}
