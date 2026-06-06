"use client";

import Link from "next/link";
import {
  BookOpen,
  Coins,
  FileText,
  Gift,
  Home,
  PackagePlus,
  Save,
  ShoppingBag,
  Store,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CampaignShell } from "@/components/campaign/CampaignShell";
import { MasterDetailLayout } from "@/components/campaign/MasterDetailLayout";
import type { SeatMode } from "@/components/campaign/SeatModeTabs";
import { GlassPanel } from "@/components/GlassPanel";
import { canBuyFromMarket } from "@/lib/session/permissions";
import { useCampaignSeat } from "@/lib/session/useCampaignSeat";
import {
  closeMarket,
  DEFAULT_MARKET_GAME_TABLE_ID,
  deleteMarket,
  getMarketStorageMode,
  importStarterMarkets,
  listMarketTransactions,
  listMarkets,
  openMarket,
  saveMarket
} from "@/lib/markets/marketRepository";
import { buyMarketItem, sellInventoryItem } from "@/lib/markets/marketTransactions";
import { describeMarketPrice, normalizeMarketPrice } from "@/lib/markets/pricing";
import type {
  ItemRarity,
  Market,
  MarketPrice,
  MarketStockItem,
  MarketStore,
  MarketTransaction,
  StoreTheme
} from "@/lib/markets/types";
import { ITEM_RARITIES, MARKET_THEMES } from "@/lib/markets/types";
import { normalizeInventoryItem } from "@/lib/sheets/inventory";
import type { CharacterProfile, InventoryItem } from "@/lib/sheets/types";
import { useActiveTableId } from "@/lib/session/useActiveTableId";
import { listCharacters } from "@/lib/storage/characterRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { StorageMode } from "@/lib/storage/types";
import type { AuthState } from "@/lib/auth/supabaseAuth";

type MarketFormState = {
  name: string;
  description: string;
  location: string;
};

type StoreFormState = {
  id: string;
  name: string;
  theme: StoreTheme;
  description: string;
  quality: string;
  scarcity: string;
  meanRarity: "" | ItemRarity;
  priceMultiplier: string;
  sellMultiplier: string;
};

type StockFormState = {
  id: string;
  name: string;
  notes: string;
  itemQuantity: string;
  quantityAvailable: string;
  rarity: "" | ItemRarity;
  tags: string;
  gp: string;
  sp: string;
  cp: string;
  customKey: string;
  customAmount: string;
  itemJson: string;
};

type SellFormState = {
  inventoryItemId: string;
  quantity: string;
  gp: string;
  sp: string;
  cp: string;
  customKey: string;
  customAmount: string;
  addToStoreStock: boolean;
};

const EMPTY_MARKET_FORM: MarketFormState = {
  name: "",
  description: "",
  location: ""
};

const EMPTY_STORE_FORM: StoreFormState = {
  id: "",
  name: "",
  theme: "general",
  description: "",
  quality: "3",
  scarcity: "3",
  meanRarity: "",
  priceMultiplier: "1",
  sellMultiplier: "0.5"
};

function defaultItemJson(): string {
  return JSON.stringify(
    {
      id: "market-item",
      name: "Market Item",
      quantity: 1,
      rarity: "common",
      notes: "",
      tags: []
    },
    null,
    2
  );
}

const EMPTY_STOCK_FORM: StockFormState = {
  id: "",
  name: "",
  notes: "",
  itemQuantity: "1",
  quantityAvailable: "1",
  rarity: "",
  tags: "",
  gp: "1",
  sp: "",
  cp: "",
  customKey: "",
  customAmount: "",
  itemJson: defaultItemJson()
};

const EMPTY_SELL_FORM: SellFormState = {
  inventoryItemId: "",
  quantity: "1",
  gp: "1",
  sp: "",
  cp: "",
  customKey: "",
  customAmount: "",
  addToStoreStock: true
};

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function numericInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function priceFromForm(form: Pick<StockFormState | SellFormState, "gp" | "sp" | "cp" | "customKey" | "customAmount">): MarketPrice {
  const customAmount = numericInput(form.customAmount, 0);
  const custom =
    form.customKey.trim() && customAmount
      ? { [form.customKey.trim().toLowerCase()]: customAmount }
      : undefined;

  return normalizeMarketPrice({
    gp: numericInput(form.gp, 0) || undefined,
    sp: numericInput(form.sp, 0) || undefined,
    cp: numericInput(form.cp, 0) || undefined,
    custom
  });
}

