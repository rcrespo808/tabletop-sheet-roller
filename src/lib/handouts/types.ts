import type { RewardGrant } from "@/lib/loot/types";

export type HandoutVisibility = "gm_only" | "selected_players" | "campaign" | "public";

export type HandoutKind =
  | "lore"
  | "wanted_poster"
  | "spell_scroll"
  | "treasure_note"
  | "contract"
  | "clue"
  | "condition_notice"
  | "faction_letter";

export type Handout = {
  id: string;
  gameTableId: string;
  kind: HandoutKind;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  imagePath?: string;
  attachmentUrl?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  visibility: HandoutVisibility;
  selectedPlayerIds?: string[];
  tags: string[];
  gmNotes?: string;
  rewardPayloads?: RewardGrant[];
  codexEntryIds?: string[];
  revealedAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HandoutRewardApplication = {
  id: string;
  handoutId: string;
  characterId: string;
  gameTableId: string;
  appliedBy?: string;
  rewardSummary: string;
  createdAt: string;
};

export const LOCAL_DEMO_GAME_TABLE_ID = "local-demo-table";

export const HANDOUT_VISIBILITIES: HandoutVisibility[] = [
  "gm_only",
  "selected_players",
  "campaign",
  "public"
];

export const HANDOUT_KINDS: HandoutKind[] = [
  "lore",
  "wanted_poster",
  "spell_scroll",
  "treasure_note",
  "contract",
  "clue",
  "condition_notice",
  "faction_letter"
];
