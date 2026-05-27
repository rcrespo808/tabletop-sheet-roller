"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { CharacterProfile, GameSystem } from "@/lib/sheets/types";
import { parseCharacterProfile } from "@/lib/sheets/customCharacters";
import { GlassPanel } from "./GlassPanel";

type CreateCharacterPanelProps = {
  onAdd: (profile: CharacterProfile) => void;
};

const starterJson = `{
  "id": "new-hero",
  "name": "New Hero",
  "subtitle": "Imported Sheet",
  "defaultSystem": "dnd5e",
  "portraitImage": "/characters/he-zhen/sheet.png",
  "sheets": {
    "dnd5e": {
      "system": "dnd5e",
      "label": "D&D 5e",
      "sheetImage": "/characters/he-zhen/sheet.png",
      "actions": [
        { "id": "attack", "type": "dnd-roll", "label": "Attack", "roll": "1d20+5" }
      ]
    }
  }
}`;

export function CreateCharacterPanel({ onAdd }: CreateCharacterPanelProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [system, setSystem] = useState<GameSystem>("dnd5e");
  const [sheetImage, setSheetImage] = useState("/characters/he-zhen/sheet.png");
  const [json, setJson] = useState(starterJson);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newProfile = useMemo<CharacterProfile>(
    () => ({
      id,
      name,
      defaultSystem: system,
      portraitImage: sheetImage,
      sheets: {
        [system]: {
          system,
          sheetImage,
          actions: []
        }
      }
    }),
    [id, name, sheetImage, system]
  );

  function addManualCharacter() {
    setError(null);
    if (!id.trim() || !name.trim()) {
      setError("ID and name are required.");
      return;
    }
    onAdd(newProfile);
    setMessage(`Added ${name}.`);
    setId("");
    setName("");
  }

  function importJsonCharacter() {
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
      onAdd(profile);
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
            <p className="mt-1 text-sm text-muted-foreground">Add a quick sheet or paste JSON.</p>
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
          <input
            className="rounded-md border border-slate-700/30 bg-slate-900/60 p-2 text-sm text-foreground outline-none focus:border-purple-500/50"
            placeholder="sheet image path"
            value={sheetImage}
            onChange={(e) => setSheetImage(e.target.value)}
          />
        </div>
        <button
          className="mt-3 rounded-md border border-purple-500/40 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
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
