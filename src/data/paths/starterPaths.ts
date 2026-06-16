import {
  LOCAL_DEMO_GAME_TABLE_ID,
  type BranchingPath,
  type PathNodeKind
} from "@/lib/paths/types";

const MIRE_LOOT_TABLE_ID = "00000000-0000-4000-8000-000000000101";
const MIRE_LOOT_TABLE_LOCAL_ID = "starter-swamp-relics";
const RAT_LOOT_TABLE_ID = "00000000-0000-4000-8000-000000000102";
const RAT_LOOT_TABLE_LOCAL_ID = "starter-rat-chapel-offerings";
const VEINWATCH_HANDOUT_ID = "starter-handout-rat-chapel-heretic";
const VERMIN_GOSPEL_CODEX_ID = "seed-custom-vermin-gospel";
const RAT_CHAPEL_FENCE_STORE_ID = "rat-chapel-fence";
const BLACKREED_MARKET_ID = "blackreed-crossing-market";

function node(
  id: string,
  title: string,
  kind: PathNodeKind,
  extra: Partial<BranchingPath["nodes"][number]> = {}
): BranchingPath["nodes"][number] {
  return { id, title, kind, status: "hidden", ...extra };
}

export const mireRoadPath: BranchingPath = {
  id: "starter-path-mire-road",
  gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
  name: "Mire Road to Blackreed Hollow",
  description:
    "A swamp expedition route through eerie choices, sunken carts, ambushes, and the dry chapel ruin before Blackreed Hollow.",
  status: "draft",
  visibility: "gm_only",
  currentNodeIds: ["mire-start-hollowford-gate"],
  startNodeId: "mire-start-hollowford-gate",
  tags: ["mire", "travel", "swamp", "starter"],
  gmNotes:
    "Reveal nodes as the party progresses. Causeway favors loot; canal favors combat. Both routes converge at the ruin.",
  nodes: [
    node("mire-start-hollowford-gate", "Hollowford Gate", "start", {
      status: "available",
      subtitle: "Where the mire road begins",
      playerText:
        "The gate sags on rusted hinges. Beyond it, black water and reed-choked paths wait under a sky the color of old bruises.",
      gmText: "Party enters here. Reveal the choice node once they commit to the road.",
      description: "Entry point to the mire expedition."
    }),
    node("mire-choice-causeway-or-canal", "Old Causeway or Reed-Choked Canal", "choice", {
      subtitle: "Two routes into the mire",
      playerText:
        "The causeway rises on cracked stone, half-swallowed by moss. The canal cuts straight through the reeds - faster, but the water moves when nothing should.",
      gmText: "Player choice is GM-driven in MVP. Pick a branch when resolving.",
      description: "Branching route choice."
    }),
    node("mire-loot-sunken-cart", "Sunken Cart", "loot", {
      subtitle: "Causeway salvage",
      playerText: "A merchant cart lies half-submerged. Something glints beneath the scum.",
      outcomes: [
        {
          type: "loot_roll",
          lootTableId: MIRE_LOOT_TABLE_ID,
          targetMode: "party"
        }
      ],
      metadata: {
        fallbackLootTableIds: [MIRE_LOOT_TABLE_LOCAL_ID]
      }
    }),
    node("mire-combat-mire-ambush", "Mire Ambush", "combat", {
      subtitle: "Reed-choked canal",
      playerText: "Something breaks the surface. The reeds part around shapes that were not there a moment ago.",
      outcomes: [
        {
          type: "combat_start",
          notes: "Mire ambush - add swamp creatures or cult skirmishers.",
          npcTemplateIds: []
        }
      ],
      metadata: { placeholderEncounter: true }
    }),
    node("mire-handout-veinwatch-warning", "Veinwatch Warning", "handout", {
      subtitle: "Posted at a ruined mile-marker",
      playerText: "A weather-stained notice warns travelers about cult activity near Blackreed.",
      outcomes: [{ type: "handout_reveal", handoutId: VEINWATCH_HANDOUT_ID }]
    }),
    node("mire-rest-dry-chapel-ruin", "Dry Chapel Ruin", "rest", {
      subtitle: "Safe camp on higher ground",
      playerText: "The chapel roof is gone but the walls still stand. The ground here is dry enough to rest.",
      outcomes: [
        {
          type: "rest",
          restType: "safe_camp",
          targetMode: "party"
        }
      ]
    }),
    node("mire-exit-blackreed-hollow", "Blackreed Hollow", "exit", {
      subtitle: "End of the mire road",
      playerText: "Blackreed Hollow rises from the fog - a settlement of reed-thatch and watchful silence.",
      gmText: "Arrival scene. Mark path completed when appropriate.",
      outcomes: [{ type: "log", message: "Party reached Blackreed Hollow." }]
    })
  ],
  edges: [
    { id: "mire-e1", fromNodeId: "mire-start-hollowford-gate", toNodeId: "mire-choice-causeway-or-canal", label: "Enter the mire" },
    {
      id: "mire-e2",
      fromNodeId: "mire-choice-causeway-or-canal",
      toNodeId: "mire-loot-sunken-cart",
      label: "Old Causeway"
    },
    {
      id: "mire-e3",
      fromNodeId: "mire-choice-causeway-or-canal",
      toNodeId: "mire-combat-mire-ambush",
      label: "Reed-Choked Canal"
    },
    { id: "mire-e4", fromNodeId: "mire-loot-sunken-cart", toNodeId: "mire-rest-dry-chapel-ruin" },
    { id: "mire-e5", fromNodeId: "mire-combat-mire-ambush", toNodeId: "mire-handout-veinwatch-warning" },
    { id: "mire-e6", fromNodeId: "mire-rest-dry-chapel-ruin", toNodeId: "mire-exit-blackreed-hollow" },
    { id: "mire-e7", fromNodeId: "mire-handout-veinwatch-warning", toNodeId: "mire-exit-blackreed-hollow" }
  ]
};

