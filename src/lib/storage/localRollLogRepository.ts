import type { RollLogEntry } from "@/lib/sheets/types";

const STORAGE_KEY = "tsr.rollLogs.v1";
const LOCAL_ENTRY_LIMIT = 500;

function readStore(): Record<string, RollLogEntry[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RollLogEntry[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, RollLogEntry[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortNewestFirst(entries: RollLogEntry[]): RollLogEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function listLocalRollLogs(roomSlug: string): RollLogEntry[] {
  const store = readStore();
  return sortNewestFirst(store[roomSlug] ?? []);
}

export function saveLocalRollLog(roomSlug: string, entry: RollLogEntry): RollLogEntry {
  const store = readStore();
  const current = store[roomSlug] ?? [];
  const withoutDuplicate = current.filter((existing) => existing.id !== entry.id);
  store[roomSlug] = sortNewestFirst([entry, ...withoutDuplicate]).slice(0, LOCAL_ENTRY_LIMIT);
  writeStore(store);
  return entry;
}

export function replaceLocalRollLogs(roomSlug: string, entries: RollLogEntry[]): RollLogEntry[] {
  const store = readStore();
  store[roomSlug] = sortNewestFirst(entries).slice(0, LOCAL_ENTRY_LIMIT);
  writeStore(store);
  return store[roomSlug];
}

export function clearLocalRollLogs(roomSlug: string): void {
  const store = readStore();
  delete store[roomSlug];
  writeStore(store);
}
