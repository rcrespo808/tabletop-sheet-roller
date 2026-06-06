import { getCurrentAuthState } from "@/lib/auth/supabaseAuth";
import {
  createMarketTransaction,
  getMarket,
  saveMarket
} from "@/lib/markets/marketRepository";
import {
  getTable,
  listTableAssignments,
  listTableMembers
} from "@/lib/session/gameTableRepository";
import { resolveSeatRole } from "@/lib/session/resolveSeatRole";
import {
  applyWalletDelta,
  canAffordPrice,
  marketPriceToDelta,
  totalMarketPrice
} from "@/lib/markets/pricing";
import type {
  Market,
  MarketStockItem,
  MarketStore,
  MarketTransaction,
  MarketTransactionResult
} from "@/lib/markets/types";
import type { CharacterProfile, InventoryItem, RewardTransaction } from "@/lib/sheets/types";
import { getCharacter, saveCharacter } from "@/lib/storage/characterRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";

type BuyMarketItemArgs = {
  marketId: string;
  storeId: string;
  stockItemId: string;
  characterId: string;
  quantity?: number;
};

type SellInventoryItemArgs = {
  marketId: string;
  storeId: string;
  characterId: string;
  inventoryItemId: string;
  quantity?: number;
  price: MarketTransaction["price"];
  addToStoreStock?: boolean;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function positiveQuantity(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

function cloneItemForQuantity(item: InventoryItem, quantity: number): InventoryItem {
  return {
    ...item,
    id: item.id || newId("item"),
    quantity
  };
}

function appendOrIncrementInventory(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const index = inventory.findIndex((existing) => {
    const sameCodex =
      item.codexEntryId &&
      (existing.codexEntryId === item.codexEntryId ||
        existing.sourceCodexEntryId === item.codexEntryId);
    const sameSource =
      item.sourceCodexEntryId &&
      (existing.sourceCodexEntryId === item.sourceCodexEntryId ||
        existing.codexEntryId === item.sourceCodexEntryId);

    return (
      existing.id === item.id ||
      sameCodex ||
      sameSource ||
      existing.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
  });

  if (index === -1) return [...inventory, item];

  return inventory.map((existing, existingIndex) =>
    existingIndex === index
      ? {
          ...existing,
          quantity: (existing.quantity ?? 0) + item.quantity,
          metadata: {
            ...(existing.metadata ?? {}),
            ...(item.metadata ?? {})
          }
        }
      : existing
  );
}

function removeInventoryQuantity(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number
): { inventory: InventoryItem[]; item: InventoryItem } {
  const item = inventory.find((entry) => entry.id === itemId);
  if (!item) throw new Error("Inventory item not found.");
  if ((item.quantity ?? 0) < quantity) throw new Error("Character does not own enough of that item.");

  return {
    item: cloneItemForQuantity(item, quantity),
    inventory: inventory
      .map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              quantity: (entry.quantity ?? 0) - quantity
            }
          : entry
      )
      .filter((entry) => (entry.quantity ?? 0) > 0)
  };
}

function findStore(market: Market, storeId: string): MarketStore {
  const store = market.stores.find((entry) => entry.id === storeId);
  if (!store) throw new Error("Store not found.");
  return store;
}

function findStock(store: MarketStore, stockItemId: string): MarketStockItem {
  const stock = store.stock.find((entry) => entry.id === stockItemId);
  if (!stock) throw new Error("Stock item not found.");
  return stock;
}

function replaceStore(market: Market, store: MarketStore): Market {
  return {
    ...market,
    stores: market.stores.map((entry) => (entry.id === store.id ? store : entry))
  };
}

function decrementStock(store: MarketStore, stockItemId: string, quantity: number): MarketStore {
  return {
    ...store,
    stock: store.stock.map((entry) =>
      entry.id === stockItemId
        ? {
            ...entry,
            quantityAvailable: entry.quantityAvailable - quantity
          }
        : entry
    )
  };
}

function addStock(store: MarketStore, item: InventoryItem, price: MarketTransaction["price"]): MarketStore {
  const existingIndex = store.stock.findIndex(
    (entry) => entry.item.name.trim().toLowerCase() === item.name.trim().toLowerCase()
  );

  if (existingIndex === -1) {
    return {
      ...store,
      stock: [
        ...store.stock,
        {
          id: newId("stock"),
          item,
          price,
          quantityAvailable: item.quantity,
          rarity: item.rarity as MarketStockItem["rarity"],
          tags: item.tags,
          source: "manual"
        }
      ]
    };
  }

  return {
    ...store,
    stock: store.stock.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            quantityAvailable: entry.quantityAvailable + item.quantity
          }
        : entry
    )
  };
}

function makeRewardHistoryEntry(
  character: CharacterProfile,
  input: Omit<RewardTransaction, "id" | "characterId" | "createdAt">
): RewardTransaction {
  return {
    ...input,
    id: newId("market-reward"),
    characterId: character.id,
    createdAt: new Date().toISOString()
  };
}

