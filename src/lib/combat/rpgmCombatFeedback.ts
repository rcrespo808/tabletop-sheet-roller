import type { CombatLogEntry } from "@/lib/combat/types";

export type CombatUiFeedback = {
  id: string;
  summary: string;
  combatantId?: string;
  combatantName?: string;
  actorName?: string;
  actionLabel?: string;
  hpBefore?: number;
  hpAfter?: number;
  damageApplied?: number;
  resultType?: string;
  hit?: boolean;
};

export type RpgRecentResult = {
  summary: string;
  targetId?: string;
  targetBeforeHp?: number;
  targetAfterHp?: number;
  details?: Record<string, unknown>;
};

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseFeedbackFromDetails(
  summary: string,
  details: Record<string, unknown> | undefined,
  id: string
): CombatUiFeedback | null {
  if (!summary.trim()) return null;

  const targetId = readString(details?.targetId);
  const hpBefore =
    readNumber(details?.hpBefore) ??
    readNumber(details?.targetBeforeHp);
  const hpAfter =
    readNumber(details?.hpAfter) ??
    readNumber(details?.targetAfterHp);
  const damageApplied =
    readNumber(details?.damageApplied) ?? readNumber(details?.totalDamage);

  return {
    id,
    summary,
    combatantId: targetId,
    combatantName: readString(details?.targetName),
    actorName: readString(details?.attackerName) ?? readString(details?.actorName),
    actionLabel: readString(details?.actionLabel),
    hpBefore,
    hpAfter,
    damageApplied,
    resultType: readString(details?.resultType),
    hit: readBoolean(details?.hit)
  };
}

export function parseFeedbackFromHistoryEntry(entry: CombatLogEntry): CombatUiFeedback | null {
  const details =
    entry.details && typeof entry.details === "object"
      ? (entry.details as Record<string, unknown>)
      : undefined;
  return parseFeedbackFromDetails(entry.summary, details, entry.id);
}

export function parseFeedbackFromRecentResult(
  recent: RpgRecentResult | null | undefined
): CombatUiFeedback | null {
  if (!recent?.summary?.trim()) return null;
  const details: Record<string, unknown> = {
    ...(recent.details ?? {}),
    targetId: recent.targetId ?? recent.details?.targetId,
    targetBeforeHp: recent.targetBeforeHp,
    targetAfterHp: recent.targetAfterHp
  };
  return parseFeedbackFromDetails(recent.summary, details, "recent-result");
}

export function resolveCombatFeedback(
  recentResult: RpgRecentResult | null | undefined,
  actionHistory: CombatLogEntry[]
): CombatUiFeedback | null {
  const fromRecent = parseFeedbackFromRecentResult(recentResult);
  if (fromRecent) return fromRecent;

  for (const entry of actionHistory) {
    const parsed = parseFeedbackFromHistoryEntry(entry);
    if (!parsed) continue;
    const hasHpChange =
      parsed.hpBefore !== undefined &&
      parsed.hpAfter !== undefined &&
      parsed.hpBefore !== parsed.hpAfter;
    const hasDamage =
      parsed.damageApplied !== undefined && parsed.damageApplied > 0;
    if (hasHpChange || hasDamage || parsed.resultType === "attack_hit") {
      return parsed;
    }
  }

  return actionHistory[0] ? parseFeedbackFromHistoryEntry(actionHistory[0]) : null;
}

export function getHpHighlight(
  feedback: CombatUiFeedback | null,
  combatantId: string
): { hpBefore: number; hpAfter: number; damageApplied?: number } | null {
  if (!feedback?.combatantId || feedback.combatantId !== combatantId) return null;
  if (feedback.hpBefore === undefined || feedback.hpAfter === undefined) return null;
  return {
    hpBefore: feedback.hpBefore,
    hpAfter: feedback.hpAfter,
    damageApplied: feedback.damageApplied
  };
}

export type CombatMessageLine = {
  id: string;
  headline: string;
  body?: string;
  hpDelta?: string;
  tone: "neutral" | "damage" | "healing" | "miss" | "turn" | "declare";
};

export function formatCombatMessageLine(
  entry: CombatLogEntry | CombatUiFeedback
): CombatMessageLine {
  const summary = "summary" in entry ? entry.summary : "";
  const details =
    "details" in entry && entry.details && typeof entry.details === "object"
      ? (entry.details as Record<string, unknown>)
      : undefined;
  const feedback =
    "id" in entry && !("kind" in entry)
      ? (entry as CombatUiFeedback)
      : parseFeedbackFromHistoryEntry(entry as CombatLogEntry);

  const resultType = feedback?.resultType ?? readString(details?.resultType);
  const hpBefore = feedback?.hpBefore;
  const hpAfter = feedback?.hpAfter;
  const damage = feedback?.damageApplied;

  let tone: CombatMessageLine["tone"] = "neutral";
  if (resultType === "turn_start") tone = "turn";
  else if (resultType === "action_declared" || resultType === "action_cancelled") tone = "declare";
  else if (resultType === "healing") tone = "healing";
  else if (resultType === "attack_miss" || (resultType === "attack_hit" && damage === 0)) {
    tone = "miss";
  }
  else if (resultType === "attack_hit" || resultType === "damage") tone = "damage";

  let hpDelta: string | undefined;
  if (hpBefore !== undefined && hpAfter !== undefined) {
    hpDelta = `HP ${hpBefore} → ${hpAfter}`;
    if (damage !== undefined && damage > 0) hpDelta += ` (−${damage})`;
  }

  const headline =
    feedback?.actionLabel && feedback.actorName
      ? `${feedback.actorName}: ${feedback.actionLabel}`
      : summary.split("\n")[0] ?? summary;

  const bodyLines = summary.split("\n").slice(1);
  const body = bodyLines.length > 0 ? bodyLines.join("\n") : undefined;

  return {
    id: "id" in entry ? entry.id : "recent",
    headline,
    body,
    hpDelta,
    tone
  };
}

export const MESSAGE_TONE_CLASSES: Record<CombatMessageLine["tone"], string> = {
  neutral: "border-slate-700/20 bg-slate-950/35 text-slate-200",
  damage: "border-red-500/30 bg-red-950/30 text-red-100",
  healing: "border-emerald-500/30 bg-emerald-950/25 text-emerald-100",
  miss: "border-slate-600/30 bg-slate-900/40 text-slate-300",
  turn: "border-purple-500/25 bg-purple-950/25 text-purple-100",
  declare: "border-cyan-500/30 bg-cyan-950/25 text-cyan-100"
};
