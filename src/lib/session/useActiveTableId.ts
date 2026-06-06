"use client";

import { useEffect, useState } from "react";
import { getActiveTableId } from "@/lib/session/activeTable";

export function useActiveTableId(): string | undefined {
  const [activeTableId, setActiveTableId] = useState<string | undefined>();

  useEffect(() => {
    setActiveTableId(getActiveTableId());
  }, []);

  return activeTableId;
}
