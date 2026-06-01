"use client";

import type { ReactNode } from "react";

export type CharacterWorkspaceTab =
  | "overview"
  | "actions"
  | "inventory"
  | "rewards"
  | "notes";

type CharacterWorkspaceTabsProps = {
  active: CharacterWorkspaceTab;
  onChange: (tab: CharacterWorkspaceTab) => void;
};

const TABS: { id: CharacterWorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "actions", label: "Actions" },
  { id: "inventory", label: "Inventory" },
  { id: "rewards", label: "Rewards" },
  { id: "notes", label: "Notes" }
];

export function CharacterWorkspaceTabs({ active, onChange }: CharacterWorkspaceTabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-lg border border-slate-700/30 bg-slate-950/60 p-1"
      role="tablist"
      aria-label="Character workspace"
    >
      {TABS.map((tab) => {
        const isSelected = tab.id === active;
        return (
          <button
            key={tab.id}
            className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition sm:px-4 ${
              isSelected
                ? "border border-purple-500/40 bg-purple-500/25 text-purple-100"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={isSelected}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function CharacterWorkspaceTabPanel({
  tab,
  active,
  children
}: {
  tab: CharacterWorkspaceTab;
  active: CharacterWorkspaceTab;
  children: ReactNode;
}) {
  if (tab !== active) return null;
  return (
    <div role="tabpanel" className="space-y-6">
      {children}
    </div>
  );
}
