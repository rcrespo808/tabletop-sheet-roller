import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { CharacterImageKind, CharacterImageUploadResult } from "@/lib/storage/characterImages";
import type { GameSystem } from "@/lib/sheets/types";

export const CHARACTER_IMAGES_BUCKET = "character-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

function sanitizeCharacterId(characterId: string): string {
  return characterId.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
}

export function getImageExtension(file: File): string {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

export function buildCharacterImagePath(
  characterId: string,
  kind: CharacterImageKind,
  system?: GameSystem,
  extension = "png"
): string {
  const safeId = sanitizeCharacterId(characterId);
  if (kind === "portrait") {
    return `${safeId}/portrait.${extension}`;
  }
  if (!system) {
    throw new Error("System is required for sheet image uploads.");
  }
  return `${safeId}/sheets/${system}.${extension}`;
}

function validateImageFile(file: File, maxBytes: number) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Use PNG, JPEG, WebP, or GIF images.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Image must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller.`);
  }
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadToSupabaseStorage(
  characterId: string,
  file: File,
  kind: CharacterImageKind,
  system?: GameSystem
): Promise<CharacterImageUploadResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase client unavailable.");
  }

  validateImageFile(file, MAX_IMAGE_BYTES);
  const extension = getImageExtension(file);
  const storagePath = buildCharacterImagePath(characterId, kind, system, extension);

  const { error: uploadError } = await client.storage
    .from(CHARACTER_IMAGES_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600"
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from(CHARACTER_IMAGES_BUCKET).getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
    mimeType: file.type,
    byteSize: file.size,
    storage: "supabase"
  };
}

async function uploadToLocalDataUrl(file: File): Promise<CharacterImageUploadResult> {
  validateImageFile(file, MAX_LOCAL_IMAGE_BYTES);
  const publicUrl = await readFileAsDataUrl(file);

  return {
    publicUrl,
    storagePath: `local://${file.name}`,
    mimeType: file.type,
    byteSize: file.size,
    storage: "local"
  };
}

export async function uploadCharacterImage(options: {
  characterId: string;
  file: File;
  kind: CharacterImageKind;
  system?: GameSystem;
}): Promise<CharacterImageUploadResult> {
  const characterId = options.characterId.trim();
  if (!characterId) {
    throw new Error("Character ID is required before uploading an image.");
  }

  if (options.kind === "sheet" && !options.system) {
    throw new Error("Select a game system for sheet image uploads.");
  }

  if (isSupabaseConfigured()) {
    try {
      return await uploadToSupabaseStorage(
        characterId,
        options.file,
        options.kind,
        options.system
      );
    } catch (error) {
      console.warn("[characterImageStorage] Supabase upload failed, using local data URL.", error);
    }
  }

  return uploadToLocalDataUrl(options.file);
}

export async function deleteCharacterImage(storagePath: string): Promise<void> {
  if (!storagePath || storagePath.startsWith("local://") || storagePath.startsWith("data:")) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.storage.from(CHARACTER_IMAGES_BUCKET).remove([storagePath]);
  if (error) {
    console.warn("[characterImageStorage] Failed to delete image.", error);
  }
}

export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/character-images/");
}

export function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${CHARACTER_IMAGES_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}
