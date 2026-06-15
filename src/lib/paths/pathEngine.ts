import type { CharacterProfile } from "@/lib/sheets/types";
import type { SeatContext } from "@/lib/session/permissions";
import {
  PATH_HISTORY_CAP,
  type BranchingPath,
  type PathHistoryEntry,
  type PathNode,
  type PathRequirement
} from "@/lib/paths/types";

export type VisitContext = {
  seat?: SeatContext;
  characters?: CharacterProfile[];
};

export function getPathHistory(path: BranchingPath): PathHistoryEntry[] {
  const history = path.metadata?.history;
  if (!Array.isArray(history)) return [];
  return history.filter(
    (entry): entry is PathHistoryEntry =>
      Boolean(
        entry &&
          typeof entry === "object" &&
          typeof (entry as PathHistoryEntry).id === "string" &&
          typeof (entry as PathHistoryEntry).summary === "string"
      )
  );
}

export function appendPathHistory(
  path: BranchingPath,
  entry: Omit<PathHistoryEntry, "id" | "pathId" | "createdAt"> & { id?: string; createdAt?: string }
): BranchingPath {
  const history = getPathHistory(path);
  const nextEntry: PathHistoryEntry = {
    id: entry.id ?? crypto.randomUUID(),
    pathId: path.id,
    nodeId: entry.nodeId,
    action: entry.action,
    summary: entry.summary,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt ?? new Date().toISOString()
  };

  const capped = [nextEntry, ...history].slice(0, PATH_HISTORY_CAP);

  return {
    ...path,
    metadata: {
      ...(path.metadata ?? {}),
      history: capped
    }
  };
}

function updateNode(path: BranchingPath, nodeId: string, patch: Partial<PathNode>): BranchingPath {
  return {
    ...path,
    nodes: path.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node))
  };
}

function getNode(path: BranchingPath, nodeId: string): PathNode | undefined {
  return path.nodes.find((node) => node.id === nodeId);
}

export function getAvailableNodes(path: BranchingPath): PathNode[] {
  return path.nodes.filter((node) => node.status === "available");
}

export function getVisibleNodes(path: BranchingPath, seatContext?: SeatContext): PathNode[] {
  const isGm = seatContext?.role === "gm";

  return path.nodes.filter((node) => {
    if (isGm) return true;
    if (node.status === "hidden") return false;
    if (node.selectedPlayerIds?.length && seatContext?.currentUserId) {
      return node.selectedPlayerIds.includes(seatContext.currentUserId);
    }
    return true;
  });
}

function evaluateRequirement(
  requirement: PathRequirement,
  path: BranchingPath,
  context?: VisitContext
): { met: boolean; reason?: string } {
  if (requirement.type === "node_resolved") {
    const node = getNode(path, requirement.nodeId);
    if (node?.status === "resolved") return { met: true };
    return { met: false, reason: `Requires node "${node?.title ?? requirement.nodeId}" to be resolved.` };
  }

  if (requirement.type === "gm_unlock") {
    return { met: false, reason: requirement.label || "Requires GM unlock." };
  }

  if (requirement.type === "character_has_item") {
    const characters = context?.characters ?? [];
    const targetChars = requirement.characterId
      ? characters.filter((c) => c.id === requirement.characterId)
      : characters;
    const hasItem = targetChars.some((character) =>
      (character.inventory ?? []).some(
        (item) =>
          item.name.toLowerCase() === requirement.itemName.toLowerCase() &&
          (item.quantity ?? 1) >= (requirement.quantity ?? 1)
      )
    );
    if (hasItem) return { met: true };
    return { met: false, reason: `Requires item "${requirement.itemName}".` };
  }

  if (requirement.type === "character_has_condition") {
    const characters = context?.characters ?? [];
    const targetChars = requirement.characterId
      ? characters.filter((c) => c.id === requirement.characterId)
      : characters;
    const hasCondition = targetChars.some((character) =>
      (character.conditions ?? []).some(
        (condition) => condition.name.toLowerCase() === requirement.conditionName.toLowerCase()
      )
    );
    if (hasCondition) return { met: true };
    return { met: false, reason: `Requires condition "${requirement.conditionName}".` };
  }

  if (requirement.type === "wallet_minimum") {
    const characters = context?.characters ?? [];
    const hasFunds = characters.some((character) => {
      const wallet = character.wallet ?? {};
      const standard = wallet[requirement.currency as keyof typeof wallet];
      const value =
        typeof standard === "number"
          ? standard
          : (wallet.custom?.[requirement.currency] ?? 0);
      return value >= requirement.amount;
    });
    if (hasFunds) return { met: true };
    return { met: false, reason: `Requires ${requirement.amount} ${requirement.currency}.` };
  }

  if (requirement.type === "custom") {
    return { met: false, reason: requirement.label || "Custom requirement not met." };
  }

  return { met: false, reason: "Unknown requirement." };
}

