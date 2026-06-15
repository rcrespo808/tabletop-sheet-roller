"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
import { applyAllNodeOutcomes, applyPathOutcome } from "@/lib/paths/applyPathOutcome";
import {
  getConnectedNodes,
  getIncomingEdges,
  getOutgoingEdges
} from "@/lib/paths/pathEngine";
import type { BranchingPath, PathNode } from "@/lib/paths/types";
import type { CharacterProfile } from "@/lib/sheets/types";

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeOutcome(outcome: NonNullable<PathNode["outcomes"]>[number]): string {
  if (outcome.type === "reward_grant") return `Rewards: ${outcome.label}`;
  if (outcome.type === "handout_reveal") return `Reveal handout ${outcome.handoutId}`;
  if (outcome.type === "loot_roll") return `Roll loot table ${outcome.lootTableId}`;
  if (outcome.type === "market_open") return `Open market ${outcome.marketId}`;
  if (outcome.type === "combat_start") {
    return outcome.encounterId
      ? `Combat encounter ${outcome.encounterId}`
      : `Start combat${outcome.notes ? `: ${outcome.notes}` : ""}`;
  }
  if (outcome.type === "codex_unlock") return `Unlock codex: ${outcome.codexEntryIds.join(", ")}`;
  if (outcome.type === "condition_apply") return `Apply condition: ${outcome.conditionName}`;
  if (outcome.type === "rest") return `Rest: ${outcome.restType.replace("_", " ")}`;
  if (outcome.type === "log") return outcome.message;
  if (outcome.type === "custom") return outcome.label;
  return "Unknown outcome";
}

