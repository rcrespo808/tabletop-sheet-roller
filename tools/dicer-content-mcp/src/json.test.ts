import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertProjectConfirmation } from "./config";
import { applyJsonPatchDocument, hashJson, requiresExpectedHash } from "./json";

describe("json helpers", () => {
  it("hashes canonically regardless of object key order", () => {
    assert.equal(hashJson({ b: 2, a: 1 }), hashJson({ a: 1, b: 2 }));
  });

  it("applies JSON Patch without mutating the original document", () => {
    const original = { inventory: [{ id: "item-1", quantity: 1 }] };
    const patched = applyJsonPatchDocument(original, [
      { op: "replace", path: "/inventory/0/quantity", value: 2 }
    ]);
    assert.deepEqual(original, { inventory: [{ id: "item-1", quantity: 1 }] });
    assert.deepEqual(patched, { inventory: [{ id: "item-1", quantity: 2 }] });
  });

  it("marks stateful tables as expected-hash protected", () => {
    assert.equal(requiresExpectedHash("character_profiles"), true);
    assert.equal(requiresExpectedHash("codex_entries"), false);
  });

  it("rejects project confirmation mismatches", () => {
    assert.throws(
      () => assertProjectConfirmation("wrong", "toogirtxlnsbtvmqcqgw"),
      /Project confirmation mismatch/
    );
  });
});
