import type { CodexEntry, CodexGrant } from "@/lib/codex/types";
import type { RewardGrant, RewardSource } from "@/lib/loot/types";
import type {
  ActiveCondition,
  CharacterProfile,
  CurrencyWallet,
  GameSystem,
  InventoryItem,
  RewardTransaction,
  SheetAction
} from "@/lib/sheets/types";

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

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

function sourceLabel(source?: RewardSource): string {
  if (!source) return "Loot";
  if (source.lootTableName && source.entryLabel) {
    return `${source.lootTableName}: ${source.entryLabel}`;
  }
  if (source.handoutTitle) return `Handout: ${source.handoutTitle}`;
  return source.lootTableName ?? source.entryLabel ?? "Loot";
}

function makeTransaction(
  character: CharacterProfile,
  input: Omit<RewardTransaction, "id" | "characterId" | "createdAt">
): RewardTransaction {
  return {
    ...input,
    id: newId("reward"),
    characterId: character.id,
    createdAt: new Date().toISOString()
  };
}

function appendTransaction(
  character: CharacterProfile,
  transaction: RewardTransaction
): CharacterProfile {
  return {
    ...character,
    rewardHistory: [transaction, ...(character.rewardHistory ?? [])]
  };
}

function applyWalletDelta(wallet: CurrencyWallet, delta: Record<string, number>): CurrencyWallet {
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

  if (Object.keys(next.custom ?? {}).length === 0) {
    delete next.custom;
  }

  return next;
}

