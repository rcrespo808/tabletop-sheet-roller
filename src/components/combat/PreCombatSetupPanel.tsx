"use client";

import type { ReactNode } from "react";
import { GlassPanel } from "@/components/GlassPanel";

export function PreCombatSetupPanel({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6" aria-label="Encounter setup">
      <GlassPanel level="secondary" className="p-5">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Pre-combat</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Encounter Setup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build the roster, choose the system, and start initiative before using active combat controls.
          </p>
        </div>
      </GlassPanel>
      {children}
    </section>
  );
}
