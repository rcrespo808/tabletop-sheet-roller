"use client";

import Image from "next/image";
import { Maximize2, StickyNote, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { getPublicAssetPath } from "@/lib/site";
import type { GameSystem, RollLogEntry, SheetAction, SystemSheet } from "@/lib/sheets/types";
import { ActionButton } from "./ActionButton";
import { GlassPanel } from "./GlassPanel";

type CharacterSheetViewerProps = {
  sheet: SystemSheet;
  selectedSystem: GameSystem;
  characterName: string;
  actions: SheetAction[];
  onRoll: (entry: RollLogEntry) => void;
};

export function CharacterSheetViewer({
  sheet,
  selectedSystem,
  characterName,
  actions,
  onRoll
}: CharacterSheetViewerProps) {
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const sheetImage = sheet.sheetImage;
  const sheetImagePath = sheetImage ? getPublicAssetPath(sheetImage) : null;
  const hotspotActions = actions.filter((action) => action.hotspot);

  function zoomOut() {
    setZoom((current) => Math.max(60, current - 10));
  }

  function zoomIn() {
    setZoom((current) => Math.min(160, current + 10));
  }

  if (!sheetImage || failed) {
    return (
      <GlassPanel
        level="secondary"
        glow="medium"
        className="flex min-h-[520px] items-center justify-center border-dashed p-8 text-center"
      >
        <div>
          <p className="text-xl font-semibold text-foreground">{characterName}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sheetImage ? "Sheet image not found" : "No sheet image configured"}
          </p>
          {sheetImage ? (
            <p className="mt-4 break-all text-xs text-slate-600">{sheetImage}</p>
          ) : null}
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Character Sheet</h2>
          {sheet.label ? (
            <p className="mt-1 text-xs text-muted-foreground">{sheet.label}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground"
            onClick={zoomOut}
            type="button"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-12 text-center text-sm text-muted-foreground">{zoom}%</span>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground"
            onClick={zoomIn}
            type="button"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-800/50 hover:text-foreground"
            onClick={() => setZoom(100)}
            type="button"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative overflow-auto rounded-lg border border-slate-700/25 bg-gradient-to-br from-slate-900 to-slate-950">
        <Image
          alt={`${characterName} ${sheet.label ?? selectedSystem} character sheet`}
          className="mx-auto h-auto object-contain transition-[width] duration-300"
          height={1600}
          onError={() => setFailed(true)}
          src={sheetImagePath!}
          style={{ maxWidth: "none", width: `${zoom}%` }}
          unoptimized
          width={1200}
        />
        {hotspotActions.map((action) => {
          if (!action.hotspot) return null;

          return (
            <div
              className="absolute"
              key={action.id}
              style={{
                left: `${action.hotspot.x}%`,
                top: `${action.hotspot.y}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              {action.type === "note" ? (
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/50 bg-purple-500/30 text-purple-100 shadow-lg backdrop-blur-sm transition hover:bg-purple-500/50"
                  title={action.notes}
                  type="button"
                  aria-label={action.label}
                >
                  <StickyNote className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="w-36">
                  <ActionButton
                    action={action}
                    characterName={characterName}
                    compact
                    onRoll={onRoll}
                    selectedSystem={selectedSystem}
                    sheet={sheet}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
