import type {
  BranchingPath,
  PathEdge,
  PathNode,
  PathNodeKind,
  PathNodeStatus,
  PathOutcome,
  PathRequirement,
  PathStatus,
  PathVisibility
} from "@/lib/paths/types";
import {
  PATH_NODE_KINDS,
  PATH_NODE_STATUSES,
  PATH_STATUSES,
  PATH_VISIBILITIES
} from "@/lib/paths/types";
import type { RewardGrant } from "@/lib/loot/types";

export type BranchingPathRow = {
  id: string;
  game_table_id: string;
  name: string;
  description: string | null;
  status: string;
  visibility: string;
  selected_player_ids: string[] | null;
  current_node_ids: string[] | null;
  start_node_id: string | null;
  nodes: unknown;
  edges: unknown;
  gm_notes: string | null;
  tags: string[] | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function isPathStatus(value: unknown): value is PathStatus {
  return typeof value === "string" && PATH_STATUSES.includes(value as PathStatus);
}

function isPathVisibility(value: unknown): value is PathVisibility {
  return typeof value === "string" && PATH_VISIBILITIES.includes(value as PathVisibility);
}

function isPathNodeKind(value: unknown): value is PathNodeKind {
  return typeof value === "string" && PATH_NODE_KINDS.includes(value as PathNodeKind);
}

function isPathNodeStatus(value: unknown): value is PathNodeStatus {
  return typeof value === "string" && PATH_NODE_STATUSES.includes(value as PathNodeStatus);
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function parseRewardGrants(value: unknown): RewardGrant[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is RewardGrant => {
    return Boolean(entry && typeof entry === "object" && typeof (entry as RewardGrant).type === "string");
  });
}

function parseRequirements(value: unknown): PathRequirement[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PathRequirement => {
    return Boolean(entry && typeof entry === "object" && typeof (entry as PathRequirement).type === "string");
  });
}

function parseOutcomes(value: unknown): PathOutcome[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PathOutcome => {
    return Boolean(entry && typeof entry === "object" && typeof (entry as PathOutcome).type === "string");
  });
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function parsePathNode(value: unknown): PathNode | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;

  return {
    id: raw.id,
    title: raw.title,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
    kind: isPathNodeKind(raw.kind) ? raw.kind : "custom",
    status: isPathNodeStatus(raw.status) ? raw.status : "hidden",
    description: typeof raw.description === "string" ? raw.description : undefined,
    playerText: typeof raw.playerText === "string" ? raw.playerText : undefined,
    gmText: typeof raw.gmText === "string" ? raw.gmText : undefined,
    position:
      raw.position &&
      typeof raw.position === "object" &&
      typeof (raw.position as { x?: unknown }).x === "number" &&
      typeof (raw.position as { y?: unknown }).y === "number"
        ? { x: (raw.position as { x: number }).x, y: (raw.position as { y: number }).y }
        : undefined,
    icon: typeof raw.icon === "string" ? raw.icon : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    selectedPlayerIds: parseStringArray(raw.selectedPlayerIds),
    requirements: parseRequirements(raw.requirements),
    outcomes: parseOutcomes(raw.outcomes),
    metadata: parseMetadata(raw.metadata)
  };
}

export function parsePathEdge(value: unknown): PathEdge | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.fromNodeId !== "string" ||
    typeof raw.toNodeId !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    fromNodeId: raw.fromNodeId,
    toNodeId: raw.toNodeId,
    label: typeof raw.label === "string" ? raw.label : undefined,
    locked: raw.locked === true,
    requirementText: typeof raw.requirementText === "string" ? raw.requirementText : undefined,
    metadata: parseMetadata(raw.metadata)
  };
}

export function parsePathNodes(value: unknown): PathNode[] {
  if (!Array.isArray(value)) return [];
  return value.map(parsePathNode).filter((node): node is PathNode => node !== null);
}

export function parsePathEdges(value: unknown): PathEdge[] {
  if (!Array.isArray(value)) return [];
  return value.map(parsePathEdge).filter((edge): edge is PathEdge => edge !== null);
}

export function rowToBranchingPath(row: BranchingPathRow): BranchingPath {
  return {
    id: row.id,
    gameTableId: row.game_table_id,
    name: row.name,
    description: row.description ?? undefined,
    status: isPathStatus(row.status) ? row.status : "draft",
    visibility: isPathVisibility(row.visibility) ? row.visibility : "gm_only",
    selectedPlayerIds: parseStringArray(row.selected_player_ids),
    currentNodeIds: parseStringArray(row.current_node_ids),
    startNodeId: row.start_node_id ?? undefined,
    nodes: parsePathNodes(row.nodes),
    edges: parsePathEdges(row.edges),
    gmNotes: row.gm_notes ?? undefined,
    tags: parseStringArray(row.tags),
    metadata: parseMetadata(row.metadata),
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function pathToUpsert(path: BranchingPath) {
  const { getCurrentAuthState } = await import("@/lib/auth/supabaseAuth");
  const authState = await getCurrentAuthState();

  return {
    id: path.id || crypto.randomUUID(),
    game_table_id: path.gameTableId,
    name: path.name.trim(),
    description: path.description?.trim() || null,
    status: path.status,
    visibility: path.visibility,
    selected_player_ids: path.selectedPlayerIds ?? [],
    current_node_ids: path.currentNodeIds ?? [],
    start_node_id: path.startNodeId ?? null,
    nodes: path.nodes ?? [],
    edges: path.edges ?? [],
    gm_notes: path.gmNotes?.trim() || null,
    tags: (path.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    metadata: path.metadata ?? {},
    created_by: path.createdBy ?? authState.user?.id
  };
}
