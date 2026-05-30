"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Shield, StickyNote, Zap } from "lucide-react";
import { getActionExpressionPreview } from "@/lib/sheets/actions";
import { executeSheetAction } from "@/lib/sheets/rollAction";
import type { GameSystem, RollLogEntry, SheetAction, SystemSheet } from "@/lib/sheets/types";

type ActionButtonProps = {
  action: SheetAction;
  sheet: SystemSheet;
  characterName: string;
  selectedSystem: GameSystem;
  onRoll: (entry: RollLogEntry) => void;
  compact?: boolean;
};

function getActionVisual(action: SheetAction) {
  const label = action.label.toLowerCase();

  if (action.type === "note") {
    return {
      icon: StickyNote,
      className: "border-slate-500/40 bg-slate-500/15 text-slate-100 hover:bg-slate-500/25"
    };
  }

  if (label.includes("save") || label.includes("ward")) {
    return {
      icon: Shield,
      className: "border-blue-500/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
    };
  }

  if (
    label.includes("silence") ||
    label.includes("resonance") ||
    label.includes("projection") ||
    label.includes("hijack") ||
    label.includes("emotional")
  ) {
    return {
      icon: BookOpen,
      className: "border-purple-500/40 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
    };
  }

  if (action.type === "dnd-roll" || action.type === "dnd-check") {
    return {
      icon: Zap,
      className: "border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
    };
  }

  return {
    icon: ChevronDown,
    className: "border-green-500/40 bg-green-500/15 text-green-100 hover:bg-green-500/25"
  };
}

export function ActionButton({
  action,
  sheet,
  characterName,
  selectedSystem,
  onRoll,
  compact = false
}: ActionButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const visual = getActionVisual(action);
  const Icon = visual.icon;
  const expressionPreview = getActionExpressionPreview(sheet, action);

  function handleClick() {
    setError(null);

    try {
      const entry = executeSheetAction(sheet, action, characterName, selectedSystem);
      onRoll(entry);

      if (action.type === "note") {
        setNoteOpen((current) => !current);
      }
    } catch (rollError) {
      setError(rollError instanceof Error ? rollError.message : "Action failed.");
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition ${visual.className}`}
          onClick={handleClick}
          title={action.label}
          type="button"
          aria-label={action.label}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
        {error ? <p className="text-[10px] text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-[10rem] flex-1">
      <button
        className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${visual.className}`}
        onClick={handleClick}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950/35">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{action.label}</span>
          <span className="mt-1 block text-xs opacity-75">{expressionPreview}</span>
          {action.type !== "note" && action.notes ? (
            <span className="mt-2 block text-xs leading-5 opacity-70">{action.notes}</span>
          ) : null}
        </span>
      </button>
      {action.type === "note" && noteOpen ? (
        <p className="mt-2 rounded-md bg-slate-950/50 p-3 text-xs leading-5 text-muted-foreground">
          {action.notes}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
