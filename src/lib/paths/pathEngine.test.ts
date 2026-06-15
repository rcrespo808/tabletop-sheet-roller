import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canVisitNode,
  getAvailableNodes,
  resolveNode,
  revealNode,
  unlockConnectedNodes,
  visitNode
} from "@/lib/paths/pathEngine";
import type { BranchingPath } from "@/lib/paths/types";

function samplePath(): BranchingPath {
  return {
    id: "path-1",
    gameTableId: "table-1",
    name: "Test Path",
    status: "active",
    visibility: "campaign",
    currentNodeIds: ["n1"],
    startNodeId: "n1",
    nodes: [
      { id: "n1", title: "Start", kind: "start", status: "available" },
      { id: "n2", title: "Choice", kind: "choice", status: "hidden" },
      { id: "n3", title: "Loot", kind: "loot", status: "hidden" }
    ],
    edges: [
      { id: "e1", fromNodeId: "n1", toNodeId: "n2" },
      { id: "e2", fromNodeId: "n2", toNodeId: "n3" }
    ],
    tags: []
  };
}

describe("pathEngine", () => {
  it("visits an available node", () => {
    const updated = visitNode(samplePath(), "n1");
    const node = updated.nodes.find((entry) => entry.id === "n1");
    assert.equal(node?.status, "visited");
    assert.ok(updated.currentNodeIds.includes("n1"));
  });

  it("blocks visiting hidden nodes", () => {
    const check = canVisitNode(samplePath(), "n2");
    assert.equal(check.allowed, false);
  });

  it("reveals hidden nodes as available", () => {
    const revealed = revealNode(samplePath(), "n2");
    const node = revealed.nodes.find((entry) => entry.id === "n2");
    assert.equal(node?.status, "available");
  });

  it("resolving a node unlocks connected non-hidden targets", () => {
    let path = samplePath();
    path = revealNode(path, "n2");
    path = visitNode(path, "n1");
    path = resolveNode(path, "n1");
    const choice = path.nodes.find((entry) => entry.id === "n2");
    assert.equal(choice?.status, "available");
    const loot = path.nodes.find((entry) => entry.id === "n3");
    assert.equal(loot?.status, "hidden");
  });

  it("unlockConnectedNodes skips locked edges", () => {
    const path: BranchingPath = {
      ...samplePath(),
      edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2", locked: true }],
      nodes: [
        { id: "n1", title: "Start", kind: "start", status: "resolved" },
        { id: "n2", title: "Choice", kind: "choice", status: "hidden" }
      ]
    };
    const updated = unlockConnectedNodes(path, "n1");
    const node = updated.nodes.find((entry) => entry.id === "n2");
    assert.equal(node?.status, "hidden");
  });

  it("getAvailableNodes returns only available nodes", () => {
    const path = samplePath();
    assert.equal(getAvailableNodes(path).length, 1);
    assert.equal(getAvailableNodes(path)[0]?.id, "n1");
  });
});