export const ratChapelPath: BranchingPath = {
  id: "starter-path-rat-chapel",
  gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
  name: "The Rat Chapel Descent",
  description:
    "An abandoned church descent through confessionals, vermin gospel, disease, and the swarm below the altar.",
  status: "draft",
  visibility: "gm_only",
  currentNodeIds: ["rat-start-broken-nave"],
  startNodeId: "rat-start-broken-nave",
  tags: ["rat chapel", "dungeon", "disease", "starter"],
  gmNotes: "Reverend of Rats territory. Condition node applies Vermin Fever Exposure.",
  nodes: [
    node("rat-start-broken-nave", "Broken Nave", "start", {
      status: "available",
      subtitle: "The abandoned church above",
      playerText:
        "The nave ceiling has collapsed. Rat-scratch marks cover the pews like a second scripture.",
      description: "Entry to the Rat Chapel descent."
    }),
    node("rat-choice-confessionals-or-tower", "Confessionals or Bell Tower", "choice", {
      subtitle: "Two paths deeper",
      playerText:
        "Confessionals exhale damp air. The bell tower stairs groan with each distant footfall from below.",
      description: "Branch: lore/information vs offerings/loot."
    }),
    node("rat-handout-vermin-gospel", "The Vermin Gospel", "handout", {
      subtitle: "Confessional cache",
      playerText: "Pages bound in rat-gnawed leather describe a rite that turns vermin into congregation.",
      outcomes: [
        {
          type: "codex_unlock",
          codexEntryIds: [VERMIN_GOSPEL_CODEX_ID]
        },
        { type: "log", message: "Party found the Vermin Gospel." }
      ]
    }),
    node("rat-loot-chapel-offerings", "Rat Chapel Offerings", "loot", {
      subtitle: "Bell tower hoard",
      playerText: "Offerings pile in the tower alcove - coins, relics, and things that should not gleam.",
      outcomes: [
        {
          type: "loot_roll",
          lootTableId: RAT_LOOT_TABLE_ID,
          targetMode: "party"
        }
      ],
      metadata: {
        fallbackLootTableIds: [RAT_LOOT_TABLE_LOCAL_ID, "starter-rat-chapel-offerings"]
      }
    }),
    node("rat-condition-vermin-fever", "Vermin Fever Exposure", "condition", {
      subtitle: "Sick air in the crypt approach",
      playerText: "The air tastes of copper and wet fur. Your skin prickles with unwelcome heat.",
      outcomes: [
        {
          type: "condition_apply",
          conditionName: "Vermin Fever Exposure",
          description: "Exposure to chapel-borne disease. Resolve through rest or treatment.",
          targetMode: "party"
        }
      ]
    }),
    node("rat-market-chapel-fence", "Rat Chapel Fence", "market", {
      subtitle: "Back-room trading",
      playerText: "A nervous fence offers chapel salvage for the right price - or the right silence.",
      outcomes: [{ type: "market_open", marketId: BLACKREED_MARKET_ID }],
      metadata: { storeId: RAT_CHAPEL_FENCE_STORE_ID }
    }),
    node("rat-exit-swarm-below-altar", "Swarm Below the Altar", "boss", {
      subtitle: "Final descent",
      playerText: "The altar stone grinds aside. Below, eyes glitter in the dark - hundreds of them.",
      outcomes: [
        {
          type: "combat_start",
          notes: "Reverend of Rats or swarm encounter placeholder.",
          npcTemplateIds: ["reverend-of-rats"]
        },
        { type: "log", message: "Party confronted the swarm below the altar." }
      ],
      metadata: { placeholderEncounter: true }
    })
  ],
  edges: [
    { id: "rat-e1", fromNodeId: "rat-start-broken-nave", toNodeId: "rat-choice-confessionals-or-tower" },
    {
      id: "rat-e2",
      fromNodeId: "rat-choice-confessionals-or-tower",
      toNodeId: "rat-handout-vermin-gospel",
      label: "Confessionals"
    },
    {
      id: "rat-e3",
      fromNodeId: "rat-choice-confessionals-or-tower",
      toNodeId: "rat-loot-chapel-offerings",
      label: "Bell Tower"
    },
    { id: "rat-e4", fromNodeId: "rat-handout-vermin-gospel", toNodeId: "rat-condition-vermin-fever" },
    { id: "rat-e5", fromNodeId: "rat-loot-chapel-offerings", toNodeId: "rat-condition-vermin-fever" },
    { id: "rat-e6", fromNodeId: "rat-condition-vermin-fever", toNodeId: "rat-market-chapel-fence" },
    { id: "rat-e7", fromNodeId: "rat-market-chapel-fence", toNodeId: "rat-exit-swarm-below-altar" }
  ]
};

