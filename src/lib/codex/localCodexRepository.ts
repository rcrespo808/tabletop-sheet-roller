import type { CodexEntry } from "@/lib/codex/types";

const STORAGE_KEY = "tsr.codexEntries.v1";

function normalizeCodexEntry(entry: CodexEntry): CodexEntry {
  return {
    ...entry,
    id: entry.id.trim(),
    campaignId: entry.campaignId?.trim() || undefined,
    name: entry.name.trim(),
    subtitle: entry.subtitle?.trim() || undefined,
    description: entry.description.trim(),
    rulesText: entry.rulesText?.trim() || undefined,
    tags: entry.tags.map((tag) => tag.trim()).filter(Boolean),
    metadata: entry.metadata ?? {}
  };
}

export async function listLocalCodexEntries(): Promise<CodexEntry[]> {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is CodexEntry => {
        return Boolean(entry && typeof entry === "object" && typeof entry.id === "string");
      })
      .map(normalizeCodexEntry);
  } catch {
    return [];
  }
}

export async function saveLocalCodexEntry(entry: CodexEntry): Promise<CodexEntry> {
  if (typeof window === "undefined") return normalizeCodexEntry(entry);

  const normalized = normalizeCodexEntry(entry);
  const entries = await listLocalCodexEntries();
  const next = [normalized, ...entries.filter((current) => current.id !== normalized.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return normalized;
}

export async function deleteLocalCodexEntry(id: string): Promise<void> {
  if (typeof window === "undefined") return;

  const entries = await listLocalCodexEntries();
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.filter((entry) => entry.id !== id))
  );
}
