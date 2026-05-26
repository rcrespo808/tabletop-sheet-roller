"use client";

import Image from "next/image";
import { useState } from "react";
import { getPublicAssetPath } from "@/lib/site";
import type { CharacterSheet } from "@/lib/sheets/types";

type CharacterSheetViewerProps = {
  character: CharacterSheet;
};

export function CharacterSheetViewer({ character }: CharacterSheetViewerProps) {
  const [failed, setFailed] = useState(false);
  const sheetImagePath = getPublicAssetPath(character.sheetImage);

  if (failed) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-950 p-8 text-center">
        <div>
          <p className="text-xl font-semibold text-white">{character.name}</p>
          <p className="mt-2 text-sm text-zinc-400">Sheet image not found</p>
          <p className="mt-4 break-all text-xs text-zinc-600">{character.sheetImage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
      <Image
        alt={`${character.name} character sheet`}
        className="h-auto w-full object-contain"
        height={1600}
        onError={() => setFailed(true)}
        src={sheetImagePath}
        unoptimized
        width={1200}
      />
    </div>
  );
}
