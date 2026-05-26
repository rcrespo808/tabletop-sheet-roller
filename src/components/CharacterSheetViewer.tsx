"use client";

import Image from "next/image";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { getPublicAssetPath } from "@/lib/site";
import type { CharacterSheet } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";

type CharacterSheetViewerProps = {
  character: CharacterSheet;
};

export function CharacterSheetViewer({ character }: CharacterSheetViewerProps) {
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const sheetImagePath = getPublicAssetPath(character.sheetImage);

  function zoomOut() {
    setZoom((current) => Math.max(60, current - 10));
  }

  function zoomIn() {
    setZoom((current) => Math.min(160, current + 10));
  }

  if (failed) {
    return (
      <GlassPanel
        level="secondary"
        glow="medium"
        className="flex min-h-[520px] items-center justify-center border-dashed p-8 text-center"
      >
        <div>
          <p className="text-xl font-semibold text-foreground">{character.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">Sheet image not found</p>
          <p className="mt-4 break-all text-xs text-slate-600">{character.sheetImage}</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Character Sheet</h2>
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
      <div className="overflow-auto rounded-lg border border-slate-700/25 bg-gradient-to-br from-slate-900 to-slate-950">
        <Image
          alt={`${character.name} character sheet`}
          className="mx-auto h-auto object-contain transition-[width] duration-300"
          height={1600}
          onError={() => setFailed(true)}
          src={sheetImagePath}
          style={{ maxWidth: "none", width: `${zoom}%` }}
          unoptimized
          width={1200}
        />
      </div>
    </GlassPanel>
  );
}
