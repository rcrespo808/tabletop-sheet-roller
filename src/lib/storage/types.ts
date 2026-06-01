export type StorageMode = "supabase" | "local" | "supabase-fallback" | "auth-required";

export type StorageStatus = {
  mode: StorageMode;
  message: string;
};

export function storageStatusForMode(
  mode: StorageMode,
  scope: "storage" | "roll-log" = "storage"
): StorageStatus {
  switch (mode) {
    case "supabase":
      return {
        mode,
        message: scope === "roll-log" ? "Roll log - Supabase" : "Using Supabase"
      };
    case "local":
      return {
        mode,
        message: scope === "roll-log" ? "Roll log - local browser" : "Using local browser storage"
      };
    case "auth-required":
      return {
        mode,
        message:
          scope === "roll-log"
            ? "Roll log - sign in for Supabase"
            : "Sign in to use Supabase storage"
      };
    case "supabase-fallback":
      return {
        mode,
        message:
          scope === "roll-log"
            ? "Roll log - local fallback"
            : "Supabase unavailable, using local storage"
      };
  }
}