function appendOrIncrementInventory(
  inventory: InventoryItem[],
  item: InventoryItem
): InventoryItem[] {
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const duplicateIndex = inventory.findIndex((existing) => {
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

  if (duplicateIndex === -1) {
    return [
      ...inventory,
      {
        ...item,
        id: item.id || newId("item"),
        quantity
      }
    ];
  }

  return inventory.map((existing, index) =>
    index === duplicateIndex
      ? {
          ...existing,
          quantity: numberOrZero(existing.quantity) + quantity
        }
      : existing
  );
}

function appendUniqueCondition(
  conditions: ActiveCondition[],
  condition: ActiveCondition
): ActiveCondition[] {
  const duplicate = conditions.some((existing) => {
    return (
      existing.id === condition.id ||
      (condition.codexEntryId && existing.codexEntryId === condition.codexEntryId) ||
      existing.name.trim().toLowerCase() === condition.name.trim().toLowerCase()
    );
  });

  if (duplicate) return conditions;
  return [
    {
      ...condition,
      id: condition.id || newId("condition")
    },
    ...conditions
  ];
}

function targetSystemForCodex(character: CharacterProfile, entry: CodexEntry): GameSystem | null {
  if ((entry.system === "dnd5e" || entry.system === "nwod") && character.sheets[entry.system]) {
    return entry.system;
  }
  if (character.sheets[character.defaultSystem]) return character.defaultSystem;
  return (Object.keys(character.sheets)[0] as GameSystem | undefined) ?? null;
}

function withCodexMetadata(action: SheetAction, entry: CodexEntry, suffix = action.id): SheetAction {
  return {
    ...action,
    id: `codex-${entry.id}-${slugify(suffix || action.label)}`,
    label: action.label || entry.name,
    source: "custom",
    metadata: {
      ...(action.metadata ?? {}),
      sourceCodexEntryId: entry.id,
      sourceCodexName: entry.name,
      sourceCodexSystem: entry.system,
      sourceCodexType: entry.type
    }
  };
}

function noteActionFromEntry(entry: CodexEntry): SheetAction {
  return withCodexMetadata(
    {
      id: "notes",
      type: "note",
      label: `${entry.name} Notes`,
      notes: [entry.description, entry.rulesText].filter(Boolean).join("\n\n"),
      source: "custom"
    },
    entry,
    "notes"
  );
}

function noteActionFromGrant(entry: CodexEntry, grant: Extract<CodexGrant, { type: "note" }>): SheetAction {
  return withCodexMetadata(
    {
      id: slugify(grant.title),
      type: "note",
      label: grant.title,
      notes: grant.body,
      source: "custom"
    },
    entry,
    `grant-${grant.title}`
  );
}

function statModifierNote(entry: CodexEntry, grant: Extract<CodexGrant, { type: "stat_modifier" }>): SheetAction {
  return withCodexMetadata(
    {
      id: `stat-${slugify(grant.target)}`,
      type: "note",
      label: `${entry.name}: ${grant.target}`,
      notes: `${grant.mode === "set" ? "Set" : "Add"} ${grant.target} ${grant.mode === "set" ? "to" : "by"} ${grant.value}. Apply manually until stat automation exists.`,
      source: "custom"
    },
    entry,
    `stat-${grant.target}`
  );
}

function appendUniqueAction(actions: SheetAction[], action: SheetAction): SheetAction[] {
  const duplicate = actions.some((existing) => {
    return (
      existing.id === action.id ||
      (existing.metadata?.sourceCodexEntryId === action.metadata?.sourceCodexEntryId &&
        existing.type === action.type &&
        existing.label.trim().toLowerCase() === action.label.trim().toLowerCase())
    );
  });

  return duplicate ? actions : [...actions, action];
}

function isConditionEntry(entry: CodexEntry): boolean {
  return (
    entry.type === "condition" ||
    entry.type === "disease" ||
    entry.type === "curse" ||
    entry.type === "blessing"
  );
}

function codexCondition(entry: CodexEntry, source?: RewardSource): ActiveCondition {
  return {
    id: `codex-${entry.id}`,
    codexEntryId: entry.id,
    name: entry.name,
    description: [entry.description, entry.rulesText].filter(Boolean).join("\n\n"),
    source: sourceLabel(source),
    expiresAt: null
  };
}

function applyCodexEntry(character: CharacterProfile, entry: CodexEntry, source?: RewardSource): CharacterProfile {
  const targetSystem = targetSystemForCodex(character, entry);
  let nextCharacter = { ...character };
  let nextActions = targetSystem ? character.sheets[targetSystem]?.actions ?? [] : [];
  let nextInventory = character.inventory ?? [];
  let nextConditions = character.conditions ?? [];

  if (targetSystem && entry.actionTemplate) {
    nextActions = appendUniqueAction(nextActions, withCodexMetadata(entry.actionTemplate, entry));
  }

  for (const grant of entry.grants ?? []) {
    if (grant.type === "action" && targetSystem) {
      nextActions = appendUniqueAction(nextActions, withCodexMetadata(grant.action, entry, grant.action.id));
    }
    if (grant.type === "note" && targetSystem) {
      nextActions = appendUniqueAction(nextActions, noteActionFromGrant(entry, grant));
    }
    if (grant.type === "stat_modifier" && targetSystem) {
      nextActions = appendUniqueAction(nextActions, statModifierNote(entry, grant));
    }
    if (grant.type === "inventory_item") {
      nextInventory = appendOrIncrementInventory(nextInventory, {
        ...grant.item,
        id: grant.item.id || `codex-${entry.id}-${slugify(grant.item.name)}`,
        codexEntryId: entry.id,
        sourceCodexEntryId: entry.id,
        quantity: grant.item.quantity ?? 1
      });
    }
  }

  if (isConditionEntry(entry)) {
    nextConditions = appendUniqueCondition(nextConditions, codexCondition(entry, source));
  } else if (targetSystem) {
    nextActions = appendUniqueAction(nextActions, noteActionFromEntry(entry));
  }

  nextCharacter = {
    ...nextCharacter,
    inventory: nextInventory,
    conditions: nextConditions
  };

  if (targetSystem && nextCharacter.sheets[targetSystem]) {
    nextCharacter = {
      ...nextCharacter,
      sheets: {
        ...nextCharacter.sheets,
        [targetSystem]: {
          ...nextCharacter.sheets[targetSystem],
          actions: nextActions
        }
      }
    };
  }

  return appendTransaction(
    nextCharacter,
    makeTransaction(character, {
      type: "codex",
      source: sourceLabel(source),
      description: `Added Codex Feature: ${entry.name}`,
      delta: {
        codexEntryId: entry.id,
        codexEntryName: entry.name,
        source
      }
    })
  );
}

function describeWalletDelta(delta: Record<string, number>): string {
  return Object.entries(delta)
    .filter(([, value]) => Number.isFinite(value) && value !== 0)
    .map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${titleCase(key)}`)
    .join(", ");
}

export function applyRewardGrant(
  character: CharacterProfile,
  grant: RewardGrant,
  source?: RewardSource,
  options: { codexEntry?: CodexEntry } = {}
): CharacterProfile {
  if (grant.type === "currency") {
    const wallet = applyWalletDelta(character.wallet ?? {}, grant.walletDelta);
    const xpDelta = grant.walletDelta.xp;
    const nextProgression =
      typeof xpDelta === "number"
        ? {
            ...(character.progression ?? {}),
            xp: numberOrZero(character.progression?.xp) + xpDelta
          }
        : character.progression ?? {};

    return appendTransaction(
      {
        ...character,
        wallet,
        progression: nextProgression
      },
      makeTransaction(character, {
        type: grant.walletDelta.xp ? "xp" : "currency",
        source: sourceLabel(source),
        description: describeWalletDelta(grant.walletDelta) || "Currency reward",
        delta: grant.walletDelta
      })
    );
  }

  if (grant.type === "xp") {
    const amount = Number.isFinite(grant.amount) ? grant.amount : 0;
    return appendTransaction(
      {
        ...character,
        wallet: applyWalletDelta(character.wallet ?? {}, { xp: amount }),
        progression: {
          ...(character.progression ?? {}),
          xp: numberOrZero(character.progression?.xp) + amount
        }
      },
      makeTransaction(character, {
        type: "xp",
        source: sourceLabel(source),
        description: `${amount > 0 ? "+" : ""}${amount} XP`,
        delta: { xp: amount }
      })
    );
  }

  if (grant.type === "item") {
    const item: InventoryItem = {
      ...grant.item,
      id: grant.item.id || newId("item"),
      quantity: grant.item.quantity ?? 1
    };
    return appendTransaction(
      {
        ...character,
        inventory: appendOrIncrementInventory(character.inventory ?? [], item)
      },
      makeTransaction(character, {
        type: "item",
        source: sourceLabel(source),
        description: `Added item: ${item.name}`,
        delta: { item, source }
      })
    );
  }

  if (grant.type === "condition") {
    const condition: ActiveCondition = {
      ...grant.condition,
      id: grant.condition.id || newId("condition"),
      source: grant.condition.source ?? sourceLabel(source)
    };
    return appendTransaction(
      {
        ...character,
        conditions: appendUniqueCondition(character.conditions ?? [], condition)
      },
      makeTransaction(character, {
        type: "manual",
        source: sourceLabel(source),
        description: `Added condition: ${condition.name}`,
        delta: { condition, source }
      })
    );
  }

  if (grant.type === "note") {
    return appendTransaction(
      character,
      makeTransaction(character, {
        type: "manual",
        source: sourceLabel(source),
        description: grant.title,
        delta: { note: grant.body, source }
      })
    );
  }

  if (grant.type === "codex") {
    if (!options.codexEntry) {
      return appendTransaction(
        character,
        makeTransaction(character, {
          type: "codex",
          source: sourceLabel(source),
          description: `Codex reward queued: ${grant.codexEntryId}`,
          delta: { codexEntryId: grant.codexEntryId, source }
        })
      );
    }
    return applyCodexEntry(character, options.codexEntry, {
      ...source,
      codexEntryName: options.codexEntry.name
    });
  }

  return character;
}
