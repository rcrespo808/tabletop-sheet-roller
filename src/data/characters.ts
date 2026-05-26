import type { CharacterSheet } from "@/lib/sheets/types";

export const characters: CharacterSheet[] = [
  {
    id: "he-zhen",
    name: "He Zhen",
    system: "dnd5e",
    subtitle: "The Tuned Immortal",
    sheetImage: "/characters/he-zhen/sheet.png",
    actions: [
      {
        type: "dnd-roll",
        label: "Rapier Attack",
        roll: "1d20+8"
      },
      {
        type: "dnd-roll",
        label: "Rapier Damage",
        roll: "1d8+2"
      },
      {
        type: "dnd-roll",
        label: "Resonance Check",
        roll: "1d20+10"
      },
      {
        type: "dnd-roll",
        label: "Intelligence Save",
        roll: "1d20+9"
      },
      {
        type: "dnd-roll",
        label: "Silence Field DC Reminder",
        roll: "1d20+5",
        notes: "Placeholder roll for the MVP action model."
      }
    ]
  },
  {
    id: "he-zhen-nwod",
    name: "He Zhen NWoD",
    system: "nwod",
    subtitle: "Dead Air",
    sheetImage: "/characters/he-zhen/sheet.png",
    actions: [
      {
        type: "nwod-pool",
        label: "Resonance Projection",
        pool: 8,
        again: 10
      },
      {
        type: "nwod-pool",
        label: "Absolute Silence",
        pool: 8,
        again: 10
      },
      {
        type: "nwod-pool",
        label: "Signal Hijack",
        pool: 7,
        again: 10
      },
      {
        type: "nwod-pool",
        label: "Harmonic Ward",
        pool: 9,
        again: 10
      },
      {
        type: "nwod-pool",
        label: "Emotional Resonance",
        pool: 6,
        again: 10
      }
    ]
  }
];

export function getCharacter(characterId: string): CharacterSheet | undefined {
  return characters.find((character) => character.id === characterId);
}
