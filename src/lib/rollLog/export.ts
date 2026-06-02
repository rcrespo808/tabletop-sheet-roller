import type { RollLogEntry, RollLogEntryKind } from "@/lib/sheets/types";

export function rollLogDetailsToText(details: RollLogEntry["details"]): string | undefined {
  if (!details) return undefined;
  return typeof details === "string" ? details : JSON.stringify(details);
}

export function normalizeRollLogEntry(entry: RollLogEntry): RollLogEntry & { kind: RollLogEntryKind } {
  return {
    ...entry,
    kind: entry.kind ?? "roll"
  };
}

export function formatLogTime(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoDate));
}

export function formatSystemLabel(system?: RollLogEntry["system"]): string {
  if (system === "dnd5e") return "D&D 5e";
  if (system === "nwod") return "NWoD";
  return "System";
}

export function entryMatchesSearch(entry: RollLogEntry, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    entry.characterName,
    entry.actionLabel,
    entry.expression,
    entry.resultText,
    rollLogDetailsToText(entry.details),
    entry.kind,
    entry.system
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function entriesToPlainText(entries: RollLogEntry[]): string {
  return entries
    .map((entry) => {
      const normalized = normalizeRollLogEntry(entry);
      const header = `[${formatLogTime(normalized.createdAt)}] ${[
        normalized.characterName,
        normalized.kind === "note" ? "Note" : formatSystemLabel(normalized.system),
        normalized.actionLabel
      ]
        .filter(Boolean)
        .join(" · ")}`;

      if (normalized.kind === "note") {
        return `${header}\n${rollLogDetailsToText(normalized.details) ?? normalized.resultText}`;
      }

      const lines = [header, `${normalized.expression ?? ""} → ${normalized.resultText}`];
      const detailsText = rollLogDetailsToText(normalized.details);
      if (detailsText) lines.push(detailsText);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function entriesToJson(entries: RollLogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export async function copyEntriesAsText(entries: RollLogEntry[]): Promise<void> {
  await navigator.clipboard.writeText(entriesToPlainText(entries));
}

export function downloadEntriesAsJson(entries: RollLogEntry[], filename = "roll-log.json"): void {
  const blob = new Blob([entriesToJson(entries)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
