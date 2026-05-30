export type StorageMode = "supabase" | "local" | "supabase-fallback";

export type StorageStatus = {
  mode: StorageMode;
  message: string;
};

export function storageStatusForMode(mode: StorageMode, scope: "storage" | "roll-log" = "storage"): StorageStatus {
  switch (mode) {
    case "supabase":
      return {
        mode,
        message: scope === "roll-log" ? "Roll log · Supabase" : "Using Supabase"
      };
    case "local":
      return {
        mode,
        message: scope === "roll-log" ? "Roll log · local browser" : "Using local browser storage"
      };
    case "supabase-fallback":
      return {
        mode,
        message:
          scope === "roll-log"
            ? "Roll log · local fallback"
            : "Supabase unavailable, using local storage"
      };
  }
}