export function PathNodeDetail({
  path,
  node,
  isManageMode,
  characters,
  targetCharacterIds,
  onTargetCharacterIdsChange,
  overrideExisting,
  onOverrideExistingChange,
  onPathUpdated,
  onMessage,
  onError
}: {
  path: BranchingPath;
  node: PathNode;
  isManageMode: boolean;
  characters: CharacterProfile[];
  targetCharacterIds: string[];
  onTargetCharacterIdsChange: (ids: string[]) => void;
  overrideExisting: boolean;
  onOverrideExistingChange: (value: boolean) => void;
  onPathUpdated: (path: BranchingPath) => Promise<BranchingPath | void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const incoming = getIncomingEdges(path, node.id);
  const outgoing = getOutgoingEdges(path, node.id);
  const connected = getConnectedNodes(path, node.id);
  const appliedKeys = Array.isArray(node.metadata?.appliedOutcomeKeys)
    ? (node.metadata.appliedOutcomeKeys as string[])
    : [];

  async function applyOutcome(index: number) {
    const outcome = node.outcomes?.[index];
    if (!outcome) return;
    try {
      const result = await applyPathOutcome({
        path,
        node,
        outcome,
        targetCharacterIds,
        options: { overrideExisting, outcomeIndex: index }
      });
      await onPathUpdated(result.path);
      if (result.result.skipped) {
        onError(result.result.summary);
      } else if (result.result.success) {
        onMessage(result.result.summary);
      } else {
        onError(result.result.summary);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to apply outcome.");
    }
  }

  async function applyAllOutcomes() {
    try {
      const result = await applyAllNodeOutcomes({
        path,
        node,
        targetCharacterIds,
        overrideExisting
      });
      await onPathUpdated(result.path);
      const summaries = result.results.map((entry) => entry.summary).join("; ");
      onMessage(summaries || "Outcomes applied.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to apply outcomes.");
    }
  }

  function toggleCharacter(characterId: string) {
    if (targetCharacterIds.includes(characterId)) {
      onTargetCharacterIdsChange(targetCharacterIds.filter((id) => id !== characterId));
    } else {
      onTargetCharacterIdsChange([...targetCharacterIds, characterId]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-violet-500/30 bg-violet-950/40 px-2.5 py-1 text-xs font-semibold uppercase text-violet-100">
          {node.kind.replace("_", " ")}
        </span>
        <span className="rounded-full border border-slate-600/40 px-2.5 py-1 text-xs font-semibold uppercase text-slate-300">
          {node.status}
        </span>
      </div>

      {node.subtitle ? <p className="text-sm text-muted-foreground">{node.subtitle}</p> : null}
      {node.description ? <p className="text-sm text-foreground">{node.description}</p> : null}
      {node.playerText ? (
        <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Player text</p>
          <p className="mt-1 text-sm text-violet-50">{node.playerText}</p>
        </div>
      ) : null}
      {isManageMode && node.gmText ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">GM text</p>
          <p className="mt-1 text-sm text-amber-50">{node.gmText}</p>
        </div>
      ) : null}

      {(node.requirements?.length ?? 0) > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requirements
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {node.requirements!.map((req, index) => (
              <li className="rounded border border-slate-700/30 bg-slate-950/40 px-3 py-2" key={index}>
                {req.type === "node_resolved" && `Node resolved: ${req.nodeId}`}
                {req.type === "gm_unlock" && `GM unlock: ${req.label}`}
                {req.type === "character_has_item" &&
                  `Has item: ${req.itemName}${req.quantity ? ` x${req.quantity}` : ""}`}
                {req.type === "character_has_condition" && `Has condition: ${req.conditionName}`}
                {req.type === "wallet_minimum" && `Wallet: ${req.amount} ${req.currency}`}
                {req.type === "custom" && req.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(node.outcomes?.length ?? 0) > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outcomes
          </h4>
          <ul className="mt-2 space-y-2">
            {node.outcomes!.map((outcome, index) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700/30 bg-slate-950/40 px-3 py-2"
                key={index}
              >
                <span className="text-sm text-foreground">{describeOutcome(outcome)}</span>
                {isManageMode ? (
                  <button
                    className="rounded-md border border-violet-500/35 bg-violet-950/40 px-2.5 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-900/50"
                    onClick={() => applyOutcome(index)}
                    type="button"
                  >
                    Apply
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {appliedKeys.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {appliedKeys.length} outcome(s) already applied on this node.
            </p>
          ) : null}
        </div>
      ) : null}

      {isManageMode && (node.outcomes?.length ?? 0) > 0 ? (
        <div className="rounded-lg border border-slate-700/30 bg-slate-950/40 p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Apply to characters
          </h4>
          <div className="flex flex-wrap gap-2">
            {characters.map((character) => (
              <button
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                  targetCharacterIds.includes(character.id)
                    ? "border-violet-500/45 bg-violet-500/20 text-violet-100"
                    : "border-slate-600/40 bg-slate-900/50 text-slate-300 hover:bg-slate-800/60"
                }`}
                key={character.id}
                onClick={() => toggleCharacter(character.id)}
                type="button"
              >
                {character.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              checked={overrideExisting}
              onChange={(event) => onOverrideExistingChange(event.target.checked)}
              type="checkbox"
            />
            Override already-applied outcomes
          </label>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-100 hover:bg-violet-900/50"
            onClick={applyAllOutcomes}
            type="button"
          >
            Apply all outcomes
          </button>
        </div>
      ) : null}

      {node.kind === "combat" || node.kind === "boss" ? (
        <div className="rounded-lg border border-red-500/25 bg-red-950/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-red-300">Combat node</p>
          {node.outcomes?.find((o) => o.type === "combat_start") ? (
            <p className="mt-1 text-sm text-red-50">
              {(node.outcomes.find((o) => o.type === "combat_start") as { notes?: string })?.notes ??
                "Linked combat outcome configured."}
            </p>
          ) : (
            <p className="mt-1 text-sm text-red-50">No combat outcome configured.</p>
          )}
          {isManageMode ? (
            <Link
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-200 hover:text-red-100"
              href="/combat"
            >
              <Swords className="h-4 w-4" />
              Open Combat
            </Link>
          ) : null}
        </div>
      ) : null}

      {node.kind === "choice" && outgoing.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Branches
          </h4>
          <ul className="mt-2 space-y-1">
            {outgoing.map((edge) => {
              const target = path.nodes.find((entry) => entry.id === edge.toNodeId);
              return (
                <li
                  className="rounded border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-50"
                  key={edge.id}
                >
                  {edge.label ?? "Continue"} -&gt; {target?.title ?? edge.toNodeId}
                  {edge.locked ? " (locked)" : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {connected.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connected next nodes
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {connected.map((next) => (
              <li className="rounded border border-slate-700/30 px-3 py-2" key={next.id}>
                {next.title}{" "}
                <span className="text-xs text-muted-foreground">({titleCase(next.status)})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {incoming.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Incoming links
          </h4>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {incoming.map((edge) => {
              const source = path.nodes.find((entry) => entry.id === edge.fromNodeId);
              return (
                <li key={edge.id}>
                  {source?.title ?? edge.fromNodeId} -&gt; {node.title}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
