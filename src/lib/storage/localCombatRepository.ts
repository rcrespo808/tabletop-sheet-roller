import type { CombatEncounter } from "@/lib/combat/types";

const STORAGE_KEY = "tsr.combatEncounters.v1";
const DEFAULT_TABLE_KEY = "default";

function readStore(): Record<string, CombatEncounter[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CombatEncounter[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, CombatEncounter[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function tableKey(gameTableId?: string): string {
  return gameTableId ?? DEFAULT_TABLE_KEY;
}

function sortByUpdated(entries: CombatEncounter[]): CombatEncounter[] {
  return [...entries].sort((left, right) => {
    const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
    const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();
    return rightTime - leftTime;
  });
}

export function listLocalEncounters(gameTableId?: string): CombatEncounter[] {
  const store = readStore();
  return sortByUpdated(store[tableKey(gameTableId)] ?? []);
}

export function getLocalEncounter(id: string): CombatEncounter | null {
  const store = readStore();
  for (const encounters of Object.values(store)) {
    const match = encounters.find((encounter) => encounter.id === id);
    if (match) return match;
  }
  return null;
}

export function saveLocalEncounter(encounter: CombatEncounter): CombatEncounter {
  const store = readStore();
  const key = tableKey(encounter.gameTableId);
  const current = store[key] ?? [];
  const withoutDuplicate = current.filter((existing) => existing.id !== encounter.id);
  const saved = {
    ...encounter,
    updatedAt: new Date().toISOString()
  };
  store[key] = sortByUpdated([saved, ...withoutDuplicate]);
  writeStore(store);
  return saved;
}

export function deleteLocalEncounter(id: string): void {
  const store = readStore();
  for (const key of Object.keys(store)) {
    store[key] = store[key].filter((encounter) => encounter.id !== id);
  }
  writeStore(store);
}

export function replaceLocalEncounters(
  gameTableId: string | undefined,
  encounters: CombatEncounter[]
): CombatEncounter[] {
  const store = readStore();
  store[tableKey(gameTableId)] = sortByUpdated(encounters);
  writeStore(store);
  return store[tableKey(gameTableId)];
}
