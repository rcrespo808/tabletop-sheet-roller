export type GameSystem = "dnd5e" | "nwod";
export type UserLevel = "player" | "gm";
export type CharacterKind = "player_character" | "gm_character";

export type SheetHotspot = {
  x: number;
  y: number;
  icon?: string;
};

export type SheetActionMetadata = Record<string, string | number | boolean | null | undefined>;

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type Dnd5eAttributes = Record<AbilityKey, number>;

export type Dnd5eStats = {
  level?: number;
  proficiencyBonus?: number;
  armorClass?: number;
  initiativeBonus?: number;
  speed?: number;
  maxHp?: number;
  currentHp?: number;
  spellSaveDc?: number;
  spellAttackBonus?: number;
  saveProficiencies?: Partial<Record<AbilityKey, boolean>>;
};

export type Dnd5eSkillKey =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type Dnd5eSkill = {
  ability: AbilityKey;
  proficient?: boolean;
  expertise?: boolean;
  bonus?: number;
};

export type Dnd5eSkills = Partial<Record<Dnd5eSkillKey, Dnd5eSkill>>;

export type NwodAttributeKey =
  | "intelligence"
  | "wits"
  | "resolve"
  | "strength"
  | "dexterity"
  | "stamina"
  | "presence"
  | "manipulation"
  | "composure";

export type NwodAttributes = Record<NwodAttributeKey, number>;

export type NwodSkillKey =
  | "academics"
  | "computer"
  | "crafts"
  | "investigation"
  | "medicine"
  | "occult"
  | "politics"
  | "science"
  | "athletics"
  | "brawl"
  | "drive"
  | "firearms"
  | "larceny"
  | "stealth"
  | "survival"
  | "animalKen"
  | "empathy"
  | "expression"
  | "intimidation"
  | "persuasion"
  | "socialize"
  | "streetwise"
  | "subterfuge";

export type NwodSkills = Partial<Record<NwodSkillKey, number>>;

export type NwodStats = {
  willpower?: number;
  maxWillpower?: number;
  health?: number;
  maxHealth?: number;
  defense?: number;
  speed?: number;
  initiative?: number;
  armor?: number;
  morality?: number;
};

export type SheetAction =
  | {
      id: string;
      type: "dnd-roll";
      label: string;
      roll: string;
      notes?: string;
      source?: "custom" | "derived";
      hotspot?: SheetHotspot;
      metadata?: SheetActionMetadata;
    }
  | {
      id: string;
      type: "dnd-check";
      label: string;
      ability: AbilityKey;
      skill?: Dnd5eSkillKey;
      save?: boolean;
      modifier?: number;
      notes?: string;
      source?: "custom" | "derived";
      hotspot?: SheetHotspot;
      metadata?: SheetActionMetadata;
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
      source?: "custom" | "derived";
      hotspot?: SheetHotspot;
      metadata?: SheetActionMetadata;
    }
  | {
      id: string;
      type: "nwod-check";
      label: string;
      attribute: NwodAttributeKey;
      skill?: NwodSkillKey;
      modifier?: number;
      again?: 8 | 9 | 10 | null;
      rote?: boolean;
      chanceDie?: boolean;
      notes?: string;
      source?: "custom" | "derived";
      hotspot?: SheetHotspot;
      metadata?: SheetActionMetadata;
    }
  | {
      id: string;
      type: "note";
      label: string;
      notes: string;
      source?: "custom" | "derived";
      hotspot?: SheetHotspot;
      metadata?: SheetActionMetadata;
    };

export type InventoryItemPowerReset = "short_rest" | "long_rest" | "session" | "never";

export type InventoryItemPower = {
  id: string;
  label: string;
  description?: string;
  action: SheetAction;
  charges?: {
    current: number;
    max: number;
    reset?: InventoryItemPowerReset;
  };
  consumesItem?: boolean;
};

export type InventoryItem = {
  id: string;
  codexEntryId?: string;
  name: string;
  quantity: number;
  equipped?: boolean;
  rarity?: string;
  notes?: string;
  powers?: InventoryItemPower[];
  sourceCodexEntryId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type CharacterInventoryItem = InventoryItem;

export type CurrencyWallet = {
  gp?: number;
  sp?: number;
  cp?: number;
  xp?: number;
  custom?: Record<string, number>;
};

export type RewardTransaction = {
  id: string;
  characterId: string;
  source?: string;
  type: "currency" | "item" | "xp" | "codex" | "manual";
  description: string;
  delta: Record<string, unknown>;
  createdAt: string;
};

export type CharacterProgression = {
  level?: number;
  xp?: number;
  milestones?: string[];
};

export type ActiveCondition = {
  id: string;
  codexEntryId?: string;
  name: string;
  description?: string;
  source?: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type SystemSheet = {
  system: GameSystem;
  label?: string;
  levelLabel?: string;
  sheetImage?: string;
  attributes?: Dnd5eAttributes | NwodAttributes;
  stats?: Dnd5eStats | NwodStats;
  skills?: Dnd5eSkills | NwodSkills;
  actions: SheetAction[];
  metadata?: Record<string, string | number | boolean | null>;
};

export type CharacterProfile = {
  id: string;
  ownerUserId?: string;
  ownerLabel?: string;
  characterKind?: CharacterKind;
  name: string;
  subtitle?: string;
  concept?: string;
  portraitImage?: string;
  defaultSystem: GameSystem;
  sheets: Partial<Record<GameSystem, SystemSheet>>;
  inventory: InventoryItem[];
  wallet: CurrencyWallet;
  rewardHistory: RewardTransaction[];
  progression?: CharacterProgression;
  conditions: ActiveCondition[];
  createdAt?: string;
  updatedAt?: string;
};

export type RollLogEntryKind = "roll" | "note" | "system";

export type RollLogEntry = {
  id: string;
  kind?: RollLogEntryKind;
  characterName?: string;
  actionLabel?: string;
  system?: GameSystem;
  expression?: string;
  resultText: string;
  details?: string;
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

export function isDnd5eSheet(sheet: SystemSheet): sheet is SystemSheet & {
  attributes?: Dnd5eAttributes;
  stats?: Dnd5eStats;
  skills?: Dnd5eSkills;
} {
  return sheet.system === "dnd5e";
}

export function isNwodSheet(sheet: SystemSheet): sheet is SystemSheet & {
  attributes?: NwodAttributes;
  stats?: NwodStats;
  skills?: NwodSkills;
} {
  return sheet.system === "nwod";
}
