import type { Combatant, CombatStatus, CombatTeam } from "@/lib/combat/types";

export const STATUS_LABELS: Record<CombatStatus, string> = {
  active: "OK",
  down: "Down",
  dead: "Dead",
  fled: "Fled",
  hidden: "Hidden"
};

export const TEAM_LABELS: Record<CombatTeam, string> = {
  players: "Players",
  enemies: "Enemies",
  allies: "Allies",
  neutral: "Neutral"
};

export type RpgCommandId =
  | "fight"
  | "skills"
  | "powers"
  | "items"
  | "defend"
  | "wait"
  | "flee";

export const RPG_COMMANDS: { id: RpgCommandId; label: string; enabled: boolean }[] = [
  { id: "fight", label: "Fight", enabled: true },
  { id: "skills", label: "Skills", enabled: true },
  { id: "powers", label: "Powers", enabled: true },
  { id: "items", label: "Items", enabled: true },
  { id: "defend", label: "Defend", enabled: true },
  { id: "wait", label: "Wait", enabled: true },
  { id: "flee", label: "Flee", enabled: true }
];

export {
  actionRequiresTarget,
  getActionBadges,
  getActionsForCommand,
  getCommandActionCount,
  getBuiltinCommand,
  isBuiltinCommand,
  splitSkillActions,
  BUILTIN_COMMANDS
} from "@/lib/combat/rpgmActionCatalog";

export function getPortraitUrl(combatant: Combatant): string | undefined {
  const url = combatant.metadata?.portraitUrl;
  return typeof url === "string" && url.trim() ? url : undefined;
}

export function getTokenColor(combatant: Combatant): string {
  const color = combatant.metadata?.tokenColor;
  if (typeof color === "string" && color.trim()) return color;
  if (combatant.team === "enemies") return "from-red-900/80 to-red-950/90";
  if (combatant.team === "allies") return "from-cyan-900/70 to-cyan-950/90";
  return "from-purple-900/70 to-purple-950/90";
}

export function formatHp(combatant: Combatant): string {
  const current = combatant.currentHp ?? "—";
  const max = combatant.maxHp ?? "—";
  return `${current}/${max}`;
}

export function hpResourceLabel(combatant: Combatant): "HP" | "Health" {
  return combatant.system === "nwod" ? "Health" : "HP";
}

export function defenseLabel(combatant: Combatant): string {
  if (combatant.system === "dnd5e") {
    return combatant.armorClass !== undefined ? `AC ${combatant.armorClass}` : "AC —";
  }
  const def = combatant.defense !== undefined ? `Defense ${combatant.defense}` : "Defense —";
  if (combatant.armor !== undefined) return `${def} · Armor ${combatant.armor}`;
  return def;
}

export function isDimmedCombatant(status: CombatStatus): boolean {
  return status === "dead" || status === "fled";
}

