"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { characterImportTemplateJson } from "@/data/characterImportTemplate";
import type { CharacterKind, CharacterProfile, GameSystem } from "@/lib/sheets/types";
import { parseCharacterProfile } from "@/lib/sheets/customCharacters";
import { applyImageToProfile } from "@/lib/storage/characterImages";
import type { CharacterImageUploadResult } from "@/lib/storage/characterImages";
import { GlassPanel } from "./GlassPanel";
import { ImageUploadField } from "./ImageUploadField";

type CreateCharacterPanelProps = {
  onAdd: (profile: CharacterProfile) => Promise<void> | void;
};

export function CreateCharacterPanel({ onAdd }: CreateCharacterPanelProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [system, setSystem] = useState<GameSystem>("dnd5e");
  const [characterKind, setCharacterKind] = useState<CharacterKind>("player_character");
  const [portraitImage, setPortraitImage] = useState<string | undefined>();
  const [sheetImage, setSheetImage] = useState<string | undefined>();
  const [json, setJson] = useState(characterImportTemplateJson);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newProfile = useMemo<CharacterProfile>(() => {
    let profile: CharacterProfile = {
      id,
      name,
      characterKind,
      defaultSystem: system,
      inventory: [],
      wallet: {},
      rewardHistory: [],
      progression: {},
      conditions: [],
      sheets: {
        [system]: {
          system,
          actions: []
        }
      }
    };

    if (portraitImage) {
      profile = applyImageToProfile(profile, "portrait", portraitImage);
    }
    if (sheetImage) {
      profile = applyImageToProfile(profile, "sheet", sheetImage, system);
    }

    return profile;
  }, [characterKind, id, name, portraitImage, sheetImage, system]);

  async function handlePortraitUpload(result: CharacterImageUploadResult) {
    setPortraitImage(result.publicUrl);
  }

  async function handleSheetUpload(result: CharacterImageUploadResult) {
    setSheetImage(result.publicUrl);
  }

  async function addManualCharacter() {
    setError(null);
    if (!id.trim() || !name.trim()) {
      setError("ID and name are required.");
      return;
    }
    await onAdd(newProfile);
    setMessage(`Added ${name}.`);
    setId("");
    setName("");
    setCharacterKind("player_character");
    setPortraitImage(undefined);
    setSheetImage(undefined);
  }

  async function importJsonCharacter() {
    setError(null);
    try {
      const parsed = JSON.parse(json);
      const profile = parseCharacterProfile(parsed);
      if (!profile) {
        setError(
          "Invalid character JSON. Expected a CharacterProfile with sheets, or legacy flat sheet with system + actions."
        );
        return;
      }
      await onAdd(profile);
      setMessage(`Imported ${profile.name}.`);
    } catch {
      setError("JSON is invalid — check syntax and try again.");
    }
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none">
        <GlassPanel
          level="secondary"
          className="flex items-center justify-between gap-4 p-4 transition hover:border-purple-500/30"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create or Import Character</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a quick sheet, upload images, or paste JSON.
            </p>
          </div>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180"
            aria-hidden="true"
          />
        </GlassPanel>
      </summary>

      <GlassPanel level="tertiary" className="mt-3 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Add
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-slate-700/30 bg-slate-900/60 p-2 text-sm text-foreground outline-none focus:border-purple-500/50"
            placeholder="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <input
            className="rounded-md border border-slate-700/30 bg-slate-900/60 p-2 text-sm text-foreground outline-none focus:border-purple-500/50"
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-700/30 bg-slate-900/60 p-2 text-sm text-foreground outline-none focus:border-purple-500/50"
            value={system}
            onChange={(e) => setSystem(e.target.value as GameSystem)}
          >
            <option value="dnd5e">D&D 5e</option>
            <option value="nwod">NWoD</option>
          </select>
          <select
            className="rounded-md border border-slate-700/30 bg-slate-900/60 p-2 text-sm text-foreground outline-none focus:border-purple-500/50"
            value={characterKind}
            onChange={(e) => setCharacterKind(e.target.value as CharacterKind)}
          >
            <option value="player_character">Player Character</option>
            <option value="gm_character">GM Character</option>
          </select>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ImageUploadField
            characterId={id}
            helperText="Optional gallery portrait"
            kind="portrait"
            label="Portrait"
            onUploaded={handlePortraitUpload}
            value={portraitImage}
          />
          <ImageUploadField
            characterId={id}
            helperText="Optional sheet image for the selected system"
            kind="sheet"
            label="Sheet Image"
            onUploaded={handleSheetUpload}
            system={system}
            value={sheetImage}
          />
        </div>

        <button
          className="mt-4 rounded-md border border-purple-500/40 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
          onClick={addManualCharacter}
          type="button"
        >
          Add Character
        </button>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          JSON Import
        </h3>
        <textarea
          className="mt-3 h-48 w-full rounded-md border border-slate-700/30 bg-slate-900/60 p-3 font-mono text-xs text-foreground outline-none focus:border-cyan-500/50"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <button
          className="mt-3 rounded-md border border-cyan-500/40 bg-cyan-700/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/60"
          onClick={importJsonCharacter}
          type="button"
        >
          Import JSON
        </button>

        {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </GlassPanel>
    </details>
  );
}
