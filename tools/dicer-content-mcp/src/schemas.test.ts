import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateContentPack, validateDbRow } from "./schemas";

const pack = {
  contentPackId: "pack-test",
  runId: "run-test",
  generatedAt: "2026-06-06T00:00:00.000Z",
  theme: { name: "Black Chapel", system: "nwod", tags: ["occult"] },
  defaults: { gameTableId: "00000000-0000-4000-8000-000000000013" },
  rows: {
    codex_entries: [
      {
        id: "00000000-0000-4000-8000-000000000301",
        system: "nwod",
        type: "power",
        name: "Votive Static",
        description: "A short original power for interference scenes.",
        visibility: "campaign",
        tags: ["occult"],
        action_template: { id: "votive-static-roll", type: "nwod-pool", label: "Votive Static", pool: 5 },
        grants: [],
        prerequisites: [],
        metadata: {}
      }
    ],
    loot_tables: [
      {
        id: "00000000-0000-4000-8000-000000000302",
        campaign_id: "00000000-0000-4000-8000-000000000013",
        name: "Chapel Salvage",
        visibility: "gm_only",
        entries: [
          {
            id: "entry-1",
            label: "Wax-Sealed Key",
            weight: 1,
            reward: { type: "note", title: "Key", body: "A small lead key." }
          }
        ]
      }
    ],
    handouts: [
      {
        id: "00000000-0000-4000-8000-000000000303",
        game_table_id: "00000000-0000-4000-8000-000000000013",
        title: "A Wet Ledger Page",
        visibility: "campaign",
        tags: ["clue"],
        reward_payloads: [],
        codex_entry_ids: ["00000000-0000-4000-8000-000000000301"]
      }
    ],
    markets: [
      {
        id: "00000000-0000-4000-8000-000000000304",
        game_table_id: "00000000-0000-4000-8000-000000000013",
        name: "Canal Exchange",
        status: "draft",
        stores: [],
        metadata: {}
      }
    ],
    character_profiles: [
      {
        id: "npc-chapel-broker",
        name: "Chapel Broker",
        default_system: "nwod",
        sheets: { nwod: { system: "nwod", actions: [] } },
        inventory: [],
        wallet: {},
        reward_history: [],
        progression: {},
        conditions: []
      }
    ],
    combat_encounters: [
      {
        id: "00000000-0000-4000-8000-000000000305",
        name: "Crypt Interruption",
        system: "nwod",
        round: 1,
        turn_index: 0,
        status: "draft",
        combatants: { combatants: [], pendingAction: null, actionHistory: [] }
      }
    ],
    roll_logs: [
      {
        id: "roll-content-test",
        room_slug: "default",
        kind: "system",
        result_text: "Content pack generated.",
        details: { note: "test" }
      }
    ],
    market_transactions: [
      {
        id: "00000000-0000-4000-8000-000000000306",
        market_id: "00000000-0000-4000-8000-000000000304",
        store_id: "store-1",
        character_id: "npc-chapel-broker",
        type: "buy",
        item_name: "Wax-Sealed Key",
        quantity: 1,
        price: { custom: { favors: 1 } },
        item: { id: "wax-key", name: "Wax-Sealed Key", quantity: 1 }
      }
    ]
  }
};

describe("content pack schemas", () => {
  it("accepts representative rows across all writable JSON tables", () => {
    const parsed = validateContentPack(pack);
    assert.equal(parsed.contentPackId, "pack-test");
    assert.equal(parsed.rows.codex_entries?.length, 1);
    assert.equal(parsed.rows.market_transactions?.length, 1);
  });

  it("rejects non-UUID ids for UUID-backed tables", () => {
    const errors = validateDbRow("codex_entries", {
      ...pack.rows.codex_entries[0],
      id: "not-a-uuid"
    });
    assert.match(errors.join("\n"), /must use a UUID id/);
  });
});
