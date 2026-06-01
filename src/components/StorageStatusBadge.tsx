"use client";

import { storageStatusForMode } from "@/lib/storage/types";
import type { StorageMode } from "@/lib/storage/types";

type StorageStatusBadgeProps = {
  mode?: StorageMode;
  className?: string;
  scope?: "storage" | "roll-log";
};

export function StorageStatusBadge({
  mode = "local",
  className = "",
  scope = "storage"
}: StorageStatusBadgeProps) {
  const status = storageStatusForMode(mode, scope);

  const tone =
    status.mode === "supabase"
      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100"
      : status.mode === "auth-required"
        ? "border-blue-500/40 bg-blue-500/15 text-blue-100"
      : status.mode === "supabase-fallback"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
        : "border-purple-500/40 bg-purple-500/15 text-purple-100";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone} ${className}`}
    >
      {status.message}
    </span>
  );
}
