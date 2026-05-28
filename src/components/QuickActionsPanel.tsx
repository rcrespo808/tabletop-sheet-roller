"use client";

import { getCustomActions, getDerivedActions } from "@/lib/sheets/actions";
import type { GameSystem, RollLogEntry, SystemSheet } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { GlassPanel } from "./GlassPanel";

type QuickActionsPanelProps = {
  sheet: SystemSheet;
  characterName: string;
  selectedSystem: GameSystem;
  onRoll: (entry: RollLogEntry) => void;
};

function ActionGroup({
  title,
  actions,
  sheet,
  characterName,
  selectedSystem,
  onRoll
}: QuickActionsPanelProps & { title: string; actions: ReturnType<typeof getCustomActions> }) {
  if (actions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-3 space-y-3">
        {actions.map((action) => (
          <ActionButton
            action={action}
            characterName={characterName}
            key={action.id}
            onRoll={onRoll}
            selectedSystem={selectedSystem}
            sheet={sheet}
          />
        ))}
      </div>
    </div>
  );
}

export function QuickActionsPanel({
  sheet,
  characterName,
  selectedSystem,
  onRoll
}: QuickActionsPanelProps) {
  const derived = getDerivedActions(sheet);
  const custom = getCustomActions(sheet);

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {characterName} · {sheet.label ?? selectedSystem}
        </p>
      </div>
      <div className="mt-4 space-y-6">
        <ActionGroup
          actions={derived}
          characterName={characterName}
          onRoll={onRoll}
          selectedSystem={selectedSystem}
          sheet={sheet}
          title="Derived Actions"
        />
        <ActionGroup
          actions={custom}
          characterName={characterName}
          onRoll={onRoll}
          selectedSystem={selectedSystem}
          sheet={sheet}
          title="Custom Actions"
        />
      </div>
    </GlassPanel>
  );
}
