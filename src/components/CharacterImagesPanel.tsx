"use client";

import { applyImageToProfile } from "@/lib/storage/characterImages";
import { upsertCharacterImageAsset } from "@/lib/storage/characterImageRepository";
import type { CharacterImageUploadResult } from "@/lib/storage/characterImages";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";
import { ImageUploadField } from "./ImageUploadField";

type CharacterImagesPanelProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  onProfileChange: (profile: CharacterProfile) => void | Promise<void>;
};

export function CharacterImagesPanel({
  profile,
  selectedSystem,
  onProfileChange
}: CharacterImagesPanelProps) {
  const sheet = profile.sheets[selectedSystem];

  async function handlePortraitUpload(result: CharacterImageUploadResult) {
    const next = applyImageToProfile(profile, "portrait", result.publicUrl);
    await onProfileChange(next);

    if (result.storage === "supabase") {
      await upsertCharacterImageAsset({
        characterId: profile.id,
        kind: "portrait",
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
        mimeType: result.mimeType,
        byteSize: result.byteSize
      });
    }
  }

  async function handleSheetUpload(result: CharacterImageUploadResult) {
    const next = applyImageToProfile(profile, "sheet", result.publicUrl, selectedSystem);
    await onProfileChange(next);

    if (result.storage === "supabase") {
      await upsertCharacterImageAsset({
        characterId: profile.id,
        kind: "sheet",
        system: selectedSystem,
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
        mimeType: result.mimeType,
        byteSize: result.byteSize
      });
    }
  }

  return (
    <GlassPanel level="secondary" glow="medium" className="p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Character Images</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload to Supabase Storage when configured, otherwise saved locally as a data URL.
        </p>
      </div>
      <div className="mt-4 space-y-4">
        <ImageUploadField
          characterId={profile.id}
          helperText="Gallery card and profile thumbnail"
          kind="portrait"
          label="Portrait"
          onUploaded={handlePortraitUpload}
          value={profile.portraitImage}
        />
        <ImageUploadField
          characterId={profile.id}
          helperText={`Sheet image for ${sheet?.label ?? selectedSystem}`}
          kind="sheet"
          label="System Sheet Image"
          onUploaded={handleSheetUpload}
          system={selectedSystem}
          value={sheet?.sheetImage}
        />
      </div>
    </GlassPanel>
  );
}
