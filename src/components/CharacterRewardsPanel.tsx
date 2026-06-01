"use client";

import { Dices, Plus, Trash2, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { executeSheetAction } from "@/lib/sheets/rollAction";
import { executeInventoryItemPower } from "@/lib/sheets/inventoryItemPowers";
import type {
  ActiveCondition,
  CharacterProfile,
  CurrencyWallet,
  GameSystem,
  InventoryItem,
  InventoryItemPower,
  RollLogEntry,
  RewardTransaction,
  SystemSheet
} from "@/lib/sheets/types";
import { isDnd5eSheet } from "@/lib/sheets/types";
import { GlassPanel } from "./GlassPanel";

type CharacterRewardsPanelProps = {
  profile: CharacterProfile;
  selectedSystem: GameSystem;
  sheet: SystemSheet;
  canManageRewards: boolean;
  canToggleEquipment: boolean;
  onProfileChange?: (profile: CharacterProfile) => void | Promise<void>;
  onRollLogEntry?: (entry: RollLogEntry) => void | Promise<void>;
  sections?: RewardsSection[];
  inventoryMode?: "full" | "powers-only";
};

export type RewardsSection =
  | "inventory"
  | "wallet"
  | "progression"
  | "conditions"
  | "history";

const ALL_SECTIONS: RewardsSection[] = [
  "inventory",
  "wallet",
  "progression",
  "conditions",
  "history"
];

const WALLET_KEYS = ["gp", "sp", "cp", "xp"] as const;

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function numberOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function makeTransaction(
  profile: CharacterProfile,
  input: Omit<RewardTransaction, "id" | "characterId" | "createdAt">
): RewardTransaction {
  return {
    ...input,
    id: crypto.randomUUID(),
    characterId: profile.id,
    createdAt: new Date().toISOString()
  };
}

function appendTransaction(profile: CharacterProfile, transaction: RewardTransaction): CharacterProfile {
  return {
    ...profile,
    rewardHistory: [transaction, ...(profile.rewardHistory ?? [])]
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatWalletValue(wallet: CurrencyWallet, key: string): number {
  if (key === "gp" || key === "sp" || key === "cp" || key === "xp") {
    return numberOrZero(wallet[key]);
  }
  return numberOrZero(wallet.custom?.[key]);
}

function powerKey(item: InventoryItem, power: InventoryItemPower): string {
  return `${item.id}:${power.id}`;
}

function powerHasCharges(power: InventoryItemPower): boolean {
  return !power.charges || power.charges.current > 0;
}

function formatChargeReset(reset: NonNullable<InventoryItemPower["charges"]>["reset"]): string {
  if (!reset) return "";
  return reset.replace("_", " ");
}

function spellMetadataRows(sheet: SystemSheet, power: InventoryItemPower): string[] {
  const metadata = power.action.metadata ?? {};
  const rows: string[] = [];

  if (metadata.usesSpellSaveDc && isDnd5eSheet(sheet)) {
    const dc = sheet.stats?.spellSaveDc;
    rows.push(`Spell Save DC ${typeof dc === "number" ? dc : "not set"}`);
  }
  if (typeof metadata.saveAbility === "string") {
    rows.push(`${metadata.saveAbility.toUpperCase()} save`);
  }
  if (typeof metadata.damageRoll === "string") {
    rows.push(`Damage ${metadata.damageRoll}`);
  }
  return rows;
}

export function CharacterRewardsPanel({
  profile,
  selectedSystem,
  sheet,
  canManageRewards,
  canToggleEquipment,
  onProfileChange,
  onRollLogEntry,
  sections = ALL_SECTIONS,
  inventoryMode = "full"
}: CharacterRewardsPanelProps) {
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemRarity, setItemRarity] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [walletKey, setWalletKey] = useState<"gp" | "sp" | "cp" | "xp" | "resources" | "custom">(
    selectedSystem === "nwod" ? "xp" : "gp"
  );
  const [customWalletKey, setCustomWalletKey] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletSource, setWalletSource] = useState("");
  const [levelInput, setLevelInput] = useState(String(profile.progression?.level ?? ""));
  const [xpInput, setXpInput] = useState(String(profile.progression?.xp ?? ""));
  const [milestoneInput, setMilestoneInput] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [conditionDescription, setConditionDescription] = useState("");
  const [conditionSource, setConditionSource] = useState("");
  const [powerErrors, setPowerErrors] = useState<Record<string, string>>({});

  const wallet = profile.wallet ?? {};
  const inventory = profile.inventory ?? [];
  const rewardHistory = profile.rewardHistory ?? [];
  const conditions = profile.conditions ?? [];
  const progression = profile.progression ?? {};
  const canUseItemPowers = Boolean(onProfileChange && onRollLogEntry);

  const walletRows = useMemo(() => {
    const rows = WALLET_KEYS.map((key) => ({ key, label: key.toUpperCase() }));
    const custom = Object.keys(wallet.custom ?? {}).map((key) => ({ key, label: titleCase(key) }));
    if (selectedSystem === "nwod" && !custom.some((row) => row.key === "resources")) {
      custom.unshift({ key: "resources", label: "Resources" });
    }
    return [...rows, ...custom];
  }, [selectedSystem, wallet.custom]);

  async function persist(nextProfile: CharacterProfile) {
    if (!onProfileChange) return;
    await onProfileChange(nextProfile);
  }

  function setPowerError(item: InventoryItem, power: InventoryItemPower, error: string | null) {
    const key = powerKey(item, power);
    setPowerErrors((current) => {
      const next = { ...current };
      if (error) {
        next[key] = error;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  async function handleInventoryPowerUse(item: InventoryItem, power: InventoryItemPower) {
    if (!canUseItemPowers || !onRollLogEntry) return;
    setPowerError(item, power, null);

    try {
      const result = executeInventoryItemPower({
        character: profile,
        system: selectedSystem,
        sheet,
        item,
        power
      });
      if (result.updatedCharacter) {
        await persist(result.updatedCharacter);
      }
      await onRollLogEntry(result.logEntry);
    } catch (error) {
      setPowerError(item, power, error instanceof Error ? error.message : "Item power failed.");
    }
  }

  async function rollPowerDamage(item: InventoryItem, power: InventoryItemPower) {
    if (!onRollLogEntry || selectedSystem !== "dnd5e") return;
    const damageRoll = power.action.metadata?.damageRoll;
    if (typeof damageRoll !== "string" || !damageRoll.trim()) return;
    setPowerError(item, power, null);

    try {
      const spellName =
        typeof power.action.metadata?.spellName === "string"
          ? power.action.metadata.spellName
          : power.label;
      await onRollLogEntry(
        executeSheetAction(
          sheet,
          {
            id: `${power.action.id}-damage`,
            type: "dnd-roll",
            label: `${item.name}: ${spellName} Damage`,
            roll: damageRoll,
            notes: power.action.notes,
            source: "custom",
            metadata: {
              ...(power.action.metadata ?? {}),
              sourceItemId: item.id,
              sourcePowerId: power.id
            }
          },
          profile.name,
          selectedSystem
        )
      );
    } catch (error) {
      setPowerError(item, power, error instanceof Error ? error.message : "Damage roll failed.");
    }
  }

  async function addInventoryItem() {
    if (!canManageRewards || !itemName.trim()) return;

    const quantity = Number(itemQuantity);
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: itemName.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      rarity: itemRarity.trim() || undefined,
      notes: itemNotes.trim() || undefined,
      equipped: false,
      metadata: {}
    };
    const transaction = makeTransaction(profile, {
      type: "item",
      source: "Manual",
      description: `Added item: ${item.name}`,
      delta: { item }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          inventory: [...inventory, item]
        },
        transaction
      )
    );

    setItemName("");
    setItemQuantity("1");
    setItemRarity("");
    setItemNotes("");
  }

  async function updateInventoryItem(itemId: string, patch: Partial<InventoryItem>) {
    const current = inventory.find((item) => item.id === itemId);
    if (!current) return;
    if (!canManageRewards && !("equipped" in patch && canToggleEquipment)) return;

    await persist({
      ...profile,
      inventory: inventory.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    });
  }

  async function removeInventoryItem(item: InventoryItem) {
    if (!canManageRewards) return;

    const transaction = makeTransaction(profile, {
      type: "item",
      source: "Manual",
      description: `Removed item: ${item.name}`,
      delta: { removedItemId: item.id, name: item.name }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          inventory: inventory.filter((current) => current.id !== item.id)
        },
        transaction
      )
    );
  }

  async function applyWalletDelta() {
    if (!canManageRewards) return;
    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount === 0) return;

    const resolvedKey =
      walletKey === "custom" ? customWalletKey.trim().toLowerCase() : walletKey;
    if (!resolvedKey) return;

    const nextWallet: CurrencyWallet = {
      ...wallet,
      custom: { ...(wallet.custom ?? {}) }
    };

    if (resolvedKey === "gp" || resolvedKey === "sp" || resolvedKey === "cp" || resolvedKey === "xp") {
      nextWallet[resolvedKey] = numberOrZero(nextWallet[resolvedKey]) + amount;
    } else {
      nextWallet.custom = {
        ...(nextWallet.custom ?? {}),
        [resolvedKey]: numberOrZero(nextWallet.custom?.[resolvedKey]) + amount
      };
    }

    const nextProgression =
      resolvedKey === "xp"
        ? {
            ...(progression ?? {}),
            xp: numberOrZero(progression.xp) + amount
          }
        : progression;

    const transaction = makeTransaction(profile, {
      type: resolvedKey === "xp" ? "xp" : "currency",
      source: walletSource.trim() || "Manual",
      description: `${amount > 0 ? "+" : ""}${amount} ${titleCase(resolvedKey)}`,
      delta: { [resolvedKey]: amount }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          wallet: nextWallet,
          progression: nextProgression
        },
        transaction
      )
    );

    setWalletAmount("");
    setWalletSource("");
  }

  async function saveProgression() {
    if (!canManageRewards) return;

    const level = Number(levelInput);
    const xp = Number(xpInput);
    const transaction = makeTransaction(profile, {
      type: "manual",
      source: "Progression",
      description: "Updated progression",
      delta: {
        level: Number.isFinite(level) ? level : undefined,
        xp: Number.isFinite(xp) ? xp : undefined
      }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          progression: {
            ...progression,
            level: Number.isFinite(level) ? level : undefined,
            xp: Number.isFinite(xp) ? xp : undefined,
            milestones: progression.milestones ?? []
          }
        },
        transaction
      )
    );
  }

  async function addMilestone() {
    if (!canManageRewards || !milestoneInput.trim()) return;

    const milestone = milestoneInput.trim();
    const transaction = makeTransaction(profile, {
      type: "manual",
      source: "Progression",
      description: `Added milestone: ${milestone}`,
      delta: { milestone }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          progression: {
            ...progression,
            milestones: [milestone, ...(progression.milestones ?? [])]
          }
        },
        transaction
      )
    );
    setMilestoneInput("");
  }

  async function removeMilestone(milestone: string) {
    if (!canManageRewards) return;
    await persist({
      ...profile,
      progression: {
        ...progression,
        milestones: (progression.milestones ?? []).filter((current) => current !== milestone)
      }
    });
  }

  async function addCondition() {
    if (!canManageRewards || !conditionName.trim()) return;

    const condition: ActiveCondition = {
      id: crypto.randomUUID(),
      name: conditionName.trim(),
      description: conditionDescription.trim() || undefined,
      source: conditionSource.trim() || undefined,
      expiresAt: null
    };
    const transaction = makeTransaction(profile, {
      type: "manual",
      source: condition.source ?? "Condition",
      description: `Added condition: ${condition.name}`,
      delta: { condition }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          conditions: [condition, ...conditions]
        },
        transaction
      )
    );

    setConditionName("");
    setConditionDescription("");
    setConditionSource("");
  }

  async function removeCondition(condition: ActiveCondition) {
    if (!canManageRewards) return;

    const transaction = makeTransaction(profile, {
      type: "manual",
      source: condition.source ?? "Condition",
      description: `Removed condition: ${condition.name}`,
      delta: { removedConditionId: condition.id, name: condition.name }
    });

    await persist(
      appendTransaction(
        {
          ...profile,
          conditions: conditions.filter((current) => current.id !== condition.id)
        },
        transaction
      )
    );
  }

  const showSection = (section: RewardsSection) => sections.includes(section);
  const powersOnly = inventoryMode === "powers-only";
  const visibleInventory = powersOnly
    ? inventory.filter((item) => item.powers && item.powers.length > 0)
    : inventory;

  return (
    <div className="space-y-6">
      {showSection("inventory") ? (
      <GlassPanel level="secondary" className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {powersOnly ? "Item Powers" : "Inventory"}
          </h2>
          <span className="text-xs text-muted-foreground">{visibleInventory.length} items</span>
        </div>

        {canManageRewards && !powersOnly ? (
          <div className="mt-4 grid gap-2">
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Item name"
              value={itemName}
            />
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
                onChange={(event) => setItemQuantity(event.target.value)}
                placeholder="Qty"
                type="number"
                value={itemQuantity}
              />
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
                onChange={(event) => setItemRarity(event.target.value)}
                placeholder="Rarity"
                value={itemRarity}
              />
            </div>
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-purple-500/50"
              onChange={(event) => setItemNotes(event.target.value)}
              placeholder="Notes"
              value={itemNotes}
            />
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/20 px-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
              onClick={addInventoryItem}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Item
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {visibleInventory.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
              {powersOnly ? "No item powers available." : "No inventory yet."}
            </p>
          ) : (
            visibleInventory.map((item) => (
              <div
                className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Qty {item.quantity}
                      {item.rarity ? ` / ${item.rarity}` : ""}
                      {item.codexEntryId ?? item.sourceCodexEntryId ? " / codex" : ""}
                    </p>
                    {item.notes ? <p className="mt-2 text-xs text-slate-300">{item.notes}</p> : null}
                  </div>
                  {canManageRewards ? (
                    <button
                      className="shrink-0 rounded-md border border-red-500/30 bg-red-950/30 p-2 text-red-100 transition hover:bg-red-900/40"
                      onClick={() => removeInventoryItem(item)}
                      type="button"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      checked={Boolean(item.equipped)}
                      className="accent-purple-400"
                      disabled={!canToggleEquipment}
                      onChange={(event) =>
                        updateInventoryItem(item.id, { equipped: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Equipped
                  </label>
                  {canManageRewards ? (
                    <input
                      className="h-8 w-20 rounded-md border border-slate-700/30 bg-slate-900/60 px-2 text-xs text-foreground"
                      min={0}
                      onChange={(event) =>
                        updateInventoryItem(item.id, {
                          quantity: Math.max(0, Number(event.target.value) || 0)
                        })
                      }
                      type="number"
                      value={item.quantity}
                    />
                  ) : null}
                </div>
                {item.powers && item.powers.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-slate-700/25 pt-3">
                    {item.powers.map((power) => {
                      const metadataRows = spellMetadataRows(sheet, power);
                      const chargeReset = formatChargeReset(power.charges?.reset);
                      const disabled =
                        !canUseItemPowers || item.quantity <= 0 || !powerHasCharges(power);
                      const error = powerErrors[powerKey(item, power)];
                      const damageRoll = power.action.metadata?.damageRoll;
                      const canRollDamage =
                        selectedSystem === "dnd5e" &&
                        typeof damageRoll === "string" &&
                        damageRoll.trim().length > 0 &&
                        Boolean(onRollLogEntry);

                      return (
                        <div
                          className="rounded-md border border-slate-700/25 bg-slate-900/35 p-3"
                          key={power.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase text-slate-200">
                                {power.label}
                              </p>
                              {power.description ? (
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {power.description}
                                </p>
                              ) : null}
                              {metadataRows.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {metadataRows.map((row) => (
                                    <span
                                      className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-100"
                                      key={row}
                                    >
                                      {row}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {power.charges ? (
                                  <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100">
                                    {power.charges.current}/{power.charges.max}
                                    {chargeReset ? ` ${chargeReset}` : ""}
                                  </span>
                                ) : null}
                                {power.consumesItem ? (
                                  <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-100">
                                    Consumes item
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {canRollDamage ? (
                                <button
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-600/20 px-2.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-600/30"
                                  onClick={() => rollPowerDamage(item, power)}
                                  type="button"
                                >
                                  <Dices className="h-3.5 w-3.5" aria-hidden="true" />
                                  Damage
                                </button>
                              ) : null}
                              <button
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-purple-500/35 bg-purple-600/20 px-2.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-600/30 disabled:cursor-not-allowed disabled:opacity-45"
                                disabled={disabled}
                                onClick={() => handleInventoryPowerUse(item, power)}
                                title={
                                  !canUseItemPowers
                                    ? "Character saving and roll logging are unavailable."
                                    : item.quantity <= 0
                                      ? "No quantity remaining."
                                      : !powerHasCharges(power)
                                        ? "No charges remaining."
                                        : undefined
                                }
                                type="button"
                              >
                                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                                {power.action.type === "note" || power.consumesItem ? "Use" : "Roll"}
                              </button>
                            </div>
                          </div>
                          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </GlassPanel>
      ) : null}

      {showSection("wallet") ? (
      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Wallet</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {walletRows.map((row) => (
            <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3" key={row.key}>
              <p className="text-xs uppercase text-muted-foreground">{row.label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatWalletValue(wallet, row.key)}
              </p>
            </div>
          ))}
        </div>

        {canManageRewards ? (
          <div className="mt-4 grid gap-2">
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <select
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-2 text-sm text-foreground"
                onChange={(event) =>
                  setWalletKey(event.target.value as typeof walletKey)
                }
                value={walletKey}
              >
                <option value="gp">GP</option>
                <option value="sp">SP</option>
                <option value="cp">CP</option>
                <option value="xp">XP</option>
                <option value="resources">Resources</option>
                <option value="custom">Custom</option>
              </select>
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
                onChange={(event) => setWalletAmount(event.target.value)}
                placeholder="+/-"
                type="number"
                value={walletAmount}
              />
            </div>
            {walletKey === "custom" ? (
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
                onChange={(event) => setCustomWalletKey(event.target.value)}
                placeholder="Custom currency key"
                value={customWalletKey}
              />
            ) : null}
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
              onChange={(event) => setWalletSource(event.target.value)}
              placeholder="Source"
              value={walletSource}
            />
            <button
              className="h-9 rounded-md border border-cyan-500/40 bg-cyan-700/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/55"
              onClick={applyWalletDelta}
              type="button"
            >
              Apply Wallet Change
            </button>
          </div>
        ) : null}
      </GlassPanel>
      ) : null}

      {showSection("progression") ? (
      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Progression</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
            <p className="text-xs uppercase text-muted-foreground">Level</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{progression.level ?? "-"}</p>
          </div>
          <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
            <p className="text-xs uppercase text-muted-foreground">XP</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{progression.xp ?? wallet.xp ?? 0}</p>
          </div>
        </div>

        {canManageRewards ? (
          <div className="mt-4 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
                onChange={(event) => setLevelInput(event.target.value)}
                placeholder="Level"
                type="number"
                value={levelInput}
              />
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
                onChange={(event) => setXpInput(event.target.value)}
                placeholder="XP"
                type="number"
                value={xpInput}
              />
            </div>
            <button
              className="h-9 rounded-md border border-cyan-500/40 bg-cyan-700/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/55"
              onClick={saveProgression}
              type="button"
            >
              Save Progression
            </button>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
                onChange={(event) => setMilestoneInput(event.target.value)}
                placeholder="Milestone"
                value={milestoneInput}
              />
              <button
                className="h-9 rounded-md border border-purple-500/40 bg-purple-500/20 px-3 text-sm font-semibold text-purple-100"
                onClick={addMilestone}
                type="button"
              >
                Add
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {(progression.milestones ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones recorded.</p>
          ) : (
            (progression.milestones ?? []).map((milestone) => (
              <div
                className="flex items-center justify-between gap-2 rounded-md border border-slate-700/25 bg-slate-950/30 px-3 py-2"
                key={milestone}
              >
                <span className="text-sm text-slate-200">{milestone}</span>
                {canManageRewards ? (
                  <button
                    className="text-xs font-semibold text-red-200"
                    onClick={() => removeMilestone(milestone)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </GlassPanel>
      ) : null}

      {showSection("conditions") ? (
      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Conditions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active conditions.</p>
          ) : (
            conditions.map((condition) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100"
                key={condition.id}
                title={condition.description}
              >
                {condition.name}
                {canManageRewards ? (
                  <button
                    className="text-amber-100/70 hover:text-amber-50"
                    onClick={() => removeCondition(condition)}
                    type="button"
                    aria-label={`Remove ${condition.name}`}
                  >
                    x
                  </button>
                ) : null}
              </span>
            ))
          )}
        </div>

        {canManageRewards ? (
          <div className="mt-4 grid gap-2">
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
              onChange={(event) => setConditionName(event.target.value)}
              placeholder="Condition name"
              value={conditionName}
            />
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
              onChange={(event) => setConditionSource(event.target.value)}
              placeholder="Source"
              value={conditionSource}
            />
            <input
              className="h-9 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground"
              onChange={(event) => setConditionDescription(event.target.value)}
              placeholder="Description"
              value={conditionDescription}
            />
            <button
              className="h-9 rounded-md border border-amber-500/40 bg-amber-700/25 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-700/40"
              onClick={addCondition}
              type="button"
            >
              Add Condition
            </button>
          </div>
        ) : null}
      </GlassPanel>
      ) : null}

      {showSection("history") ? (
      <GlassPanel level="secondary" className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Reward History</h2>
        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {rewardHistory.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
              No rewards recorded yet.
            </p>
          ) : (
            rewardHistory.map((transaction) => (
              <article
                className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3"
                key={transaction.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transaction.source ?? titleCase(transaction.type)}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </time>
                </div>
              </article>
            ))
          )}
        </div>
      </GlassPanel>
      ) : null}
    </div>
  );
}
