import { customSampleCodex } from "@/data/codex/custom-samples";
import { combatRulesCodex } from "@/data/codex/combat-rules";
import { dnd5eBasicCodex } from "@/data/codex/dnd5e-basic";
import { nwodBasicCodex } from "@/data/codex/nwod-basic";
import type { CodexEntry } from "@/lib/codex/types";

export const starterCodexEntries: CodexEntry[] = [
  ...dnd5eBasicCodex,
  ...nwodBasicCodex,
  ...combatRulesCodex,
  ...customSampleCodex
];

export { combatRulesCodex, customSampleCodex, dnd5eBasicCodex, nwodBasicCodex };
