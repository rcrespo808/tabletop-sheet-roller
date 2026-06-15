import type { RewardGrant } from "@/lib/loot/types";

export type PathStatus = "draft" | "active" | "completed" | "archived";

export type PathVisibility = "gm_only" | "selected_players" | "campaign" | "public";

export type PathNodeKind =
  | "start"
  | "story"
  | "choice"
  | "combat"
  | "loot"
  | "handout"
  | "market"
  | "rest"
  | "skill_check"
  | "codex"
  | "condition"
  | "reward"
  | "boss"
  | "exit"
  | "custom";

export type PathNodeStatus =
  | "hidden"
  | "available"
  | "visited"
  | "resolved"
  | "locked"
  | "failed"
  | "skipped";

export type PathRequirement =
  | { type: "node_resolved"; nodeId: string }
  | { type: "character_has_item"; characterId?: string; itemName: string; quantity?: number }
  | { type: "character_has_condition"; characterId?: string; conditionName: string }
  | { type: "wallet_minimum"; currency: string; amount: number }
  | { type: "gm_unlock"; label: string }
  | { type: "custom"; label: string; metadata?: Record<string, unknown> };

export type PathOutcome =
  | {
      type: "reward_grant";
      label: string;
      grants: RewardGrant[];
      targetMode: "selected_characters" | "party" | "manual";
    }
  | { type: "handout_reveal"; handoutId: string }
  | {
      type: "loot_roll";
      lootTableId: string;
      targetMode: "selected_characters" | "party" | "manual";
    }
  | { type: "market_open"; marketId: string }
  | {
      type: "combat_start";
      encounterId?: string;
      npcTemplateIds?: string[];
      notes?: string;
    }
  | { type: "codex_unlock"; codexEntryIds: string[] }
  | {
      type: "condition_apply";
      conditionName: string;
      description?: string;
      targetMode: "selected_characters" | "party" | "manual";
    }
  | {
      type: "rest";
      restType: "short_rest" | "long_rest" | "safe_camp";
      targetMode: "selected_characters" | "party" | "manual";
    }
  | { type: "log"; message: string }
  | { type: "custom"; label: string; metadata?: Record<string, unknown> };

export type PathNode = {
  id: string;
  title: string;
  subtitle?: string;
  kind: PathNodeKind;
  status: PathNodeStatus;
  description?: string;
  playerText?: string;
  gmText?: string;
  position?: { x: number; y: number };
  icon?: string;
  imageUrl?: string;
  selectedPlayerIds?: string[];
  requirements?: PathRequirement[];
  outcomes?: PathOutcome[];
  metadata?: Record<string, unknown>;
};

export type PathEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  locked?: boolean;
  requirementText?: string;
  metadata?: Record<string, unknown>;
};

export type BranchingPath = {
  id: string;
  gameTableId: string;
  name: string;
  description?: string;
  status: PathStatus;
  visibility: PathVisibility;
  selectedPlayerIds?: string[];
  currentNodeIds: string[];
  startNodeId?: string;
  nodes: PathNode[];
  edges: PathEdge[];
  gmNotes?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PathHistoryEntry = {
  id: string;
  pathId: string;
  nodeId?: string;
  action:
    | "created"
    | "activated"
    | "visited"
    | "resolved"
    | "failed"
    | "skipped"
    | "outcome_applied"
    | "node_revealed"
    | "node_hidden"
    | "node_locked"
    | "node_unlocked";
  summary: string;
  createdBy?: string;
  createdAt: string;
};

export type PathOutcomeResult = {
  success: boolean;
  summary: string;
  skipped?: boolean;
  details?: Record<string, unknown>;
};

export const LOCAL_DEMO_GAME_TABLE_ID = "local-demo-table";

export const PATH_STATUSES: PathStatus[] = ["draft", "active", "completed", "archived"];

export const PATH_VISIBILITIES: PathVisibility[] = [
  "gm_only",
  "selected_players",
  "campaign",
  "public"
];

export const PATH_NODE_KINDS: PathNodeKind[] = [
  "start",
  "story",
  "choice",
  "combat",
  "loot",
  "handout",
  "market",
  "rest",
  "skill_check",
  "codex",
  "condition",
  "reward",
  "boss",
  "exit",
  "custom"
];

export const PATH_NODE_STATUSES: PathNodeStatus[] = [
  "hidden",
  "available",
  "visited",
  "resolved",
  "locked",
  "failed",
  "skipped"
];

export const PATH_HISTORY_CAP = 200;
