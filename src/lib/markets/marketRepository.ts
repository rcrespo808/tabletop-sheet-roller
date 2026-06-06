import { starterMarkets } from "@/data/markets/starterMarkets";
import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import { LOCAL_DEMO_CAMPAIGN_ID, SUPABASE_STARTER_LOOT_CAMPAIGN_ID } from "@/lib/loot/types";
import { normalizeMarketPrice } from "@/lib/markets/pricing";
import type {
  ItemRarity,
  Market,
  MarketStatus,
  MarketStockItem,
  MarketStore,
  MarketTransaction,
  StoreTheme
} from "@/lib/markets/types";
import { normalizeInventoryItem } from "@/lib/sheets/inventory";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";

const MARKET_STORAGE_KEY = "tsr.markets.v1";
const MARKET_TRANSACTION_STORAGE_KEY = "tsr.marketTransactions.v1";

export const DEFAULT_MARKET_GAME_TABLE_ID = isSupabaseConfigured()
  ? SUPABASE_STARTER_LOOT_CAMPAIGN_ID
  : LOCAL_DEMO_CAMPAIGN_ID;

type MarketRow = {
  id: string;
  game_table_id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: MarketStatus;
  stores: unknown;
  metadata: unknown;
  created_by: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MarketTransactionRow = {
  id: string;
  market_id: string;
  store_id: string;
  character_id: string;
  user_id: string | null;
  type: "buy" | "sell";
  item_name: string;
  item: unknown;
  quantity: number;
  price: unknown;
  created_at: string;
};

let lastMarketStorageMode: StorageMode = isSupabaseConfigured() ? "supabase" : "local";

export function getMarketStorageMode(): StorageMode {
  return lastMarketStorageMode;
}

function isStatus(value: unknown): value is MarketStatus {
  return value === "draft" || value === "open" || value === "closed";
}

function isTheme(value: unknown): value is StoreTheme {
  return (
    value === "general" ||
    value === "blacksmith" ||
    value === "apothecary" ||
    value === "arcane" ||
    value === "temple" ||
    value === "black_market" ||
    value === "faction" ||
    value === "salvage" ||
    value === "custom"
  );
}

function isRarity(value: unknown): value is ItemRarity {
  return (
    value === "common" ||
    value === "uncommon" ||
    value === "rare" ||
    value === "very_rare" ||
    value === "legendary" ||
    value === "unique"
  );
}

function safeRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeStockItem(value: unknown, fallbackIndex = 0): MarketStockItem | null {
  const input = safeRecord(value);
  if (!input) return null;
  const item = normalizeInventoryItem(input.item, fallbackIndex);
  if (!item) return null;

  return {
    id: typeof input.id === "string" && input.id ? input.id : crypto.randomUUID(),
    item,
    price: normalizeMarketPrice(safeRecord(input.price) as MarketStockItem["price"] | undefined),
    quantityAvailable: Math.max(0, Math.floor(numeric(input.quantityAvailable, 1))),
    rarity: isRarity(input.rarity) ? input.rarity : isRarity(item.rarity) ? item.rarity : undefined,
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string")
      : item.tags,
    source:
      input.source === "manual" ||
      input.source === "loot_table" ||
      input.source === "codex" ||
      input.source === "generated"
        ? input.source
        : "manual",
    sourceId: typeof input.sourceId === "string" ? input.sourceId : undefined,
    hidden: typeof input.hidden === "boolean" ? input.hidden : undefined,
    requiresGmApproval:
      typeof input.requiresGmApproval === "boolean" ? input.requiresGmApproval : undefined
  };
}

function normalizeStore(value: unknown, fallbackIndex = 0): MarketStore | null {
  const input = safeRecord(value);
  if (!input || typeof input.name !== "string" || !input.name.trim()) return null;

  return {
    id: typeof input.id === "string" && input.id ? input.id : crypto.randomUUID(),
    name: input.name.trim(),
    theme: isTheme(input.theme) ? input.theme : "general",
    description: typeof input.description === "string" && input.description.trim() ? input.description : undefined,
    quality: Math.min(5, Math.max(1, Math.floor(numeric(input.quality, 3)))),
    scarcity: Math.min(5, Math.max(1, Math.floor(numeric(input.scarcity, 3)))),
    meanRarity: isRarity(input.meanRarity) ? input.meanRarity : undefined,
    priceMultiplier: numeric(input.priceMultiplier, 1),
    sellMultiplier: numeric(input.sellMultiplier, 0.5),
    stock: Array.isArray(input.stock)
      ? input.stock
          .map((item, index) => normalizeStockItem(item, index))
          .filter((item): item is MarketStockItem => Boolean(item))
      : [],
    restockRules: safeRecord(input.restockRules) as MarketStore["restockRules"] | undefined,
    metadata: safeRecord(input.metadata)
  };
}

export function normalizeMarket(market: Market, options: { touchUpdatedAt?: boolean } = {}): Market {
  const now = new Date().toISOString();
  return {
    ...market,
    id: market.id || crypto.randomUUID(),
    gameTableId: market.gameTableId || DEFAULT_MARKET_GAME_TABLE_ID,
    name: market.name.trim(),
    description: market.description?.trim() || undefined,
    location: market.location?.trim() || undefined,
    status: isStatus(market.status) ? market.status : "draft",
    stores: (market.stores ?? [])
      .map((store, index) => normalizeStore(store, index))
      .filter((store): store is MarketStore => Boolean(store)),
    metadata: market.metadata ?? {},
    createdAt: market.createdAt ?? now,
    updatedAt: options.touchUpdatedAt ? now : market.updatedAt ?? now
  };
}

function rowToMarket(row: MarketRow): Market {
  return normalizeMarket({
    id: row.id,
    gameTableId: row.game_table_id,
    name: row.name,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    status: row.status,
    stores: Array.isArray(row.stores) ? row.stores : [],
    metadata: safeRecord(row.metadata) ?? {},
    createdBy: row.created_by ?? undefined,
    openedAt: row.opened_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

async function marketToUpsert(market: Market) {
  const authState = await getCurrentAuthState();
  return {
    id: market.id || crypto.randomUUID(),
    game_table_id: market.gameTableId || DEFAULT_MARKET_GAME_TABLE_ID,
    name: market.name.trim(),
    description: market.description?.trim() || null,
    location: market.location?.trim() || null,
    status: market.status,
    stores: market.stores ?? [],
    metadata: market.metadata ?? {},
    created_by: market.createdBy ?? authState.user?.id ?? null,
    opened_at: market.openedAt ?? null,
    closed_at: market.closedAt ?? null
  };
}

function rowToTransaction(row: MarketTransactionRow): MarketTransaction {
  const item = normalizeInventoryItem(row.item);
  return {
    id: row.id,
    marketId: row.market_id,
    storeId: row.store_id,
    characterId: row.character_id,
    userId: row.user_id ?? undefined,
    type: row.type,
    itemName: row.item_name,
    item: item ?? undefined,
    quantity: row.quantity,
    price: normalizeMarketPrice(safeRecord(row.price) as MarketTransaction["price"] | undefined),
    createdAt: row.created_at
  };
}

function transactionToInsert(transaction: MarketTransaction) {
  return {
    id: transaction.id || crypto.randomUUID(),
    market_id: transaction.marketId,
    store_id: transaction.storeId,
    character_id: transaction.characterId,
    user_id: transaction.userId ?? null,
    type: transaction.type,
    item_name: transaction.itemName,
    item: transaction.item ?? null,
    quantity: transaction.quantity,
    price: transaction.price
  };
}

function readLocalMarkets(): Market[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(MARKET_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((market): market is Market => {
        return Boolean(market && typeof market === "object" && typeof market.id === "string");
      })
      .map((market) => normalizeMarket(market));
  } catch {
    return [];
  }
}

function writeLocalMarkets(markets: Market[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(markets.map((market) => normalizeMarket(market))));
}

function readLocalTransactions(): MarketTransaction[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(MARKET_TRANSACTION_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((transaction): transaction is MarketTransaction => {
      return Boolean(
        transaction &&
          typeof transaction === "object" &&
          typeof transaction.id === "string" &&
          typeof transaction.marketId === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeLocalTransactions(transactions: MarketTransaction[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MARKET_TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
}

function mergeMarkets(primary: Market[], fallback: Market[]): Market[] {
  const merged = new Map<string, Market>();
  for (const market of fallback) merged.set(market.id, market);
  for (const market of primary) merged.set(market.id, market);
  return Array.from(merged.values()).sort((a, b) =>
    (b.updatedAt ?? b.createdAt ?? b.name).localeCompare(a.updatedAt ?? a.createdAt ?? a.name)
  );
}

function duplicateKey(market: Pick<Market, "gameTableId" | "name">): string {
  return `${market.gameTableId || DEFAULT_MARKET_GAME_TABLE_ID}|${market.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

async function listSupabaseMarkets(gameTableId: string): Promise<Market[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("markets")
    .select("*")
    .eq("game_table_id", gameTableId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as MarketRow[]).map(rowToMarket);
}

async function getSupabaseMarket(id: string): Promise<Market | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("markets").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToMarket(data as MarketRow) : null;
}

async function saveSupabaseMarket(market: Market): Promise<Market> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const payload = await marketToUpsert(market);
  const { data, error } = await client.from("markets").upsert(payload).select("*").single();
  if (error) throw error;
  return rowToMarket(data as MarketRow);
}

async function deleteSupabaseMarket(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("markets").delete().eq("id", id);
  if (error) throw error;
}

async function listSupabaseTransactions(marketId: string): Promise<MarketTransaction[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("market_transactions")
    .select("*")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as MarketTransactionRow[]).map(rowToTransaction);
}

async function createSupabaseTransaction(transaction: MarketTransaction): Promise<MarketTransaction> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { data, error } = await client
    .from("market_transactions")
    .insert(transactionToInsert(transaction))
    .select("*")
    .single();

  if (error) throw error;
  return rowToTransaction(data as MarketTransactionRow);
}

export async function listMarkets(gameTableId = DEFAULT_MARKET_GAME_TABLE_ID): Promise<Market[]> {
  if (isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_CAMPAIGN_ID) {
    try {
      const remote = await listSupabaseMarkets(gameTableId);
      lastMarketStorageMode = "supabase";
      return mergeMarkets(remote, readLocalMarkets().filter((market) => market.gameTableId === gameTableId));
    } catch (error) {
      console.warn("[marketRepository] Supabase list failed, using local storage.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  } else {
    lastMarketStorageMode = "local";
  }

  return readLocalMarkets().filter((market) => market.gameTableId === gameTableId);
}

export async function getMarket(id: string): Promise<Market | null> {
  const local = readLocalMarkets().find((market) => market.id === id) ?? null;
  if (local) return local;

  if (isSupabaseConfigured()) {
    try {
      const remote = await getSupabaseMarket(id);
      if (remote) {
        lastMarketStorageMode = "supabase";
        return remote;
      }
    } catch (error) {
      console.warn("[marketRepository] Supabase get failed, using local storage.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  } else {
    lastMarketStorageMode = "local";
  }

  return null;
}

export async function saveMarket(market: Market): Promise<Market> {
  const normalized = normalizeMarket(market, { touchUpdatedAt: true });
  let saved = normalized;

  if (isSupabaseConfigured() && normalized.gameTableId !== LOCAL_DEMO_CAMPAIGN_ID) {
    try {
      saved = await saveSupabaseMarket(normalized);
      lastMarketStorageMode = "supabase";
    } catch (error) {
      console.warn("[marketRepository] Supabase save failed, caching locally.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  } else {
    lastMarketStorageMode = "local";
  }

  const local = readLocalMarkets().filter((entry) => entry.id !== saved.id);
  writeLocalMarkets([...local, saved]);
  return saved;
}

export async function deleteMarket(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseMarket(id);
      lastMarketStorageMode = "supabase";
    } catch (error) {
      console.warn("[marketRepository] Supabase delete failed, removing locally.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  } else {
    lastMarketStorageMode = "local";
  }

  writeLocalMarkets(readLocalMarkets().filter((market) => market.id !== id));
  writeLocalTransactions(readLocalTransactions().filter((transaction) => transaction.marketId !== id));
}

export async function openMarket(id: string): Promise<Market> {
  const market = await getMarket(id);
  if (!market) throw new Error("Market not found.");
  return saveMarket({
    ...market,
    status: "open",
    openedAt: market.openedAt ?? new Date().toISOString(),
    closedAt: undefined
  });
}

export async function closeMarket(id: string): Promise<Market> {
  const market = await getMarket(id);
  if (!market) throw new Error("Market not found.");
  return saveMarket({
    ...market,
    status: "closed",
    closedAt: new Date().toISOString()
  });
}

export async function listMarketTransactions(marketId: string): Promise<MarketTransaction[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await listSupabaseTransactions(marketId);
      lastMarketStorageMode = "supabase";
      return [...remote, ...readLocalTransactions().filter((transaction) => transaction.marketId === marketId)];
    } catch (error) {
      console.warn("[marketRepository] Supabase transactions failed, using local storage.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  }

  return readLocalTransactions()
    .filter((transaction) => transaction.marketId === marketId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createMarketTransaction(
  transaction: MarketTransaction
): Promise<MarketTransaction> {
  let saved = transaction;

  if (isSupabaseConfigured()) {
    try {
      saved = await createSupabaseTransaction(transaction);
      lastMarketStorageMode = "supabase";
    } catch (error) {
      console.warn("[marketRepository] Supabase transaction insert failed, caching locally.", error);
      lastMarketStorageMode = "supabase-fallback";
    }
  }

  const local = readLocalTransactions().filter((entry) => entry.id !== saved.id);
  writeLocalTransactions([saved, ...local]);
  return saved;
}

export async function importMarkets(
  markets: Market[],
  gameTableId = DEFAULT_MARKET_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  const existing = await listMarkets(gameTableId);
  const seen = new Set(existing.map(duplicateKey));
  let inserted = 0;
  let skipped = 0;

  for (const market of markets) {
    const candidate = normalizeMarket({
      ...market,
      id: isSupabaseConfigured() && gameTableId !== LOCAL_DEMO_CAMPAIGN_ID ? crypto.randomUUID() : market.id,
      gameTableId
    });
    const key = duplicateKey(candidate);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }

    await saveMarket(candidate);
    seen.add(key);
    inserted += 1;
  }

  return { inserted, skipped };
}

export async function importStarterMarkets(
  gameTableId = DEFAULT_MARKET_GAME_TABLE_ID
): Promise<{ inserted: number; skipped: number }> {
  return importMarkets(starterMarkets, gameTableId);
}
