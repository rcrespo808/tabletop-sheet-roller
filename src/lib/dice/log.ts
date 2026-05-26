import type { RollLogEntry } from "@/lib/sheets/types";

type RollLogInput = Omit<RollLogEntry, "id" | "createdAt">;

export function createRollLogEntry(input: RollLogInput): RollLogEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    ...input,
    id,
    createdAt: new Date().toISOString()
  };
}
