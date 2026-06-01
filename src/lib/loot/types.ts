import type { ActiveCondition, InventoryItem } from "@/lib/sheets/types";

export type LootTableVisibility = "gm_only" | "campaign";

export type RewardGrant =
  | { type: "currency"; walletDelta: Record<string, number> }
  | { type: "xp"; amount: number }
  | { type: "item"; item: InventoryItem }
  | { type: "condition"; condition: ActiveCondition }
  | { type: "codex"; codexEntryId: string }
  | { type: "note"; title: string; body: string };

export type LootTableEntry = {
  id: string;
  label: string;
  weight: number;
  reward: RewardGrant;
  notes?: string;
};

export type LootTable = {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  visibility: LootTableVisibility;
  entries: LootTableEntry[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LootRollResult = {
  entry: LootTableEntry;
  roll: number;
  threshold: number;
  totalWeight: number;
  validEntryCount: number;
};

export type RewardSource = {
  lootTableId?: string;
  lootTableName?: string;
  handoutId?: string;
  handoutTitle?: string;
  entryId?: string;
  entryLabel?: string;
  codexEntryName?: string;
};

export const LOCAL_DEMO_CAMPAIGN_ID = "local-demo-campaign";
export const SUPABASE_STARTER_LOOT_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000013";
