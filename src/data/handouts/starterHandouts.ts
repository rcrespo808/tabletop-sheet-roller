import { LOCAL_DEMO_GAME_TABLE_ID, type Handout } from "@/lib/handouts/types";

export const starterHandouts: Handout[] = [
  {
    id: "starter-handout-rat-chapel-heretic",
    gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
    kind: "wanted_poster",
    title: "Wanted Poster: The Rat Chapel Heretic",
    subtitle: "Veinwatch bounty notice",
    body:
      "A stained wanted poster accusing the Reverend of Rats of plaguecraft, grave desecration, and unlawful congregation beneath an abandoned church.",
    visibility: "campaign",
    tags: ["wanted", "veinwatch", "rat chapel", "bounty"],
    gmNotes:
      "Demo flow: reveal this to the campaign, select He Zhen, preview rewards, then confirm apply. The condition creates social pressure with Veinwatch.",
    rewardPayloads: [
      {
        type: "currency",
        walletDelta: { gp: 75 }
      },
      {
        type: "condition",
        condition: {
          id: "wanted-by-veinwatch",
          name: "Wanted by Veinwatch",
          description: "Veinwatch recognizes the character as connected to the Rat Chapel case.",
          source: "Wanted Poster: The Rat Chapel Heretic",
          expiresAt: null
        }
      },
      {
        type: "note",
        title: "Veinwatch Recognition",
        body: "The Veinwatch now recognizes the character as connected to the Rat Chapel case."
      }
    ],
    codexEntryIds: [],
    revealedAt: "2026-05-31T00:00:00.000Z",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-handout-spell-scroll-moonbeam",
    gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
    kind: "spell_scroll",
    title: "Spell Scroll: Moonbeam",
    subtitle: "Silvered vellum sealed with pale wax",
    body: "A silvered vellum scroll sealed with pale wax. Moonlight seems to pool around the script when the seal is broken.",
    visibility: "campaign",
    tags: ["spell", "scroll", "dnd5e", "moonbeam"],
    gmNotes: "Use this to test codex attachment plus item reward from the same handout.",
    rewardPayloads: [
      {
        type: "codex",
        codexEntryId: "seed-dnd5e-moonbeam"
      },
      {
        type: "item",
        item: {
          id: "spell-scroll-moonbeam",
          codexEntryId: "seed-dnd5e-moonbeam",
          sourceCodexEntryId: "seed-dnd5e-moonbeam",
          name: "Spell Scroll: Moonbeam",
          quantity: 1,
          rarity: "uncommon",
          notes: "A silvered vellum spell scroll."
        }
      }
    ],
    codexEntryIds: ["seed-dnd5e-moonbeam"],
    revealedAt: "2026-05-31T00:00:00.000Z",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-handout-smugglers-chapel-cache",
    gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
    kind: "treasure_note",
    title: "Treasure Note: Smuggler's Chapel Cache",
    subtitle: "Water-damaged ledger page",
    body:
      "A water-damaged ledger page listing loose coins, stolen incense, and one hidden reliquary beneath the chapel floor.",
    visibility: "selected_players",
    tags: ["treasure", "cache", "rat chapel", "ledger"],
    gmNotes:
      "Selected-player test handout. Paste player user IDs in selected visibility for live Supabase tables.",
    rewardPayloads: [
      {
        type: "currency",
        walletDelta: { gp: 120 }
      },
      {
        type: "item",
        item: {
          id: "rat-chapel-reliquary",
          codexEntryId: "seed-custom-rat-chapel-reliquary",
          sourceCodexEntryId: "seed-custom-rat-chapel-reliquary",
          name: "Rat Chapel Reliquary",
          quantity: 1,
          rarity: "rare",
          notes: "A hidden reliquary recovered from beneath the chapel floor."
        }
      },
      {
        type: "xp",
        amount: 2
      }
    ],
    codexEntryIds: ["seed-custom-rat-chapel-reliquary"],
    revealedAt: null,
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-handout-vermin-fever-exposure",
    gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
    kind: "condition_notice",
    title: "Condition Notice: Vermin Fever Exposure",
    subtitle: "Disease exposure after contact with infected rats",
    body: "GM-facing disease exposure notice after contact with infected rats or chapel filth.",
    visibility: "gm_only",
    tags: ["condition", "disease", "vermin", "gm"],
    gmNotes:
      "Apply after close contact with infected rats, contaminated altar wax, or chapel refuse. Escalate symptoms only if the fiction supports it.",
    rewardPayloads: [
      {
        type: "condition",
        condition: {
          id: "vermin-fever",
          name: "Vermin Fever",
          description: "Fever, auditory skittering, and painful swelling around bite marks.",
          source: "Condition Notice: Vermin Fever Exposure",
          expiresAt: null
        }
      },
      {
        type: "note",
        title: "Vermin Fever Symptoms",
        body: "Symptoms begin with fever and phantom scratching. Progression may impose penalties, strange cravings, or rat attention at GM discretion."
      }
    ],
    codexEntryIds: [],
    revealedAt: null,
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-handout-veinwatch-informant-report",
    gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
    kind: "faction_letter",
    title: "Faction Letter: Veinwatch Informant Report",
    subtitle: "Coded field report from Hollowford",
    body:
      "A coded report naming informants who saw rats carrying scraps of human speech through Hollowford gutters.",
    visibility: "campaign",
    tags: ["faction", "veinwatch", "clue", "informants"],
    gmNotes:
      "This should make Veinwatch feel useful but compromised. The Informed codex reward can be attached to a character who studies it.",
    rewardPayloads: [
      {
        type: "note",
        title: "Leverage: Veinwatch Informant Network",
        body: "The character can cite informants who saw rats carrying scraps of human speech through Hollowford gutters."
      },
      {
        type: "codex",
        codexEntryId: "seed-nwod-informed"
      }
    ],
    codexEntryIds: ["seed-nwod-informed"],
    revealedAt: "2026-05-31T00:00:00.000Z",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  }
];
