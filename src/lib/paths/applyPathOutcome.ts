import { createEncounter } from "@/lib/combat/combatEngine";
import { saveEncounter } from "@/lib/combat/combatRepository";
import { createRollLogEntry } from "@/lib/dice/log";
import { getHandout, revealHandout } from "@/lib/handouts/handoutRepository";
import { applyRewardGrant } from "@/lib/loot/applyRewardGrant";
import { getLootTable } from "@/lib/loot/lootTableRepository";
import { rollLootTable } from "@/lib/loot/rollLootTable";
import type { RewardSource } from "@/lib/loot/types";
import { getMarket, listMarkets, openMarket } from "@/lib/markets/marketRepository";
import { appendPathHistory } from "@/lib/paths/pathEngine";
import type { BranchingPath, PathNode, PathOutcome, PathOutcomeResult } from "@/lib/paths/types";
import { applyLongRest, applyShortRest } from "@/lib/rest/restEngine";
import { DEFAULT_ROOM_SLUG } from "@/lib/rollLog/constants";
import type { SeatContext } from "@/lib/session/permissions";
import { listCharacters, saveCharacter } from "@/lib/storage/characterRepository";
import { saveRollLog } from "@/lib/storage/rollLogRepository";

export type ApplyPathOutcomeOptions = {
  overrideExisting?: boolean;
  outcomeIndex?: number;
  outcomeKey?: string;
};

export type ApplyPathOutcomeArgs = {
  path: BranchingPath;
  node: PathNode;
  outcome: PathOutcome;
  targetCharacterIds: string[];
  seatContext?: SeatContext;
  options?: ApplyPathOutcomeOptions;
};

function outcomeKey(nodeId: string, outcome: PathOutcome, index: number): string {
  if (outcome.type === "reward_grant") return `${nodeId}:reward:${outcome.label}`;
  if (outcome.type === "handout_reveal") return `${nodeId}:handout:${outcome.handoutId}`;
  if (outcome.type === "loot_roll") return `${nodeId}:loot:${outcome.lootTableId}`;
  if (outcome.type === "market_open") return `${nodeId}:market:${outcome.marketId}`;
  if (outcome.type === "combat_start") return `${nodeId}:combat:${outcome.encounterId ?? "new"}`;
  if (outcome.type === "codex_unlock") return `${nodeId}:codex:${outcome.codexEntryIds.join(",")}`;
  if (outcome.type === "condition_apply") return `${nodeId}:condition:${outcome.conditionName}`;
  if (outcome.type === "rest") return `${nodeId}:rest:${outcome.restType}`;
  if (outcome.type === "log") return `${nodeId}:log:${outcome.message.slice(0, 32)}`;
  if (outcome.type === "custom") return `${nodeId}:custom:${outcome.label}`;
  return `${nodeId}:outcome:${index}`;
}

function getAppliedKeys(node: PathNode): string[] {
  const keys = node.metadata?.appliedOutcomeKeys;
  return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : [];
}

function markOutcomeApplied(node: PathNode, key: string): PathNode {
  const applied = getAppliedKeys(node);
  if (applied.includes(key)) return node;
  return {
    ...node,
    metadata: {
      ...(node.metadata ?? {}),
      appliedOutcomeKeys: [...applied, key]
    }
  };
}

async function logPathAction(
  path: BranchingPath,
  node: PathNode,
  summary: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await saveRollLog(
      DEFAULT_ROOM_SLUG,
      createRollLogEntry({
        kind: "system",
        actionLabel: `Path: ${path.name}`,
        resultText: summary,
        details: {
          pathId: path.id,
          pathName: path.name,
          nodeId: node.id,
          nodeTitle: node.title,
          gameTableId: path.gameTableId,
          ...details
        }
      })
    );
  } catch (error) {
    console.warn("[applyPathOutcome] Roll log save failed.", error);
  }
}

async function resolveLootTableId(primaryId: string, fallbackIds: string[] = []): Promise<string | null> {
  const candidates = [primaryId, ...fallbackIds];
  for (const id of candidates) {
    const table = await getLootTable(id);
    if (table) return id;
  }
  return null;
}

