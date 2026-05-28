import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";

export type CharacterImageKind = "portrait" | "sheet";

export type CharacterImageAsset = {
  id: string;
  characterId: string;
  kind: CharacterImageKind;
  system?: GameSystem;
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  mimeType?: string;
  byteSize?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CharacterImageUploadResult = {
  publicUrl: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  storage: "supabase" | "local";
};

export function applyImageToProfile(
  profile: CharacterProfile,
  kind: CharacterImageKind,
  publicUrl: string,
  system?: GameSystem
): CharacterProfile {
  if (kind === "portrait") {
    return { ...profile, portraitImage: publicUrl };
  }

  if (!system) return profile;

  const sheet = profile.sheets[system];
  if (!sheet) return profile;

  return {
    ...profile,
    sheets: {
      ...profile.sheets,
      [system]: {
        ...sheet,
        sheetImage: publicUrl
      }
    }
  };
}

export function collectProfileImageUrls(profile: CharacterProfile): Array<{
  kind: CharacterImageKind;
  system?: GameSystem;
  publicUrl: string;
}> {
  const images: Array<{ kind: CharacterImageKind; system?: GameSystem; publicUrl: string }> = [];

  if (profile.portraitImage) {
    images.push({ kind: "portrait", publicUrl: profile.portraitImage });
  }

  for (const system of ["dnd5e", "nwod"] as const) {
    const sheetImage = profile.sheets[system]?.sheetImage;
    if (sheetImage) {
      images.push({ kind: "sheet", system, publicUrl: sheetImage });
    }
  }

  return images;
}
