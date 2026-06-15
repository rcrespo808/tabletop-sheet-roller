import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePath, validatePathJson } from "@/lib/paths/pathValidation";
import type { BranchingPath } from "@/lib/paths/types";

describe("pathValidation", () => {
  it("accepts a valid path", () => {
    const path: BranchingPath = {
      id: "p1",
      gameTableId: "t1",
      name: "Valid",
      status: "draft",
      visibility: "gm_only",
      currentNodeIds: ["n1"],
      startNodeId: "n1",
      nodes: [{ id: "n1", title: "Start", kind: "start", status: "available" }],
      edges: [],
      tags: []
    };
    const result = validatePath(path);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("rejects duplicate node ids", () => {
    const path: BranchingPath = {
      id: "p1",
      gameTableId: "t1",
      name: "Invalid",
      status: "draft",
      visibility: "gm_only",
      currentNodeIds: [],
      nodes: [
        { id: "n1", title: "A", kind: "start", status: "available" },
        { id: "n1", title: "B", kind: "story", status: "hidden" }
      ],
      edges: [],
      tags: []
    };
    const result = validatePath(path);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("Duplicate node id")));
  });

  it("rejects edges with missing endpoints", () => {
    const path: BranchingPath = {
      id: "p1",
      gameTableId: "t1",
      name: "Invalid",
      status: "draft",
      visibility: "gm_only",
      currentNodeIds: [],
      nodes: [{ id: "n1", title: "Start", kind: "start", status: "available" }],
      edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "missing" }],
      tags: []
    };
    const result = validatePath(path);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("missing toNodeId")));
  });

  it("validatePathJson rejects malformed input", () => {
    const result = validatePathJson({ foo: "bar" });
    assert.equal(result.path, null);
    assert.ok(result.errors.length > 0);
  });
});