async function resolveMarketId(marketId: string, gameTableId: string): Promise<string | null> {
  const direct = await getMarket(marketId);
  if (direct) return direct.id;

  const markets = await listMarkets(gameTableId);
  const byStore = markets.find((market) =>
    market.stores.some((store) => store.id === marketId)
  );
  return byStore?.id ?? null;
}

export async function applyPathOutcome(args: ApplyPathOutcomeArgs): Promise<{
  result: PathOutcomeResult;
  path: BranchingPath;
  node: PathNode;
}> {
  const { path, node, outcome, targetCharacterIds, seatContext, options = {} } = args;
  const index = options.outcomeIndex ?? 0;
  const key = options.outcomeKey ?? outcomeKey(node.id, outcome, index);
  const appliedKeys = getAppliedKeys(node);

  if (appliedKeys.includes(key) && !options.overrideExisting) {
    return {
      result: {
        success: false,
        skipped: true,
        summary: "Outcome already applied. Confirm override to apply again."
      },
      path,
      node
    };
  }

  const source: RewardSource = {
    pathId: path.id,
    pathName: path.name,
    nodeId: node.id,
    outcomeLabel: outcome.type
  };

  let summary = "";
  let success = true;
  const details: Record<string, unknown> = { outcomeType: outcome.type, outcomeKey: key };

  if (outcome.type === "reward_grant") {
    const characters = await listCharacters();
    const targets = targetCharacterIds.length
      ? characters.filter((c) => targetCharacterIds.includes(c.id))
      : characters;

    for (const character of targets) {
      let updated = character;
      for (const grant of outcome.grants) {
        updated = applyRewardGrant(updated, grant, source);
      }
      await saveCharacter(updated);
    }
    summary = `Applied rewards to ${targets.length} character(s): ${outcome.label}`;
  } else if (outcome.type === "handout_reveal") {
    const handout = await getHandout(outcome.handoutId);
    if (!handout) {
      success = false;
      summary = `Handout not found (${outcome.handoutId}). Import starter handouts first.`;
    } else {
      await revealHandout(outcome.handoutId, "campaign");
      summary = `Revealed handout: ${handout.title}`;
      details.handoutId = outcome.handoutId;
    }
  } else if (outcome.type === "loot_roll") {
    const fallbackIds = Array.isArray(node.metadata?.fallbackLootTableIds)
      ? (node.metadata.fallbackLootTableIds as string[])
      : [];
    const tableId = await resolveLootTableId(outcome.lootTableId, fallbackIds);
    if (!tableId) {
      success = false;
      summary = `Loot table not found (${outcome.lootTableId}). Import starter loot tables first.`;
    } else {
      const table = await getLootTable(tableId);
      if (!table) {
        success = false;
        summary = `Loot table not found (${tableId}).`;
      } else {
        const roll = rollLootTable(table);
        const characters = await listCharacters();
        const targets = targetCharacterIds.length
          ? characters.filter((c) => targetCharacterIds.includes(c.id))
          : characters;

        for (const character of targets) {
          const updated = applyRewardGrant(character, roll.entry.reward, {
            ...source,
            lootTableId: table.id,
            lootTableName: table.name,
            entryId: roll.entry.id,
            entryLabel: roll.entry.label
          });
          await saveCharacter(updated);
        }
        summary = `Rolled loot "${roll.entry.label}" for ${targets.length} character(s).`;
        details.lootTableId = tableId;
        details.roll = roll;
      }
    }
  } else if (outcome.type === "market_open") {
    const resolvedId = await resolveMarketId(outcome.marketId, path.gameTableId);
    if (!resolvedId) {
      success = false;
      summary = `Market not found (${outcome.marketId}). Import starter markets first.`;
    } else {
      const market = await openMarket(resolvedId);
      summary = `Opened market: ${market.name}`;
      details.marketId = market.id;
    }
  } else if (outcome.type === "combat_start") {
    if (outcome.encounterId) {
      summary = `Linked to encounter ${outcome.encounterId}. Open Combat to continue.`;
      details.encounterId = outcome.encounterId;
    } else {
      const encounter = createEncounter(
        outcome.notes ?? `${node.title} - Combat`,
        "dnd5e"
      );
      const saved = await saveEncounter({
        ...encounter,
        gameTableId: path.gameTableId,
        status: "draft"
      });
      summary = `Created draft encounter "${saved.name}". Open Combat to configure.`;
      details.encounterId = saved.id;
    }
  } else if (outcome.type === "codex_unlock") {
    const characters = await listCharacters();
    const targets = targetCharacterIds.length
      ? characters.filter((c) => targetCharacterIds.includes(c.id))
      : characters;

    let appliedCount = 0;
    for (const character of targets) {
      let updated = character;
      for (const codexEntryId of outcome.codexEntryIds) {
        updated = applyRewardGrant(updated, { type: "codex", codexEntryId }, source);
        appliedCount += 1;
      }
      await saveCharacter(updated);
    }
    summary = `Unlocked ${outcome.codexEntryIds.length} codex entr(ies) for ${targets.length} character(s).`;
    details.codexEntryIds = outcome.codexEntryIds;
    details.appliedCount = appliedCount;
  } else if (outcome.type === "condition_apply") {
    const characters = await listCharacters();
    const targets = targetCharacterIds.length
      ? characters.filter((c) => targetCharacterIds.includes(c.id))
      : characters;

    for (const character of targets) {
      const updated = applyRewardGrant(
        character,
        {
          type: "condition",
          condition: {
            id: `path-${node.id}-${outcome.conditionName.toLowerCase().replace(/\s+/g, "-")}`,
            name: outcome.conditionName,
            description: outcome.description ?? "",
            source: `${path.name}: ${node.title}`,
            expiresAt: null
          }
        },
        source
      );
      await saveCharacter(updated);
    }
    summary = `Applied condition "${outcome.conditionName}" to ${targets.length} character(s).`;
  } else if (outcome.type === "rest") {
    const characters = await listCharacters();
    const targets = targetCharacterIds.length
      ? characters.filter((c) => targetCharacterIds.includes(c.id))
      : characters;

    for (const character of targets) {
      const updated =
        outcome.restType === "long_rest"
          ? applyLongRest(character)
          : applyShortRest(character);
      await saveCharacter(updated);
    }
    const restLabel =
      outcome.restType === "safe_camp"
        ? "safe camp (short rest)"
        : outcome.restType.replace("_", " ");
    summary = `Applied ${restLabel} to ${targets.length} character(s).`;
    details.restType = outcome.restType;
  } else if (outcome.type === "log") {
    summary = outcome.message;
    details.message = outcome.message;
  } else if (outcome.type === "custom") {
    summary = outcome.label;
    details.metadata = outcome.metadata;
  }

  const updatedNode = success ? markOutcomeApplied(node, key) : node;
  let updatedPath = {
    ...path,
    nodes: path.nodes.map((entry) => (entry.id === node.id ? updatedNode : entry))
  };

  if (success) {
    updatedPath = appendPathHistory(updatedPath, {
      nodeId: node.id,
      action: "outcome_applied",
      summary,
      createdBy: seatContext?.currentUserId
    });
    await logPathAction(updatedPath, node, summary, details);
  }

  return {
    result: { success, summary, details },
    path: updatedPath,
    node: updatedNode
  };
}

export async function applyAllNodeOutcomes(args: {
  path: BranchingPath;
  node: PathNode;
  targetCharacterIds: string[];
  seatContext?: SeatContext;
  overrideExisting?: boolean;
}): Promise<{ path: BranchingPath; results: PathOutcomeResult[] }> {
  let currentPath = args.path;
  let currentNode = args.node;
  const results: PathOutcomeResult[] = [];

  for (let index = 0; index < (currentNode.outcomes ?? []).length; index += 1) {
    const outcome = currentNode.outcomes![index];
    const applied = await applyPathOutcome({
      path: currentPath,
      node: currentNode,
      outcome,
      targetCharacterIds: args.targetCharacterIds,
      seatContext: args.seatContext,
      options: { overrideExisting: args.overrideExisting, outcomeIndex: index }
    });
    currentPath = applied.path;
    currentNode = applied.node;
    results.push(applied.result);
  }

  return { path: currentPath, results };
}
