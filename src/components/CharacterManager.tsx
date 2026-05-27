"use client";

import { useMemo, useState } from "react";
import type { CharacterSheet, GameSystem } from "@/lib/sheets/types";
import { parseCharacterSheet } from "@/lib/sheets/customCharacters";
import { GlassPanel } from "@/components/GlassPanel";

type CharacterManagerProps = {
  onAdd: (character: CharacterSheet) => void;
};

const starterJson = `{
  "id": "new-hero",
  "name": "New Hero",
  "system": "dnd5e",
  "subtitle": "Imported Sheet",
  "sheetImage": "/characters/he-zhen/sheet.png",
  "actions": [
    { "type": "dnd-roll", "label": "Attack", "roll": "1d20+5" }
  ]
}`;

export function CharacterManager({ onAdd }: CharacterManagerProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [system, setSystem] = useState<GameSystem>("dnd5e");
  const [sheetImage, setSheetImage] = useState("/characters/he-zhen/sheet.png");
  const [json, setJson] = useState(starterJson);
  const [message, setMessage] = useState<string | null>(null);

  const newCharacter = useMemo<CharacterSheet>(
    () => ({ id, name, system, sheetImage, actions: [] }),
    [id, name, sheetImage, system]
  );

  function addManualCharacter() {
    if (!id.trim() || !name.trim()) {
      setMessage("ID and name are required.");
      return;
    }
    onAdd(newCharacter);
    setMessage(`Added ${name}.`);
    setId("");
    setName("");
  }

  function importJsonCharacter() {
    try {
      const parsed = JSON.parse(json);
      const character = parseCharacterSheet(parsed);
      if (!character) {
        setMessage("Invalid character JSON shape.");
        return;
      }
      onAdd(character);
      setMessage(`Imported ${character.name}.`);
    } catch {
      setMessage("JSON is invalid.");
    }
  }

  return (
    <GlassPanel className="p-5" level="secondary">
      <h3 className="text-lg font-semibold text-foreground">Add or Import Character</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="rounded-md bg-slate-900/60 p-2" placeholder="id" value={id} onChange={(e) => setId(e.target.value)} />
        <input className="rounded-md bg-slate-900/60 p-2" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-md bg-slate-900/60 p-2" value={system} onChange={(e) => setSystem(e.target.value as GameSystem)}>
          <option value="dnd5e">dnd5e</option>
          <option value="nwod">nwod</option>
        </select>
        <input className="rounded-md bg-slate-900/60 p-2" placeholder="sheet image path" value={sheetImage} onChange={(e) => setSheetImage(e.target.value)} />
      </div>
      <button className="mt-3 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold" onClick={addManualCharacter}>Add Character</button>

      <textarea className="mt-5 h-48 w-full rounded-md bg-slate-900/60 p-3 text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
      <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold" onClick={importJsonCharacter}>Import JSON</button>
      {message ? <p className="mt-2 text-sm text-cyan-200">{message}</p> : null}
    </GlassPanel>
  );
}
