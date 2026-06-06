import type { UserLevel } from "@/lib/sheets/types";

export type GameTable = {
  id: string;
  ownerUserId?: string;
  name: string;
  slug: string;
  joinCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GameTableMember = {
  tableId: string;
  userId: string;
  userLevel: UserLevel;
  joinedAt?: string;
};

export type GameTableCharacterAssignment = {
  tableId: string;
  characterId: string;
  userId: string;
  assignedBy?: string;
  assignedAt?: string;
};
