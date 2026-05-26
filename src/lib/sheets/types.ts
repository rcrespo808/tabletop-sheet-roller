export type GameSystem = "dnd5e" | "nwod";

export type CharacterSheet = {
  id: string;
  name: string;
  system: GameSystem;
  subtitle?: string;
  sheetImage: string;
  actions: SheetAction[];
};

export type SheetAction =
  | {
      type: "dnd-roll";
      label: string;
      roll: string;
      notes?: string;
    }
  | {
      type: "nwod-pool";
      label: string;
      pool: number;
      again?: 8 | 9 | 10 | null;
      rote?: boolean;
      chanceDie?: boolean;
      notes?: string;
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
