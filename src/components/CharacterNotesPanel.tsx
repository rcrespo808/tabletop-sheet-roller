"use client";

import type { CharacterProfile } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";

type CharacterNotesPanelProps = {
  profile: CharacterProfile;
  canManageGmNotes: boolean;
};

export function CharacterNotesPanel({ profile, canManageGmNotes }: CharacterNotesPanelProps) {
  const gmNotes =
    typeof profile.sheets[profile.defaultSystem]?.metadata?.gmNotes === "string"
      ? String(profile.sheets[profile.defaultSystem]?.metadata?.gmNotes)
      : "";

  return (
    <div className="space-y-6">
      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Character Notes</h2>
        {profile.concept ? (
          <p className="mt-4 text-sm leading-6 text-slate-300">{profile.concept}</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No character notes recorded.</p>
        )}
      </GlassPanel>

      {canManageGmNotes || gmNotes ? (
        <GlassPanel level="secondary" className="p-5">
          <h2 className="text-lg font-semibold text-foreground">GM Notes</h2>
          {gmNotes ? (
            <p className="mt-4 text-sm leading-6 text-slate-300">{gmNotes}</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {canManageGmNotes
                ? "GM notes can be stored in sheet metadata (gmNotes) when editing imports."
                : "No GM notes visible."}
            </p>
          )}
        </GlassPanel>
      ) : null}
    </div>
  );
}
