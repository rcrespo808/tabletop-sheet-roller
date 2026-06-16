"use client";

import { useEffect, useState } from "react";
import { getActiveTableId, subscribeActiveTableChange } from "@/lib/session/activeTable";

export function useActiveTableId(): string | undefined {
  const [activeTableId, setActiveTableIdState] = useState<string | undefined>(() =>
    getActiveTableId()
  );

  useEffect(() => {
    return subscribeActiveTableChange(() => {
      setActiveTableIdState(getActiveTableId());
    });
  }, []);

  return activeTableId;
}
