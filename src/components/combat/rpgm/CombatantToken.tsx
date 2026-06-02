"use client";

import Image from "next/image";
import { Skull } from "lucide-react";
import type { Combatant } from "@/lib/combat/types";
import { getPortraitUrl, getTokenColor, isDimmedCombatant } from "@/lib/combat/rpgmDisplay";

export function CombatantToken({
  combatant,
  size = "md"
}: {
  combatant: Combatant;
  size?: "sm" | "md" | "lg";
}) {
  const portraitUrl = getPortraitUrl(combatant);
  const dimmed = isDimmedCombatant(combatant.status);
  const sizeClass =
    size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-slate-600/40 bg-gradient-to-br ${getTokenColor(combatant)} ${sizeClass} ${dimmed ? "opacity-45 grayscale" : ""}`}
    >
      {portraitUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={size === "lg" ? "80px" : size === "sm" ? "48px" : "64px"}
          src={portraitUrl}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <Skull className={size === "sm" ? "h-5 w-5" : "h-7 w-7"} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
