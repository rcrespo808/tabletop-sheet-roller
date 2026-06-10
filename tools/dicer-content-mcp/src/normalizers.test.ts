import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeContentPackRows } from "./normalizers";
import { validateContentPack } from "./schemas";

describe("content pack normalization", () => {
  it("adds manifest metadata where table metadata exists", () => {
    const pack = validateContentPack({
      contentPackId: "pack-1",
      runId: "run-1",
      generatedAt: "2026-06-06T00:00:00.000Z",
      theme: { name: "Ash Market", system: "dnd5e" },
      rows: {
        markets: [
          {
            id: "00000000-0000-4000-8000-000000000401",
            gameTableId: "00000000-0000-4000-8000-000000000013",
            name: "Ash Market",
            status: "draft",
            stores: [],
            metadata: { purpose: "test" }
          }
        ]
      }
    });
    const { rows, errors } = normalizeContentPackRows(pack);
    assert.deepEqual(errors, []);
    const row = rows[0].row;
    assert.equal((row.metadata as Record<string, unknown>).generatedBy, "dicer-content-mcp");
    assert.equal((row.metadata as Record<string, unknown>).contentPackId, "pack-1");
    assert.equal((row.metadata as Record<string, unknown>).purpose, "test");
  });
});
