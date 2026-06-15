import { parsePathEdges, parsePathNodes } from "@/lib/paths/pathMappers";
import {
  PATH_NODE_KINDS,
  PATH_NODE_STATUSES,
  PATH_STATUSES,
  PATH_VISIBILITIES,
  type BranchingPath,
  type PathStatus,
  type PathVisibility
} from "@/lib/paths/types";

export type PathValidationResult = {
  valid: boolean;
  errors: string[];
};

function isPathStatus(value: unknown): value is PathStatus {
  return typeof value === "string" && PATH_STATUSES.includes(value as PathStatus);
}

function isPathVisibility(value: unknown): value is PathVisibility {
  return typeof value === "string" && PATH_VISIBILITIES.includes(value as PathVisibility);
}

export function validatePath(path: BranchingPath): PathValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of path.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    nodeIds.add(node.id);
    if (!PATH_NODE_KINDS.includes(node.kind)) errors.push(`Invalid node kind on ${node.id}`);
    if (!PATH_NODE_STATUSES.includes(node.status)) errors.push(`Invalid node status on ${node.id}`);
  }

  for (const edge of path.edges) {
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push(`Edge ${edge.id} references missing fromNodeId ${edge.fromNodeId}`);
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push(`Edge ${edge.id} references missing toNodeId ${edge.toNodeId}`);
    }
  }

  if (path.startNodeId && !nodeIds.has(path.startNodeId)) {
    errors.push(`startNodeId ${path.startNodeId} does not exist.`);
  }

  for (const nodeId of path.currentNodeIds) {
    if (!nodeIds.has(nodeId)) errors.push(`currentNodeId ${nodeId} does not exist.`);
  }

  if (!path.name.trim()) errors.push("Path name is required.");

  return { valid: errors.length === 0, errors };
}

export function validatePathJson(json: unknown): { path: BranchingPath | null; errors: string[] } {
  if (!json || typeof json !== "object") {
    return { path: null, errors: ["JSON must be an object."] };
  }

  const raw = json as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof raw.name !== "string" || !raw.name.trim()) {
    errors.push("Path name is required.");
  }

  const nodes = parsePathNodes(raw.nodes);
  const edges = parsePathEdges(raw.edges);

  if (Array.isArray(raw.nodes) && nodes.length !== raw.nodes.length) {
    errors.push("One or more nodes are malformed.");
  }
  if (Array.isArray(raw.edges) && edges.length !== raw.edges.length) {
    errors.push("One or more edges are malformed.");
  }

  const path: BranchingPath = {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    gameTableId: typeof raw.gameTableId === "string" ? raw.gameTableId : "",
    name: typeof raw.name === "string" ? raw.name : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: isPathStatus(raw.status) ? raw.status : "draft",
    visibility: isPathVisibility(raw.visibility) ? raw.visibility : "gm_only",
    selectedPlayerIds: Array.isArray(raw.selectedPlayerIds)
      ? raw.selectedPlayerIds.filter((id): id is string => typeof id === "string")
      : [],
    currentNodeIds: Array.isArray(raw.currentNodeIds)
      ? raw.currentNodeIds.filter((id): id is string => typeof id === "string")
      : [],
    startNodeId: typeof raw.startNodeId === "string" ? raw.startNodeId : undefined,
    nodes,
    edges,
    gmNotes: typeof raw.gmNotes === "string" ? raw.gmNotes : undefined,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    metadata:
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined
  };

  const validation = validatePath(path);
  errors.push(...validation.errors);

  if (errors.length > 0) return { path: null, errors };
  return { path, errors: [] };
}

export function exportPathJson(path: BranchingPath): string {
  return JSON.stringify(path, null, 2);
}
