import type { CurrencyWallet } from "@/lib/sheets/types";
import type { ItemRarity, MarketPrice } from "@/lib/markets/types";

export const RARITY_PRICE_MULTIPLIER: Record<ItemRarity, number | null> = {
  common: 1,
  uncommon: 5,
  rare: 25,
  very_rare: 125,
  legendary: null,
  unique: null
};

function numberOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeMarketPrice(price: MarketPrice | undefined): MarketPrice {
  const custom = Object.fromEntries(
    Object.entries(price?.custom ?? {}).filter((entry): entry is [string, number] => {
      return Boolean(entry[0]) && typeof entry[1] === "number" && Number.isFinite(entry[1]);
    })
  );

  return {
    gp: numberOrZero(price?.gp) || undefined,
    sp: numberOrZero(price?.sp) || undefined,
    cp: numberOrZero(price?.cp) || undefined,
    custom: Object.keys(custom).length > 0 ? custom : undefined
  };
}

export function multiplyMarketPrice(price: MarketPrice, multiplier: number): MarketPrice {
  const safeMultiplier = Number.isFinite(multiplier) ? multiplier : 1;
  const custom = Object.fromEntries(
    Object.entries(price.custom ?? {})
      .map(([key, value]) => [key, roundCurrency(value * safeMultiplier)] as const)
      .filter(([, value]) => value !== 0)
  );

  return normalizeMarketPrice({
    gp: price.gp ? roundCurrency(price.gp * safeMultiplier) : undefined,
    sp: price.sp ? roundCurrency(price.sp * safeMultiplier) : undefined,
    cp: price.cp ? roundCurrency(price.cp * safeMultiplier) : undefined,
    custom
  });
}

export function totalMarketPrice(price: MarketPrice, quantity: number): MarketPrice {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  return multiplyMarketPrice(price, safeQuantity);
}

export function marketPriceToDelta(price: MarketPrice, sign: 1 | -1): Record<string, number> {
  const normalized = normalizeMarketPrice(price);
  const delta: Record<string, number> = {};

  for (const key of ["gp", "sp", "cp"] as const) {
    const value = normalized[key];
    if (value) delta[key] = value * sign;
  }
  for (const [key, value] of Object.entries(normalized.custom ?? {})) {
    if (value) delta[key] = value * sign;
  }

  return delta;
}

export function applyWalletDelta(wallet: CurrencyWallet, delta: Record<string, number>): CurrencyWallet {
  const next: CurrencyWallet = {
    ...wallet,
    custom: { ...(wallet.custom ?? {}) }
  };

  for (const [key, value] of Object.entries(delta)) {
    if (!Number.isFinite(value) || value === 0) continue;
    if (key === "gp" || key === "sp" || key === "cp" || key === "xp") {
      next[key] = numberOrZero(next[key]) + value;
    } else {
      next.custom = {
        ...(next.custom ?? {}),
        [key]: numberOrZero(next.custom?.[key]) + value
      };
    }
  }

  if (Object.keys(next.custom ?? {}).length === 0) delete next.custom;
  return next;
}

export function canAffordPrice(wallet: CurrencyWallet, price: MarketPrice): boolean {
  const normalized = normalizeMarketPrice(price);
  for (const key of ["gp", "sp", "cp"] as const) {
    if (numberOrZero(wallet[key]) < numberOrZero(normalized[key])) return false;
  }
  for (const [key, value] of Object.entries(normalized.custom ?? {})) {
    if (numberOrZero(wallet.custom?.[key]) < value) return false;
  }
  return true;
}

export function describeMarketPrice(price: MarketPrice): string {
  const normalized = normalizeMarketPrice(price);
  const rows = [
    ...(["gp", "sp", "cp"] as const)
      .map((key) => [key, normalized[key]] as const)
      .filter(([, value]) => Boolean(value)),
    ...Object.entries(normalized.custom ?? {})
  ];

  return rows.map(([key, value]) => `${value} ${key.toUpperCase()}`).join(", ") || "Free";
}
