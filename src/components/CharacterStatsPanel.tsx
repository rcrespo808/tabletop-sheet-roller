"use client";

import type { RollLogEntry, SystemSheet } from "@/lib/sheets/types";
import { isDnd5eSheet, isNwodSheet } from "@/lib/sheets/types";
import { DndStatsPanel } from "./DndStatsPanel";
import { NwodStatsPanel } from "./NwodStatsPanel";

type CharacterStatsPanelProps = {
  sheet: SystemSheet;
  characterName: string;
  onRoll: (entry: RollLogEntry) => void;
};

export function CharacterStatsPanel({ sheet, characterName, onRoll }: CharacterStatsPanelProps) {
  if (isDnd5eSheet(sheet) && sheet.attributes) {
    return <DndStatsPanel characterName={characterName} onRoll={onRoll} sheet={sheet} />;
  }

  if (isNwodSheet(sheet) && sheet.attributes) {
    return <NwodStatsPanel characterName={characterName} onRoll={onRoll} sheet={sheet} />;
  }

  return null;
}
