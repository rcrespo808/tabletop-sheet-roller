export type GameSystem = "dnd5e" | "nwod";

export type SheetHotspot = {
  x: number;
  y: number;
  icon?: string;
};

export type SheetAction =
  | {
      id: string;
      type: "dnd-roll";
      label: string;
      roll: string;
      notes?: string;
      hotspot?: SheetHotspot;
    }
  | {
      id: string;
      type: "nwod-pool";
      label: string;
      pool: number;
      again?: 8 | 9 | 10 | null;
      rote?: boolean;
      chanceDie?: boolean;
      notes?: string;
      hotspot?: SheetHotspot;
    }
  | {
      id: string;
      type: "note";
      label: string;
      notes: string;
      hotspot?: SheetHotspot;
    };

export type SystemSheet = {
  system: GameSystem;
  label?: string;
  levelLabel?: string;
  sheetImage?: string;
  actions: SheetAction[];
  metadata?: Record<string, string | number | boolean>;
};

export type CharacterProfile = {
  id: string;
  name: string;
  subtitle?: string;
  concept?: string;
  portraitImage?: string;
  defaultSystem: GameSystem;
  sheets: Partial<Record<GameSystem, SystemSheet>>;
};

export type RollLogEntry = {
  id: string;
  characterName?: string;
  actionLabel?: string;
  system: GameSystem;
  expression: string;
  resultText: string;
  details: string;
  createdAt: string;
};

/** @deprecated Use CharacterProfile — kept for legacy import/migration only */
export type LegacyCharacterSheet = {
  id: string;
  name: string;
  system: GameSystem;
  subtitle?: string;
  sheetImage: string;
  actions: Omit<SheetAction, "id">[];
};
