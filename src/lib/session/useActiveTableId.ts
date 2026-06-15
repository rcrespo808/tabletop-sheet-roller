"use client";

import { useState } from "react";
import { getActiveTableId } from "@/lib/session/activeTable";

export function useActiveTableId(): string | undefined {
  const [activeTableId] = useState<string | undefined>(() => getActiveTableId());

  return activeTableId;
}
