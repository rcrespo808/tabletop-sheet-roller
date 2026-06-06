import type { CharacterProfile, InventoryItem } from "@/lib/sheets/types";

export type MarketStatus = "draft" | "open" | "closed";

export type StoreTheme =
  | "general"
  | "blacksmith"
  | "apothecary"
  | "arcane"
  | "temple"
  | "black_market"
  | "faction"
  | "salvage"
  | "custom";

export type ItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare"
  | "legendary"
  | "unique";

export type Market = {
  id: string;
  gameTableId: string;
  name: string;
  description?: string;
  location?: string;
  status: MarketStatus;
  openedAt?: string;
  closedAt?: string;
  createdBy?: string;
  stores: MarketStore[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type MarketStore = {
  id: string;
  name: string;
  theme: StoreTheme;
  description?: string;
  quality: number;
  scarcity: number;
  meanRarity?: ItemRarity;
  priceMultiplier: number;
  sellMultiplier: number;
  stock: MarketStockItem[];
  restockRules?: MarketRestockRules;
  metadata?: Record<string, unknown>;
};

export type MarketStockItem = {
  id: string;
  item: InventoryItem;
  price: MarketPrice;
  quantityAvailable: number;
  rarity?: ItemRarity;
  tags?: string[];
  source?: "manual" | "loot_table" | "codex" | "generated";
  sourceId?: string;
  hidden?: boolean;
  requiresGmApproval?: boolean;
};

export type MarketPrice = {
  gp?: number;
  sp?: number;
  cp?: number;
  custom?: Record<string, number>;
};

export type MarketRestockRules = {
  mode: "manual" | "from_loot_table" | "generated";
  lootTableIds?: string[];
  stockCount?: number;
  rarityBias?: Partial<Record<ItemRarity, number>>;
  tagFilters?: string[];
};

export type MarketTransaction = {
  id: string;
  marketId: string;
  storeId: string;
  characterId: string;
  userId?: string;
  type: "buy" | "sell";
  itemName: string;
  item?: InventoryItem;
  quantity: number;
  price: MarketPrice;
  createdAt: string;
};

export type MarketTransactionResult = {
  character: CharacterProfile;
  market: Market;
  transaction: MarketTransaction;
};

export const MARKET_THEMES: StoreTheme[] = [
  "general",
  "blacksmith",
  "apothecary",
  "arcane",
  "temple",
  "black_market",
  "faction",
  "salvage",
  "custom"
];

export const ITEM_RARITIES: ItemRarity[] = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "legendary",
  "unique"
];