function priceToForm(price: MarketPrice): Pick<StockFormState, "gp" | "sp" | "cp" | "customKey" | "customAmount"> {
  const customEntry = Object.entries(price.custom ?? {})[0];
  return {
    gp: price.gp ? String(price.gp) : "",
    sp: price.sp ? String(price.sp) : "",
    cp: price.cp ? String(price.cp) : "",
    customKey: customEntry?.[0] ?? "",
    customAmount: customEntry ? String(customEntry[1]) : ""
  };
}

function storeToForm(store: MarketStore): StoreFormState {
  return {
    id: store.id,
    name: store.name,
    theme: store.theme,
    description: store.description ?? "",
    quality: String(store.quality),
    scarcity: String(store.scarcity),
    meanRarity: store.meanRarity ?? "",
    priceMultiplier: String(store.priceMultiplier),
    sellMultiplier: String(store.sellMultiplier)
  };
}

function stockToForm(stock: MarketStockItem): StockFormState {
  const price = priceToForm(stock.price);
  return {
    id: stock.id,
    name: stock.item.name,
    notes: stock.item.notes ?? "",
    itemQuantity: String(stock.item.quantity ?? 1),
    quantityAvailable: String(stock.quantityAvailable),
    rarity: stock.rarity ?? "",
    tags: (stock.tags ?? stock.item.tags ?? []).join(", "),
    gp: price.gp,
    sp: price.sp,
    cp: price.cp,
    customKey: price.customKey,
    customAmount: price.customAmount,
    itemJson: JSON.stringify(stock.item, null, 2)
  };
}

function buildStore(form: StoreFormState): MarketStore {
  if (!form.name.trim()) throw new Error("Store name is required.");
  return {
    id: form.id || crypto.randomUUID(),
    name: form.name.trim(),
    theme: form.theme,
    description: form.description.trim() || undefined,
    quality: Math.min(5, Math.max(1, Math.floor(numericInput(form.quality, 3)))),
    scarcity: Math.min(5, Math.max(1, Math.floor(numericInput(form.scarcity, 3)))),
    meanRarity: form.meanRarity || undefined,
    priceMultiplier: numericInput(form.priceMultiplier, 1),
    sellMultiplier: numericInput(form.sellMultiplier, 0.5),
    stock: []
  };
}

function buildStock(form: StockFormState): MarketStockItem {
  const parsed = JSON.parse(form.itemJson) as InventoryItem;
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const item = normalizeInventoryItem({
    ...parsed,
    id: parsed.id || form.id || crypto.randomUUID(),
    name: form.name.trim() || parsed.name,
    quantity: Math.max(1, Math.floor(numericInput(form.itemQuantity, parsed.quantity ?? 1))),
    rarity: form.rarity || parsed.rarity,
    notes: form.notes.trim() || parsed.notes,
    tags: tags.length > 0 ? tags : parsed.tags
  });

  if (!item?.name) throw new Error("Stock item needs a valid inventory item.");

  return {
    id: form.id || crypto.randomUUID(),
    item,
    price: priceFromForm(form),
    quantityAvailable: Math.max(0, Math.floor(numericInput(form.quantityAvailable, 1))),
    rarity: form.rarity || (item.rarity as ItemRarity | undefined),
    tags: tags.length > 0 ? tags : item.tags,
    source: "manual"
  };
}

function walletLabel(character: CharacterProfile | undefined): string {
  if (!character) return "";
  const wallet = character.wallet ?? {};
  const rows = [
    wallet.gp ? `${wallet.gp} GP` : "",
    wallet.sp ? `${wallet.sp} SP` : "",
    wallet.cp ? `${wallet.cp} CP` : "",
    ...Object.entries(wallet.custom ?? {}).map(([key, value]) => `${value} ${key.toUpperCase()}`)
  ].filter(Boolean);
  return rows.join(", ") || "No currency";
}

