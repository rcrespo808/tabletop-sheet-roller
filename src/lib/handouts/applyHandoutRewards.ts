import { listCodexEntries } from "@/lib/codex/codexRepository";
import { applyRewardGrant } from "@/lib/loot/applyRewardGrant";
import {
  createHandoutRewardApplication,
  listHandoutRewardApplications
} from "@/lib/handouts/handoutRepository";
import type { CodexEntry } from "@/lib/codex/types";
import type { Handout, HandoutRewardApplication } from "@/lib/handouts/types";
import type { RewardGrant } from "@/lib/loot/types";
import { listCharacters, saveCharacter } from "@/lib/storage/characterRepository";

export type ApplyHandoutRewardsOptions = {
  overrideExisting?: boolean;
};

export type ApplyHandoutRewardsResult = {
  applications: HandoutRewardApplication[];
  skippedCharacterIds: string[];
};

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function describeRewardGrant(grant: RewardGrant, codexEntries: CodexEntry[] = []): string {
  if (grant.type === "currency") {
    return Object.entries(grant.walletDelta)
      .filter(([, value]) => Number.isFinite(value) && value !== 0)
      .map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${titleCase(key)}`)
      .join(", ");
  }
  if (grant.type === "xp") return `${grant.amount > 0 ? "+" : ""}${grant.amount} XP`;
  if (grant.type === "item") return `${grant.item.name} x${grant.item.quantity ?? 1}`;
  if (grant.type === "condition") return `Condition: ${grant.condition.name}`;
  if (grant.type === "codex") {
    const entry = codexEntries.find((codex) => codex.id === grant.codexEntryId);
    return `Codex: ${entry?.name ?? grant.codexEntryId}`;
  }
  return `Note: ${grant.title}`;
}

export function summarizeRewardPayloads(
  rewards: RewardGrant[] = [],
  codexEntries: CodexEntry[] = []
): string {
  return rewards.map((reward) => describeRewardGrant(reward, codexEntries)).join("; ");
}

export async function applyHandoutRewards(
  handout: Handout,
  targetCharacterIds: string[],
  options: ApplyHandoutRewardsOptions = {}
): Promise<ApplyHandoutRewardsResult> {
  const [characters, codexEntries, existingApplications] = await Promise.all([
    listCharacters(),
    listCodexEntries(),
    listHandoutRewardApplications(handout.gameTableId)
  ]);
  const applications: HandoutRewardApplication[] = [];
  const skippedCharacterIds: string[] = [];
  const rewardSummary = summarizeRewardPayloads(handout.rewardPayloads ?? [], codexEntries);

  for (const characterId of targetCharacterIds) {
    const character = characters.find((entry) => entry.id === characterId);
    if (!character) continue;
    const alreadyApplied = existingApplications.some((application) => {
      return application.handoutId === handout.id && application.characterId === characterId;
    });
    if (alreadyApplied && !options.overrideExisting) {
      skippedCharacterIds.push(characterId);
      continue;
    }

    let nextCharacter = character;
    for (const reward of handout.rewardPayloads ?? []) {
      const codexEntry =
        reward.type === "codex"
          ? codexEntries.find((entry) => entry.id === reward.codexEntryId)
          : undefined;
      nextCharacter = applyRewardGrant(
        nextCharacter,
        reward,
        {
          handoutId: handout.id,
          handoutTitle: handout.title
        },
        { codexEntry }
      );
    }

    await saveCharacter(nextCharacter);
    applications.push(
      await createHandoutRewardApplication({
        handoutId: handout.id,
        characterId,
        gameTableId: handout.gameTableId,
        rewardSummary
      })
    );
  }

  return { applications, skippedCharacterIds };
}
