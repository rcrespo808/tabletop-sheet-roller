import { deriveDndQuickActions, resolveDndCheckAction } from "@/lib/sheets/dnd";
import { deriveNwodQuickActions, resolveNwodCheckPool } from "@/lib/sheets/nwod";
import type { SheetAction, SystemSheet } from "@/lib/sheets/types";

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function getCustomActions(sheet: SystemSheet): SheetAction[] {
  return sheet.actions.filter((action) => action.source !== "derived");
}

export function getDerivedActions(sheet: SystemSheet): SheetAction[] {
  const derived =
    sheet.system === "dnd5e" ? deriveDndQuickActions(sheet) : deriveNwodQuickActions(sheet);

  const customLabels = new Set(getCustomActions(sheet).map((action) => normalizeLabel(action.label)));

  return derived.filter((action) => !customLabels.has(normalizeLabel(action.label)));
}

export function getActionExpressionPreview(sheet: SystemSheet, action: SheetAction): string {
  if (action.type === "dnd-roll") return action.roll;
  if (action.type === "note") return "Note";
  if (action.type === "dnd-check") {
    return resolveDndCheckAction(sheet, action);
  }
  if (action.type === "nwod-pool") {
    const again = action.again === undefined ? 10 : action.again;
    const againText = again === null ? "no-again" : `${again}-again`;
    return `${action.pool}d10 ${againText}`;
  }
  if (action.type === "nwod-check") {
    const pool = resolveNwodCheckPool(sheet, action);
    return `${pool}d10`;
  }
  return "";
}