export function canVisitNode(
  path: BranchingPath,
  nodeId: string,
  context?: VisitContext
): { allowed: boolean; reason?: string } {
  const node = getNode(path, nodeId);
  if (!node) return { allowed: false, reason: "Node not found." };
  if (node.status === "locked") return { allowed: false, reason: "Node is locked." };
  if (node.status === "hidden") return { allowed: false, reason: "Node is hidden." };
  if (node.status === "resolved" || node.status === "skipped") {
    return { allowed: false, reason: "Node already resolved or skipped." };
  }

  for (const requirement of node.requirements ?? []) {
    const result = evaluateRequirement(requirement, path, context);
    if (!result.met) return { allowed: false, reason: result.reason };
  }

  return { allowed: true };
}

export function visitNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const check = canVisitNode(path, nodeId);
  if (!check.allowed) throw new Error(check.reason ?? "Cannot visit node.");

  let updated = updateNode(path, nodeId, { status: "visited" });
  updated = {
    ...updated,
    currentNodeIds: Array.from(new Set([...updated.currentNodeIds, nodeId]))
  };
  updated = appendPathHistory(updated, {
    nodeId,
    action: "visited",
    summary: `Visited "${getNode(updated, nodeId)?.title ?? nodeId}".`,
    createdBy
  });

  return updated;
}

export function unlockConnectedNodes(path: BranchingPath, nodeId: string): BranchingPath {
  const outgoing = path.edges.filter((edge) => edge.fromNodeId === nodeId && !edge.locked);

  let updated = path;
  for (const edge of outgoing) {
    const target = getNode(updated, edge.toNodeId);
    if (!target || target.status === "locked") continue;
    if (target.status === "hidden" || target.status === "available" || target.status === "visited") {
      continue;
    }
    if (target.status === "resolved" || target.status === "failed" || target.status === "skipped") {
      continue;
    }
    updated = updateNode(updated, edge.toNodeId, { status: "available" });
  }

  return updated;
}

export function resolveNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, { status: "resolved" });
  updated = unlockConnectedNodes(updated, nodeId);
  updated = appendPathHistory(updated, {
    nodeId,
    action: "resolved",
    summary: `Resolved "${node.title}".`,
    createdBy
  });

  return updated;
}

export function revealNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, {
    status: node.status === "hidden" ? "available" : node.status
  });
  updated = appendPathHistory(updated, {
    nodeId,
    action: "node_revealed",
    summary: `Revealed "${node.title}".`,
    createdBy
  });

  return updated;
}

export function hideNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, { status: "hidden" });
  updated = appendPathHistory(updated, {
    nodeId,
    action: "node_hidden",
    summary: `Hidden "${node.title}".`,
    createdBy
  });

  return updated;
}

export function lockNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, { status: "locked" });
  updated = appendPathHistory(updated, {
    nodeId,
    action: "node_locked",
    summary: `Locked "${node.title}".`,
    createdBy
  });

  return updated;
}

export function unlockNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, {
    status: node.status === "locked" ? "available" : node.status
  });
  updated = appendPathHistory(updated, {
    nodeId,
    action: "node_unlocked",
    summary: `Unlocked "${node.title}".`,
    createdBy
  });

  return updated;
}

export function failNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, { status: "failed" });
  updated = appendPathHistory(updated, {
    nodeId,
    action: "failed",
    summary: `Failed "${node.title}".`,
    createdBy
  });

  return updated;
}

export function skipNode(path: BranchingPath, nodeId: string, createdBy?: string): BranchingPath {
  const node = getNode(path, nodeId);
  if (!node) throw new Error("Node not found.");

  let updated = updateNode(path, nodeId, { status: "skipped" });
  updated = unlockConnectedNodes(updated, nodeId);
  updated = appendPathHistory(updated, {
    nodeId,
    action: "skipped",
    summary: `Skipped "${node.title}".`,
    createdBy
  });

  return updated;
}

export function getConnectedNodes(path: BranchingPath, nodeId: string): PathNode[] {
  const targetIds = new Set(
    path.edges.filter((edge) => edge.fromNodeId === nodeId).map((edge) => edge.toNodeId)
  );
  return path.nodes.filter((node) => targetIds.has(node.id));
}

export function getIncomingEdges(path: BranchingPath, nodeId: string) {
  return path.edges.filter((edge) => edge.toNodeId === nodeId);
}

export function getOutgoingEdges(path: BranchingPath, nodeId: string) {
  return path.edges.filter((edge) => edge.fromNodeId === nodeId);
}
