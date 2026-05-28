"use client";

import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/site";
import { uploadCharacterImage } from "@/lib/storage/characterImageStorage";
import type { CharacterImageKind, CharacterImageUploadResult } from "@/lib/storage/characterImages";
import type { GameSystem } from "@/lib/sheets/types";

type ImageUploadFieldProps = {
  label: string;
  characterId: string;
  kind: CharacterImageKind;
  system?: GameSystem;
  value?: string;
  onUploaded: (result: CharacterImageUploadResult) => void | Promise<void>;
  disabled?: boolean;
  helperText?: string;
};

export function ImageUploadField({
  label,
  characterId,
  kind,
  system,
  value,
  onUploaded,
  disabled = false,
  helperText
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const result = await uploadCharacterImage({
        characterId,
        file,
        kind,
        system
      });
      await onUploaded(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const previewUrl = value ? resolveImageUrl(value) : null;

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/15 px-3 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || uploading || !characterId.trim()}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      <input
        ref={inputRef}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />

      {previewUrl ? (
        <div className="relative mt-3 h-28 overflow-hidden rounded-md border border-slate-700/25 bg-slate-900/60">
          <Image
            alt={`${label} preview`}
            className="object-cover"
            fill
            sizes="320px"
            src={previewUrl}
            unoptimized
          />
        </div>
      ) : (
        <div className="mt-3 flex h-28 items-center justify-center rounded-md border border-dashed border-slate-700/30 bg-slate-900/40 text-xs text-muted-foreground">
          No image yet
        </div>
      )}

      {value ? (
        <p className="mt-2 truncate text-[11px] text-slate-500" title={value}>
          {value}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      {!characterId.trim() ? (
        <p className="mt-2 text-xs text-amber-200">Enter a character ID before uploading.</p>
      ) : null}
    </div>
  );
}