export const nwodBeachTestPath: BranchingPath = {
  id: "starter-path-nwod-beach-test",
  gameTableId: LOCAL_DEMO_GAME_TABLE_ID,
  name: "nWoD Beach Test: The Tide Line",
  description:
    "A compact three-stage New World of Darkness test path: investigate a cold beach scene, choose the pier or dunes, then resolve one of two supernatural leads.",
  status: "draft",
  visibility: "gm_only",
  currentNodeIds: ["nwod-beach-start-tide-line"],
  startNodeId: "nwod-beach-start-tide-line",
  tags: ["nwod", "beach", "investigation", "starter", "test"],
  gmNotes:
    "Simple test path for scenario play. Stage 1 establishes the scene, Stage 2 branches, Stage 3 resolves either the pier witness or dune tracks.",
  nodes: [
    node("nwod-beach-start-tide-line", "Stage 1: The Tide Line", "start", {
      status: "available",
      subtitle: "Cold open on a moonlit beach",
      playerText:
        "Black water claws at the sand. A torn coat lies at the tide line, its pockets full of wet salt and motel matches.",
      gmText:
        "nWoD prompt: ask for Wits + Investigation or Wits + Survival. Success reveals two leads: the shuttered pier and the grass-choked dunes.",
      description: "Opening clue scene for the beach test."
    }),
    node("nwod-beach-choice-pier-or-dunes", "Stage 2: Pier or Dunes", "choice", {
      subtitle: "Two beach paths",
      playerText:
        "The pier lights flicker over dark water. Behind you, dune grass bends against a wind that leaves no footprints of its own.",
      gmText:
        "Let the players choose a lead. Pier favors social/occult pressure; dunes favor tracking and physical risk.",
      description: "Branch point for the two test routes."
    }),
    node("nwod-beach-pier-drowned-witness", "Stage 3A: The Drowned Witness", "skill_check", {
      subtitle: "Shuttered pier",
      playerText:
        "A soaked figure waits beneath the pier, speaking in borrowed voices and asking who paid for the coat.",
      gmText:
        "Suggested rolls: Presence + Empathy to calm it, Manipulation + Occult to bargain, or Resolve + Composure to withstand its whispers.",
      outcomes: [
        {
          type: "log",
          message: "The party followed the pier lead and confronted the Drowned Witness."
        }
      ],
      metadata: {
        system: "nwod",
        stage: 3,
        branch: "pier",
        suggestedPools: ["Presence + Empathy", "Manipulation + Occult", "Resolve + Composure"]
      }
    }),
    node("nwod-beach-dunes-salt-tracks", "Stage 3B: Salt Tracks in the Dunes", "condition", {
      subtitle: "Grass-choked dunes",
      playerText:
        "The tracks end in a circle of dry shells. Something under the sand knocks once, then twice, in answer to your breathing.",
      gmText:
        "Suggested rolls: Wits + Survival to follow the trail, Dexterity + Athletics to avoid the sink, or Stamina + Resolve against the cold.",
      outcomes: [
        {
          type: "condition_apply",
          conditionName: "Salt-Cold Shaken",
          description: "A temporary nWoD-style scene condition from contact with the thing beneath the dunes.",
          targetMode: "party"
        },
        {
          type: "log",
          message: "The party followed the dune lead and triggered the Salt-Cold Shaken condition."
        }
      ],
      metadata: {
        system: "nwod",
        stage: 3,
        branch: "dunes",
        suggestedPools: ["Wits + Survival", "Dexterity + Athletics", "Stamina + Resolve"]
      }
    })
  ],
  edges: [
    {
      id: "nwod-beach-e1",
      fromNodeId: "nwod-beach-start-tide-line",
      toNodeId: "nwod-beach-choice-pier-or-dunes",
      label: "Follow the clues"
    },
    {
      id: "nwod-beach-e2",
      fromNodeId: "nwod-beach-choice-pier-or-dunes",
      toNodeId: "nwod-beach-pier-drowned-witness",
      label: "Shuttered Pier"
    },
    {
      id: "nwod-beach-e3",
      fromNodeId: "nwod-beach-choice-pier-or-dunes",
      toNodeId: "nwod-beach-dunes-salt-tracks",
      label: "Grass-Choked Dunes"
    }
  ],
  metadata: {
    system: "nwod",
    testScenario: true,
    stages: 3,
    branchCount: 2
  }
};

export const starterPaths: BranchingPath[] = [mireRoadPath, ratChapelPath, nwodBeachTestPath];
