import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { hashJson } from "./json";
import { applyContentPack, handleUpdateCharacterProfile, patchJsonRows, previewContentPack } from "./tools";

type TableStore = Record<string, Record<string, unknown>>;

class FakeSupabaseClient {
  db: Record<string, TableStore>;

  constructor(seed: Record<string, TableStore> = {}) {
    this.db = seed;
  }

  from(table: string) {
    this.db[table] ??= {};
    return new FakeQuery(this.db, table);
  }
}

class FakeQuery {
  private mode: "select" | "upsert" | "update" = "select";
  private filters: Array<[string, unknown]> = [];
  private upsertRows: Record<string, unknown>[] = [];
  private updateValues: Record<string, unknown> = {};
  private head = false;
  private maxRows?: number;

  constructor(
    private db: Record<string, TableStore>,
    private table: string
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.head = Boolean(options?.head);
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  limit(maxRows: number) {
    this.maxRows = maxRows;
    return this;
  }

  upsert(rows: Record<string, unknown>[]) {
    this.mode = "upsert";
    this.upsertRows = rows;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.mode = "update";
    this.updateValues = values;
    return this;
  }

  async maybeSingle() {
    const rows = this.readRows();
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    const result = await this.execute();
    return { data: Array.isArray(result.data) ? result.data[0] : result.data, error: result.error };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; count?: number; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    if (this.mode === "upsert") {
      for (const row of this.upsertRows) {
        this.db[this.table][String(row.id)] = { ...(this.db[this.table][String(row.id)] ?? {}), ...row };
      }
      return { data: this.upsertRows, error: null };
    }

    if (this.mode === "update") {
      const rows = this.readRows();
      for (const row of rows) {
        Object.assign(row, this.updateValues);
      }
      return { data: rows, error: null };
    }

    const rows = this.readRows();
    return {
      data: this.head ? null : rows,
      count: rows.length,
      error: null
    };
  }

  private readRows() {
    let rows = Object.values(this.db[this.table] ?? {});
    for (const [column, value] of this.filters) {
      rows = rows.filter((row) => row[column] === value);
    }
    return typeof this.maxRows === "number" ? rows.slice(0, this.maxRows) : rows;
  }
}

const config = {
  cwd: process.cwd(),
  supabaseUrl: "https://toogirtxlnsbtvmqcqgw.supabase.co",
  serviceRoleKey: "test-service-role",
  serviceRoleKeyKind: "SUPABASE_SECRET_KEY" as const,
  projectRef: "toogirtxlnsbtvmqcqgw",
  openAiApiKey: "test-openai",
  model: "gpt-5.5",
  runDir: path.join(tmpdir(), "dicer-content-mcp-test-runs")
};

describe("MCP tool handlers with mock Supabase", () => {
  it("previews expected-hash failures before stateful updates", async () => {
    const existing = {
      id: "npc-existing",
      name: "Existing",
      default_system: "dnd5e",
      sheets: {},
      inventory: [],
      wallet: {},
      reward_history: [],
      progression: {},
      conditions: []
    };
    const client = new FakeSupabaseClient({ character_profiles: { "npc-existing": existing } });
    const preview = await previewContentPack(
      {
        contentPackId: "pack-hash",
        runId: "run-hash",
        theme: { name: "Hash Test", system: "dnd5e" },
        rows: {
          character_profiles: [
            {
              ...existing,
              inventory: [{ id: "item-1", name: "Changed", quantity: 1 }],
              _expectedHash: "bad-hash"
            }
          ]
        }
      },
      { checkCloud: true },
      config,
      client
    );

    assert.equal(preview.ok, false);
    assert.match(preview.errors.join("\n"), /expectedHash mismatch/);
  });

  it("applies preview-safe upserts", async () => {
    const client = new FakeSupabaseClient();
    const result = await applyContentPack(
      {
        contentPackId: "pack-apply",
        runId: "run-apply",
        theme: { name: "Market", system: "dnd5e" },
        rows: {
          markets: [
            {
              id: "00000000-0000-4000-8000-000000000501",
              game_table_id: "00000000-0000-4000-8000-000000000013",
              name: "Preview Market",
              status: "draft",
              stores: [],
              metadata: {}
            }
          ]
        }
      },
      { confirmProjectRef: "toogirtxlnsbtvmqcqgw" },
      config,
      client
    );

    assert.equal(result.ok, true);
    assert.equal(result.written[0].table, "markets");
    assert.equal(client.db.markets["00000000-0000-4000-8000-000000000501"].name, "Preview Market");
  });

  it("patches JSON rows only when expected hash matches", async () => {
    const existing = {
      id: "roll-1",
      details: { metadata: { source: "test" }, result: 3 }
    };
    const expectedHash = hashJson(existing.details);
    const client = new FakeSupabaseClient({ roll_logs: { "roll-1": existing } });

    const result = await patchJsonRows(
      [
        {
          table: "roll_logs",
          id: "roll-1",
          column: "details",
          expectedHash,
          operations: [{ op: "replace", path: "/result", value: 4 }]
        }
      ],
      { confirmProjectRef: "toogirtxlnsbtvmqcqgw" },
      config,
      client
    );

    assert.equal(result.ok, true);
    assert.deepEqual(client.db.roll_logs["roll-1"].details, {
      metadata: { source: "test" },
      result: 4
    });
  });

  it("updates character scalars and JSON columns in one call", async () => {
    const existing = {
      id: "bruno",
      name: "Bruno",
      subtitle: "Boxer",
      concept: "Old concept",
      default_system: "nwod",
      sheets: {
        dnd5e: {
          actions: [{ id: "jab", type: "dnd-roll", label: "Jab", roll: "1d20+6" }]
        }
      },
      inventory: [{ id: "wraps", name: "Wraps", quantity: 1 }],
      wallet: {},
      reward_history: [],
      progression: {},
      conditions: []
    };
    const client = new FakeSupabaseClient({ character_profiles: { bruno: existing } });

    const result = await handleUpdateCharacterProfile(
      {
        id: "bruno",
        confirmProjectRef: "toogirtxlnsbtvmqcqgw",
        scalars: {
          subtitle: "Longsword Fighter"
        },
        json: {
          inventory: [{ id: "sword", name: "Heirloom Sword", quantity: 1 }]
        },
        patches: [
          {
            column: "sheets",
            operations: [{ op: "replace", path: "/dnd5e/actions/0/label", value: "Longsword Cut" }]
          }
        ]
      },
      config,
      client
    );

    assert.equal(result.ok, true);
    assert.equal(client.db.character_profiles.bruno.subtitle, "Longsword Fighter");
    assert.deepEqual(client.db.character_profiles.bruno.inventory, [
      { id: "sword", name: "Heirloom Sword", quantity: 1 }
    ]);
    assert.equal(
      (client.db.character_profiles.bruno.sheets as any).dnd5e.actions[0].label,
      "Longsword Cut"
    );
    assert.equal(result.jsonDiffs.length, 2);
  });
});