export default function MarketsPage() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const activeTableId = useActiveTableId();
  const gameTableId = activeTableId ?? DEFAULT_MARKET_GAME_TABLE_ID;
  const campaignSeat = useCampaignSeat(authState, { gameTableId });
  const [seatMode, setSeatMode] = useState<SeatMode>("play");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [transactions, setTransactions] = useState<MarketTransaction[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [marketForm, setMarketForm] = useState<MarketFormState>(EMPTY_MARKET_FORM);
  const [storeForm, setStoreForm] = useState<StoreFormState>(EMPTY_STORE_FORM);
  const [stockForm, setStockForm] = useState<StockFormState>(EMPTY_STOCK_FORM);
  const [sellForm, setSellForm] = useState<SellFormState>(EMPTY_SELL_FORM);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = campaignSeat.canManage;
  const isManageMode = seatMode === "manage" && canManage;
  const selectableCharacters = useMemo(() => {
    if (campaignSeat.controlledCharacterIds.length > 0) {
      return characters.filter((character) =>
        campaignSeat.controlledCharacterIds.includes(character.id)
      );
    }
    if (isManageMode) return characters;
    return characters.filter((character) => character.ownerUserId === authState.user?.id);
  }, [authState.user?.id, campaignSeat.controlledCharacterIds, characters, isManageMode]);
  const visibleMarkets = useMemo(
    () => (isManageMode ? markets : markets.filter((market) => market.status === "open")),
    [isManageMode, markets]
  );
  const selectedMarket = visibleMarkets.find((market) => market.id === selectedMarketId) ?? visibleMarkets[0];
  const selectedStore = selectedMarket?.stores.find((store) => store.id === selectedStoreId) ?? selectedMarket?.stores[0];
  const selectedCharacter =
    selectableCharacters.find((character) => character.id === selectedCharacterId) ??
    selectableCharacters[0];
  const canBuySelected = Boolean(
    selectedCharacter && canBuyFromMarket(campaignSeat.seatContext, selectedCharacter)
  );

  const refresh = useCallback(async () => {
    const [nextMarkets, nextCharacters] = await Promise.all([
      listMarkets(gameTableId),
      listCharacters()
    ]);
    setMarkets(nextMarkets);
    setCharacters(nextCharacters);
    setStorageMode(getMarketStorageMode());
    setSelectedMarketId((current) => current || nextMarkets[0]?.id || "");
    setSelectedCharacterId((current) => current || nextCharacters[0]?.id || "");
    setLoading(false);
  }, [gameTableId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMarkets(gameTableId), listCharacters()]).then(([nextMarkets, nextCharacters]) => {
      if (cancelled) return;
      setMarkets(nextMarkets);
      setCharacters(nextCharacters);
      setStorageMode(getMarketStorageMode());
      setSelectedMarketId((current) => current || nextMarkets[0]?.id || "");
      setSelectedCharacterId((current) => current || nextCharacters[0]?.id || "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [gameTableId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedMarket?.id) {
      Promise.resolve().then(() => {
        if (!cancelled) setTransactions([]);
      });
      return;
    }
    listMarketTransactions(selectedMarket.id).then((nextTransactions) => {
      if (!cancelled) setTransactions(nextTransactions);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMarket?.id]);

  function handleAuthChange(state: AuthState) {
    setAuthState(state);
    void refresh();
  }

  async function runAction(action: () => Promise<void>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      await refresh();
      if (selectedMarket?.id) setTransactions(await listMarketTransactions(selectedMarket.id));
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Market action failed.");
    }
  }

  async function createMarket() {
    await runAction(async () => {
      if (!marketForm.name.trim()) throw new Error("Market name is required.");
      const now = new Date().toISOString();
      const market: Market = {
        id: crypto.randomUUID(),
        gameTableId,
        name: marketForm.name.trim(),
        description: marketForm.description.trim() || undefined,
        location: marketForm.location.trim() || undefined,
        status: "draft",
        stores: [],
        metadata: {},
        createdAt: now,
        updatedAt: now
      };
      const saved = await saveMarket(market);
      setSelectedMarketId(saved.id);
      setMarketForm(EMPTY_MARKET_FORM);
    }, "Market created.");
  }

  async function importStarter() {
    await runAction(async () => {
      const result = await importStarterMarkets(gameTableId);
      setMessage(`Imported ${result.inserted}; skipped ${result.skipped}.`);
    }, "Starter market import complete.");
  }

  async function saveStoreForm() {
    if (!selectedMarket) return;
    await runAction(async () => {
      const store = buildStore(storeForm);
      const existing = selectedMarket.stores.find((entry) => entry.id === store.id);
      const nextStore = existing ? { ...store, stock: existing.stock } : store;
      const nextMarket: Market = {
        ...selectedMarket,
        stores: existing
          ? selectedMarket.stores.map((entry) => (entry.id === store.id ? nextStore : entry))
          : [...selectedMarket.stores, nextStore]
      };
      const saved = await saveMarket(nextMarket);
      setSelectedMarketId(saved.id);
      setSelectedStoreId(nextStore.id);
      setStoreForm(EMPTY_STORE_FORM);
    }, "Store saved.");
  }

  async function deleteStore(storeId: string) {
    if (!selectedMarket) return;
    await runAction(async () => {
      await saveMarket({
        ...selectedMarket,
        stores: selectedMarket.stores.filter((store) => store.id !== storeId)
      });
      setSelectedStoreId("");
    }, "Store deleted.");
  }

  async function saveStockForm() {
    if (!selectedMarket || !selectedStore) return;
    await runAction(async () => {
      const stock = buildStock(stockForm);
      const existing = selectedStore.stock.find((entry) => entry.id === stock.id);
      const nextStore: MarketStore = {
        ...selectedStore,
        stock: existing
          ? selectedStore.stock.map((entry) => (entry.id === stock.id ? stock : entry))
          : [...selectedStore.stock, stock]
      };
      await saveMarket({
        ...selectedMarket,
        stores: selectedMarket.stores.map((store) => (store.id === selectedStore.id ? nextStore : store))
      });
      setStockForm(EMPTY_STOCK_FORM);
    }, "Stock saved.");
  }

  async function deleteStock(stockId: string) {
    if (!selectedMarket || !selectedStore) return;
    await runAction(async () => {
      await saveMarket({
        ...selectedMarket,
        stores: selectedMarket.stores.map((store) =>
          store.id === selectedStore.id
            ? { ...store, stock: store.stock.filter((stock) => stock.id !== stockId) }
            : store
        )
      });
    }, "Stock deleted.");
  }

  async function buyStock(stock: MarketStockItem) {
    if (!selectedMarket || !selectedStore || !selectedCharacter) return;
    await runAction(async () => {
      const result = await buyMarketItem({
        marketId: selectedMarket.id,
        storeId: selectedStore.id,
        stockItemId: stock.id,
        characterId: selectedCharacter.id,
        quantity: 1
      });
      setSelectedMarketId(result.market.id);
    }, `Bought ${stock.item.name}.`);
  }

  async function sellItem() {
    if (!selectedMarket || !selectedStore || !selectedCharacter) return;
    await runAction(async () => {
      const item = selectedCharacter.inventory.find((entry) => entry.id === sellForm.inventoryItemId);
      if (!item) throw new Error("Choose an inventory item to sell.");
      const result = await sellInventoryItem({
        marketId: selectedMarket.id,
        storeId: selectedStore.id,
        characterId: selectedCharacter.id,
        inventoryItemId: item.id,
        quantity: numericInput(sellForm.quantity, 1),
        price: priceFromForm(sellForm),
        addToStoreStock: sellForm.addToStoreStock
      });
      setSelectedMarketId(result.market.id);
      setSellForm(EMPTY_SELL_FORM);
    }, "Item sold.");
  }

  return (
    <CampaignShell
      error={error}
      header={{
        icon: Coins,
        iconGradient: "from-amber-500 to-orange-700 shadow-amber-500/20",
        eyebrow: "Market",
        title: "Stores and Transactions",
        description:
          "Open a temporary market, manage store stock, then record permanent buy and sell transactions against character wallets and inventories.",
        storageMode,
        moduleLinks: [
          { href: "/", label: "Home", icon: Home },
          { href: "/codex", label: "Codex", icon: BookOpen },
          { href: "/loot", label: "Loot", icon: Gift },
          { href: "/handouts", label: "Handouts", icon: FileText }
        ]
      }}
      message={message}
      mode={seatMode}
      onAuthChange={handleAuthChange}
      onModeChange={setSeatMode}
      seat={campaignSeat}
    >
      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <GlassPanel className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Markets</h2>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-700/30 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-700/50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isManageMode}
                  onClick={importStarter}
                  type="button"
                >
                  <PackagePlus className="h-4 w-4" aria-hidden="true" />
                  Import
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {loading ? <p className="text-sm text-muted-foreground">Loading markets...</p> : null}
                {visibleMarkets.map((market) => (
                  <button
                    className={`w-full rounded-md border px-3 py-3 text-left transition ${
                      market.id === selectedMarket?.id
                        ? "border-amber-400/50 bg-amber-500/15"
                        : "border-slate-700/25 bg-slate-950/30 hover:bg-slate-900/50"
                    }`}
                    key={market.id}
                    onClick={() => {
                      setSelectedMarketId(market.id);
                      setSelectedStoreId(market.stores[0]?.id ?? "");
                    }}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-foreground">{market.name}</span>
                    <span className="mt-1 block text-xs uppercase tracking-wide text-muted-foreground">
                      {market.status} {market.location ? `- ${market.location}` : ""}
                    </span>
                  </button>
                ))}
                {!loading && visibleMarkets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No markets available.</p>
                ) : null}
              </div>
            </GlassPanel>

            {isManageMode ? (
            <GlassPanel className="p-4">
              <h2 className="text-lg font-semibold text-foreground">Create Market</h2>
              <div className="mt-4 space-y-3">
                <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Market name" value={marketForm.name} onChange={(event) => setMarketForm({ ...marketForm, name: event.target.value })} />
                <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Location" value={marketForm.location} onChange={(event) => setMarketForm({ ...marketForm, location: event.target.value })} />
                <textarea className="min-h-24 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-amber-500/50" placeholder="Description" value={marketForm.description} onChange={(event) => setMarketForm({ ...marketForm, description: event.target.value })} />
                <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-700/30 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!isManageMode} onClick={createMarket} type="button">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save Market
                </button>
              </div>
            </GlassPanel>
            ) : null}
          </div>

          <div className="space-y-6">
            {selectedMarket ? (
              <>
                <GlassPanel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                        {selectedMarket.status}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-foreground">{selectedMarket.name}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {[selectedMarket.location, selectedMarket.description].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                    {isManageMode ? (
                    <div className="flex flex-wrap gap-2">
                      <button className="h-10 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedMarket.status === "open"} onClick={() => runAction(() => openMarket(selectedMarket.id).then(() => undefined), "Market opened.")} type="button">
                        Open
                      </button>
                      <button className="h-10 rounded-md border border-slate-500/40 bg-slate-800/50 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedMarket.status === "closed"} onClick={() => runAction(() => closeMarket(selectedMarket.id).then(() => undefined), "Market closed.")} type="button">
                        Close
                      </button>
                      <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-950/60" onClick={() => runAction(() => deleteMarket(selectedMarket.id), "Market deleted.")} type="button">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                    ) : null}
                  </div>
                </GlassPanel>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <GlassPanel className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-foreground">Stores</h3>
                        <select className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.target.value)}>
                          {selectedMarket.stores.map((store) => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {selectedMarket.stores.map((store) => (
                          <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3" key={store.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">{store.name}</p>
                                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  {titleCase(store.theme)} - Q{store.quality} - Scarcity {store.scarcity}
                                </p>
                              </div>
                              {isManageMode ? (
                                <div className="flex gap-2">
                                  <button className="text-xs font-semibold text-amber-200 hover:text-amber-100" onClick={() => setStoreForm(storeToForm(store))} type="button">Edit</button>
                                  <button className="text-xs font-semibold text-red-200 hover:text-red-100" onClick={() => deleteStore(store.id)} type="button">Delete</button>
                                </div>
                              ) : null}
                            </div>
                            {store.description ? <p className="mt-2 text-sm text-muted-foreground">{store.description}</p> : null}
                          </div>
                        ))}
                      </div>
                    </GlassPanel>

                    {selectedStore ? (
                      <GlassPanel className="p-4">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-amber-100" aria-hidden="true" />
                          <h3 className="text-lg font-semibold text-foreground">{selectedStore.name} Stock</h3>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {selectedStore.stock.map((stock) => (
                            <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4" key={stock.id}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{stock.item.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {describeMarketPrice(stock.price)} - Qty {stock.quantityAvailable}
                                    {stock.rarity ? ` - ${titleCase(stock.rarity)}` : ""}
                                  </p>
                                  {stock.item.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{stock.item.notes}</p> : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {isManageMode ? (
                                    <>
                                      <button className="h-9 rounded-md border border-slate-600/40 bg-slate-900/60 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-800/70" onClick={() => setStockForm(stockToForm(stock))} type="button">Edit</button>
                                      <button className="h-9 rounded-md border border-red-500/40 bg-red-950/40 px-3 text-sm font-semibold text-red-100 hover:bg-red-950/60" onClick={() => deleteStock(stock.id)} type="button">Delete</button>
                                    </>
                                  ) : null}
                                  <button className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canBuySelected || selectedMarket.status !== "open" || stock.quantityAvailable < 1 || stock.requiresGmApproval} onClick={() => buyStock(stock)} type="button">
                                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                                    Buy
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {selectedStore.stock.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No stock yet.</p>
                          ) : null}
                        </div>
                      </GlassPanel>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <GlassPanel className="p-4">
                      <h3 className="text-lg font-semibold text-foreground">Shopping Character</h3>
                      <select className="mt-3 h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={selectedCharacter?.id ?? ""} onChange={(event) => setSelectedCharacterId(event.target.value)}>
                        {selectableCharacters.map((character) => (
                          <option key={character.id} value={character.id}>{character.name}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-muted-foreground">{walletLabel(selectedCharacter)}</p>
                      {isSupabaseConfigured() && !canBuySelected ? (
                        <p className="mt-3 text-xs text-amber-200">
                          Assign a character at this table to buy or sell here.
                        </p>
                      ) : null}
                    </GlassPanel>

                    {isManageMode ? (
                    <>
                    <GlassPanel className="p-4">
                      <h3 className="text-lg font-semibold text-foreground">Add or Edit Store</h3>
                      <div className="mt-4 space-y-3">
                        <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Store name" value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} />
                        <select className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={storeForm.theme} onChange={(event) => setStoreForm({ ...storeForm, theme: event.target.value as StoreTheme })}>
                          {MARKET_THEMES.map((theme) => <option key={theme} value={theme}>{titleCase(theme)}</option>)}
                        </select>
                        <textarea className="min-h-20 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-amber-500/50" placeholder="Description" value={storeForm.description} onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Quality 1-5" value={storeForm.quality} onChange={(event) => setStoreForm({ ...storeForm, quality: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Scarcity 1-5" value={storeForm.scarcity} onChange={(event) => setStoreForm({ ...storeForm, scarcity: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Price x" value={storeForm.priceMultiplier} onChange={(event) => setStoreForm({ ...storeForm, priceMultiplier: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Sell x" value={storeForm.sellMultiplier} onChange={(event) => setStoreForm({ ...storeForm, sellMultiplier: event.target.value })} />
                        </div>
                        <select className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={storeForm.meanRarity} onChange={(event) => setStoreForm({ ...storeForm, meanRarity: event.target.value as StoreFormState["meanRarity"] })}>
                          <option value="">No mean rarity</option>
                          {ITEM_RARITIES.map((rarity) => <option key={rarity} value={rarity}>{titleCase(rarity)}</option>)}
                        </select>
                        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-700/30 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!isManageMode || !selectedMarket} onClick={saveStoreForm} type="button">
                          <Save className="h-4 w-4" aria-hidden="true" />
                          Save Store
                        </button>
                      </div>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                      <h3 className="text-lg font-semibold text-foreground">Add or Edit Stock</h3>
                      <div className="mt-4 space-y-3">
                        <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Item name" value={stockForm.name} onChange={(event) => setStockForm({ ...stockForm, name: event.target.value })} />
                        <textarea className="min-h-20 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-amber-500/50" placeholder="Item notes" value={stockForm.notes} onChange={(event) => setStockForm({ ...stockForm, notes: event.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Item qty" value={stockForm.itemQuantity} onChange={(event) => setStockForm({ ...stockForm, itemQuantity: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Stock qty" value={stockForm.quantityAvailable} onChange={(event) => setStockForm({ ...stockForm, quantityAvailable: event.target.value })} />
                        </div>
                        <select className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={stockForm.rarity} onChange={(event) => setStockForm({ ...stockForm, rarity: event.target.value as StockFormState["rarity"] })}>
                          <option value="">No rarity</option>
                          {ITEM_RARITIES.map((rarity) => <option key={rarity} value={rarity}>{titleCase(rarity)}</option>)}
                        </select>
                        <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Tags, comma separated" value={stockForm.tags} onChange={(event) => setStockForm({ ...stockForm, tags: event.target.value })} />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="GP" value={stockForm.gp} onChange={(event) => setStockForm({ ...stockForm, gp: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="SP" value={stockForm.sp} onChange={(event) => setStockForm({ ...stockForm, sp: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="CP" value={stockForm.cp} onChange={(event) => setStockForm({ ...stockForm, cp: event.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Custom key" value={stockForm.customKey} onChange={(event) => setStockForm({ ...stockForm, customKey: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Custom amount" value={stockForm.customAmount} onChange={(event) => setStockForm({ ...stockForm, customAmount: event.target.value })} />
                        </div>
                        <textarea className="min-h-40 w-full rounded-md border border-slate-700/30 bg-slate-950/80 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500/50" value={stockForm.itemJson} onChange={(event) => setStockForm({ ...stockForm, itemJson: event.target.value })} />
                        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-700/30 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!isManageMode || !selectedStore} onClick={saveStockForm} type="button">
                          <Save className="h-4 w-4" aria-hidden="true" />
                          Save Stock
                        </button>
                      </div>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                      <h3 className="text-lg font-semibold text-foreground">Sell Inventory</h3>
                      <div className="mt-4 space-y-3">
                        <select className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" value={sellForm.inventoryItemId} onChange={(event) => setSellForm({ ...sellForm, inventoryItemId: event.target.value })}>
                          <option value="">Choose item</option>
                          {(selectedCharacter?.inventory ?? []).map((item) => (
                            <option key={item.id} value={item.id}>{item.name} ({item.quantity})</option>
                          ))}
                        </select>
                        <input className="h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="Quantity" value={sellForm.quantity} onChange={(event) => setSellForm({ ...sellForm, quantity: event.target.value })} />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="GP" value={sellForm.gp} onChange={(event) => setSellForm({ ...sellForm, gp: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="SP" value={sellForm.sp} onChange={(event) => setSellForm({ ...sellForm, sp: event.target.value })} />
                          <input className="h-10 rounded-md border border-slate-700/30 bg-slate-900/70 px-3 text-sm outline-none focus:border-amber-500/50" placeholder="CP" value={sellForm.cp} onChange={(event) => setSellForm({ ...sellForm, cp: event.target.value })} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input checked={sellForm.addToStoreStock} onChange={(event) => setSellForm({ ...sellForm, addToStoreStock: event.target.checked })} type="checkbox" />
                          Add sold item to store stock
                        </label>
                        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canBuySelected || selectedMarket.status !== "open"} onClick={sellItem} type="button">
                          <Coins className="h-4 w-4" aria-hidden="true" />
                          Sell Item
                        </button>
                      </div>
                    </GlassPanel>
                    </>
                    ) : null}
                  </div>
                </section>

                <GlassPanel className="p-4">
                  <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
                  <div className="mt-4 space-y-2">
                    {transactions.map((transaction) => (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/20 bg-slate-950/25 px-3 py-2 text-sm" key={transaction.id}>
                        <span className="text-foreground">
                          {transaction.type === "buy" ? "Bought" : "Sold"} {transaction.quantity}x {transaction.itemName}
                        </span>
                        <span className="text-muted-foreground">
                          {describeMarketPrice(transaction.price)} - {new Date(transaction.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : null}
                  </div>
                </GlassPanel>
              </>
            ) : (
              <GlassPanel className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Create or import a market to begin.</p>
              </GlassPanel>
            )}
          </div>
        </section>
    </CampaignShell>
  );
}