async function assertCanTransact(characterId: string, marketGameTableId?: string): Promise<string> {
  const authState = await getCurrentAuthState();
  const userId = authState.user?.id;
  if (!userId) throw new Error("Sign in to complete market transactions.");

  if (!isSupabaseConfigured()) {
    return userId;
  }

  if (marketGameTableId) {
    const [table, members, assignments] = await Promise.all([
      getTable(marketGameTableId),
      listTableMembers(marketGameTableId),
      listTableAssignments(marketGameTableId)
    ]);
    const role = resolveSeatRole({
      gameTableId: marketGameTableId,
      userId,
      profile: authState.profile,
      table,
      members
    });
    if (role === "gm") return userId;
    const assigned = assignments.some(
      (assignment) => assignment.userId === userId && assignment.characterId === characterId
    );
    if (assigned) return userId;
    throw new Error("You need an assigned character at this table to buy or sell here.");
  }

  const character = await getCharacter(characterId);
  if (character?.ownerUserId === userId) return userId;

  throw new Error("You need an assigned character at this table to buy or sell here.");
}

export async function buyMarketItem(args: BuyMarketItemArgs): Promise<MarketTransactionResult> {
  const quantity = positiveQuantity(args.quantity);
  const market = await getMarket(args.marketId);
  if (!market) throw new Error("Market not found.");
  if (market.status !== "open") throw new Error("Closed or draft markets cannot be used for transactions.");

  const userId = await assertCanTransact(args.characterId, market.gameTableId);

  const store = findStore(market, args.storeId);
  const stock = findStock(store, args.stockItemId);
  if (stock.hidden) throw new Error("That item is not available.");
  if (stock.requiresGmApproval) throw new Error("That item requires GM approval.");
  if (stock.quantityAvailable < quantity) throw new Error("Not enough stock available.");

  const character = await getCharacter(args.characterId);
  if (!character) throw new Error("Character not found.");

  const price = totalMarketPrice(stock.price, quantity);
  if (!canAffordPrice(character.wallet ?? {}, price)) {
    throw new Error("Character cannot afford that purchase.");
  }

  const purchasedItem = cloneItemForQuantity(stock.item, quantity);
  const nextCharacter: CharacterProfile = {
    ...character,
    wallet: applyWalletDelta(character.wallet ?? {}, marketPriceToDelta(price, -1)),
    inventory: appendOrIncrementInventory(character.inventory ?? [], purchasedItem),
    rewardHistory: [
      makeRewardHistoryEntry(character, {
        type: "item",
        source: `Market: ${market.name}`,
        description: `Bought ${quantity}x ${stock.item.name} from ${store.name}`,
        delta: {
          marketId: market.id,
          storeId: store.id,
          type: "buy",
          item: purchasedItem,
          price
        }
      }),
      ...(character.rewardHistory ?? [])
    ]
  };

  const nextMarket = replaceStore(market, decrementStock(store, stock.id, quantity));
  const savedCharacter = await saveCharacter(nextCharacter);
  const savedMarket = await saveMarket(nextMarket);
  const transaction = await createMarketTransaction({
    id: newId("market-transaction"),
    marketId: market.id,
    storeId: store.id,
    characterId: character.id,
    userId,
    type: "buy",
    itemName: stock.item.name,
    item: purchasedItem,
    quantity,
    price,
    createdAt: new Date().toISOString()
  });

  return { character: savedCharacter, market: savedMarket, transaction };
}

export async function sellInventoryItem(args: SellInventoryItemArgs): Promise<MarketTransactionResult> {
  const quantity = positiveQuantity(args.quantity);
  const market = await getMarket(args.marketId);
  if (!market) throw new Error("Market not found.");
  if (market.status !== "open") throw new Error("Closed or draft markets cannot be used for transactions.");

  const userId = await assertCanTransact(args.characterId, market.gameTableId);

  const store = findStore(market, args.storeId);
  const character = await getCharacter(args.characterId);
  if (!character) throw new Error("Character not found.");

  const { inventory, item } = removeInventoryQuantity(character.inventory ?? [], args.inventoryItemId, quantity);
  const price = totalMarketPrice(args.price, quantity);
  const nextCharacter: CharacterProfile = {
    ...character,
    wallet: applyWalletDelta(character.wallet ?? {}, marketPriceToDelta(price, 1)),
    inventory,
    rewardHistory: [
      makeRewardHistoryEntry(character, {
        type: "currency",
        source: `Market: ${market.name}`,
        description: `Sold ${quantity}x ${item.name} to ${store.name}`,
        delta: {
          marketId: market.id,
          storeId: store.id,
          type: "sell",
          item,
          price
        }
      }),
      ...(character.rewardHistory ?? [])
    ]
  };

  const nextMarket = args.addToStoreStock ? replaceStore(market, addStock(store, item, args.price)) : market;
  const savedCharacter = await saveCharacter(nextCharacter);
  const savedMarket = await saveMarket(nextMarket);
  const transaction = await createMarketTransaction({
    id: newId("market-transaction"),
    marketId: market.id,
    storeId: store.id,
    characterId: character.id,
    userId,
    type: "sell",
    itemName: item.name,
    item,
    quantity,
    price,
    createdAt: new Date().toISOString()
  });

  return { character: savedCharacter, market: savedMarket, transaction };
}
