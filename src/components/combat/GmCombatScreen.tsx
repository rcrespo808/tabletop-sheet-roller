"use client";

import type { ReactNode } from "react";
import { GlassPanel } from "@/components/GlassPanel";

export function GmCombatScreen({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6" aria-label="GM combat screen">
      <GlassPanel level="secondary" className="p-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground">GM command</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Active Combat</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Resolve actions, control turns, update encounter-local HP, and manage combat history.
        </p>
      </GlassPanel>
      {children}
    </section>
  );
}
