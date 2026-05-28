import type { CharacterProfile, GameSystem, SheetAction, SystemSheet } from "@/lib/sheets/types";

export const characterProfiles: CharacterProfile[] = [
  {
    id: "he-zhen",
    name: "He Zhen",
    subtitle: "The Tuned Immortal",
    concept: "Occult signal manipulator and silence-based controller.",
    defaultSystem: "dnd5e",
    portraitImage: "/characters/he-zhen/sheet.png",
    sheets: {
      dnd5e: {
        system: "dnd5e",
        label: "D&D 5e",
        levelLabel: "Level 12 Resonant",
        sheetImage: "/characters/he-zhen/sheet.png",
        attributes: {
          str: 10,
          dex: 16,
          con: 14,
          int: 20,
          wis: 14,
          cha: 12
        },
        stats: {
          level: 12,
          proficiencyBonus: 4,
          armorClass: 16,
          initiativeBonus: 3,
          speed: 30,
          maxHp: 84,
          currentHp: 84,
          spellSaveDc: 18,
          spellAttackBonus: 10,
          saveProficiencies: {
            int: true,
            wis: true
          }
        },
        skills: {
          arcana: { ability: "int", proficient: true },
          investigation: { ability: "int", proficient: true },
          insight: { ability: "wis", proficient: true },
          perception: { ability: "wis", proficient: true },
          stealth: { ability: "dex", proficient: true },
          religion: { ability: "int", proficient: true }
        },
        actions: [
          {
            id: "dnd-rapier-attack",
            type: "dnd-roll",
            label: "Rapier Attack",
            roll: "1d20+8",
            source: "custom"
          },
          {
            id: "dnd-rapier-damage",
            type: "dnd-roll",
            label: "Rapier Damage",
            roll: "1d8+2",
            source: "custom"
          },
          {
            id: "dnd-resonance-check",
            type: "dnd-roll",
            label: "Resonance Check",
            roll: "1d20+10",
            source: "custom"
          },
          {
            id: "dnd-int-save",
            type: "dnd-roll",
            label: "Intelligence Save",
            roll: "1d20+9",
            source: "custom"
          },
          {
            id: "dnd-silence-dc",
            type: "dnd-roll",
            label: "Silence Field DC Reminder",
            roll: "1d20+5",
            notes: "Placeholder roll for the MVP action model.",
            source: "custom"
          }
        ]
      },
      nwod: {
        system: "nwod",
        label: "NWoD",
        levelLabel: "Dead Air",
        sheetImage: "/characters/he-zhen/sheet.png",
        attributes: {
          intelligence: 4,
          wits: 5,
          resolve: 4,
          strength: 2,
          dexterity: 3,
          stamina: 3,
          presence: 3,
          manipulation: 4,
          composure: 4
        },
        stats: {
          willpower: 6,
          maxWillpower: 6,
          health: 7,
          maxHealth: 7,
          defense: 2,
          speed: 9,
          initiative: 9,
          morality: 7
        },
        skills: {
          occult: 4,
          investigation: 3,
          expression: 3,
          stealth: 2,
          persuasion: 2,
          intimidation: 2,
          empathy: 2,
          subterfuge: 3,
          science: 2
        },
        actions: [
          {
            id: "nwod-resonance-projection",
            type: "nwod-pool",
            label: "Resonance Projection",
            pool: 8,
            again: 10,
            source: "custom"
          },
          {
            id: "nwod-absolute-silence",
            type: "nwod-pool",
            label: "Absolute Silence",
            pool: 8,
            again: 10,
            source: "custom"
          },
          {
            id: "nwod-signal-hijack",
            type: "nwod-pool",
            label: "Signal Hijack",
            pool: 7,
            again: 10,
            source: "custom"
          },
          {
            id: "nwod-harmonic-ward",
            type: "nwod-pool",
            label: "Harmonic Ward",
            pool: 9,
            again: 10,
            source: "custom"
          },
          {
            id: "nwod-emotional-resonance",
            type: "nwod-pool",
            label: "Emotional Resonance",
            pool: 6,
            again: 10,
            source: "custom"
          }
        ]
      }
    }
  }
];

export function getCharacterProfile(characterId: string): CharacterProfile | undefined {
  return characterProfiles.find((profile) => profile.id === characterId);
}

export function getAvailableSystems(profile: CharacterProfile): GameSystem[] {
  return (Object.keys(profile.sheets) as GameSystem[]).filter(
    (system) => profile.sheets[system] !== undefined
  );
}

export function getSystemSheet(
  profile: CharacterProfile,
  system: GameSystem
): SystemSheet | undefined {
  return profile.sheets[system];
}

export function getPrimaryImage(profile: CharacterProfile): string | undefined {
  const defaultSheet = profile.sheets[profile.defaultSystem];
  return (
    profile.portraitImage ??
    defaultSheet?.sheetImage ??
    profile.sheets.dnd5e?.sheetImage ??
    profile.sheets.nwod?.sheetImage
  );
}

export function getActionCount(profile: CharacterProfile, system: GameSystem): number {
  return profile.sheets[system]?.actions.length ?? 0;
}

export function getTotalActionCount(profile: CharacterProfile): number {
  return getAvailableSystems(profile).reduce(
    (total, system) => total + getActionCount(profile, system),
    0
  );
}

export function ensureActionIds(
  actions: (SheetAction | Omit<SheetAction, "id">)[]
): SheetAction[] {
  return actions.map((action, index) => {
    const withId = action as SheetAction;
    if (typeof withId.id === "string" && withId.id.trim()) {
      return withId;
    }

    return {
      ...action,
      id: `${action.type}-${index}-${action.label.toLowerCase().replace(/\s+/g, "-")}`
    } as SheetAction;
  });
}
