export type StorageMode = "supabase" | "local" | "supabase-fallback";

export type StorageStatus = {
  mode: StorageMode;
  message: string;
};

export function storageStatusForMode(mode: StorageMode): StorageStatus {
  switch (mode) {
    case "supabase":
      return { mode, message: "Using Supabase" };
    case "local":
      return { mode, message: "Using local browser storage" };
    case "supabase-fallback":
      return { mode, message: "Supabase unavailable, using local storage" };
  }
}
