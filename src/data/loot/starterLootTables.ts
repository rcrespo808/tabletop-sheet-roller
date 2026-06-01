import { LOCAL_DEMO_CAMPAIGN_ID, type LootTable } from "@/lib/loot/types";

export const starterLootTables: LootTable[] = [
  {
    id: "starter-minor-coin-cache",
    campaignId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "Minor Coin Cache",
    description: "Small coin rewards for quick encounters and low-risk searches.",
    visibility: "campaign",
    entries: [
      {
        id: "coin-cache-copper",
        label: "Loose copper and tarnished silver",
        weight: 5,
        reward: { type: "currency", walletDelta: { cp: 35, sp: 8 } }
      },
      {
        id: "coin-cache-gold",
        label: "Hidden purse of gold",
        weight: 2,
        reward: { type: "currency", walletDelta: { gp: 12, sp: 4 } }
      },
      {
        id: "coin-cache-xp",
        label: "Useful tactical lesson",
        weight: 1,
        reward: { type: "xp", amount: 25 },
        notes: "Use when the reward is progress rather than treasure."
      }
    ],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-swamp-relics",
    campaignId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "Swamp Relics",
    description: "Strange finds pulled from black water, roots, and old ruins.",
    visibility: "gm_only",
    entries: [
      {
        id: "swamp-antitoxin",
        label: "Mud-sealed antitoxin",
        weight: 3,
        reward: {
          type: "item",
          item: {
            id: "loot-mud-antitoxin",
            name: "Mud-sealed Antitoxin",
            quantity: 1,
            rarity: "common",
            notes: "A bitter vial that helps resist a poison or sickness at GM discretion.",
            powers: [
              {
                id: "power-drink-antitoxin",
                label: "Drink Antitoxin",
                description: "Consume the vial and roll a Constitution save with a small bonus.",
                consumesItem: true,
                action: {
                  id: "action-drink-antitoxin",
                  type: "dnd-check",
                  label: "Drink Antitoxin",
                  ability: "con",
                  save: true,
                  modifier: 2,
                  notes: "Use when resisting poison or sickness at GM discretion."
                }
              }
            ]
          }
        }
      },
      {
        id: "swamp-sickened",
        label: "Rot fever exposure",
        weight: 1,
        reward: {
          type: "condition",
          condition: {
            id: "loot-rot-fever-exposure",
            name: "Rot Fever Exposure",
            description: "The character has been exposed to a swamp-borne sickness.",
            source: "Swamp Relics",
            expiresAt: null
          }
        }
      },
      {
        id: "swamp-note",
        label: "Half-readable trail marker",
        weight: 2,
        reward: {
          type: "note",
          title: "Trail Marker",
          body: "A carved marker points toward old dry ground. It may reveal a safer route or a hidden camp."
        }
      }
    ],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-rat-chapel-offerings",
    campaignId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "Rat Chapel Offerings",
    description: "Offerings, relics, and troubling blessings from the rat chapel.",
    visibility: "gm_only",
    entries: [
      {
        id: "rat-chapel-reliquary",
        label: "Rat Chapel Reliquary",
        weight: 1,
        reward: {
          type: "codex",
          codexEntryId: "custom-rat-chapel-reliquary"
        },
        notes: "Requires the starter codex import for full codex attachment."
      },
      {
        id: "rat-chapel-vermin-mark",
        label: "Marked by Vermin Gospel",
        weight: 2,
        reward: {
          type: "condition",
          condition: {
            id: "marked-by-vermin-gospel",
            name: "Marked by Vermin Gospel",
            description: "Rats react to the character as if they carry a chapel sign.",
            source: "Rat Chapel Offerings",
            expiresAt: null
          }
        }
      },
      {
        id: "rat-chapel-coins",
        label: "Wax-stuck chapel coins",
        weight: 4,
        reward: { type: "currency", walletDelta: { gp: 3, sp: 17 } }
      }
    ],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-dnd-minor-magic-rewards",
    campaignId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "D&D Minor Magic Rewards",
    description: "Low-tier D&D magic rewards and utility finds.",
    visibility: "campaign",
    entries: [
      {
        id: "dnd-potion-healing",
        label: "Potion of Healing",
        weight: 5,
        reward: {
          type: "item",
          item: {
            id: "loot-potion-of-healing",
            codexEntryId: "dnd5e-potion-of-healing",
            sourceCodexEntryId: "dnd5e-potion-of-healing",
            name: "Potion of Healing",
            quantity: 1,
            rarity: "common",
            notes: "Restores a small amount of HP when used.",
            powers: [
              {
                id: "power-drink-healing-potion",
                label: "Drink Potion",
                description: "Roll healing and consume the potion.",
                consumesItem: true,
                action: {
                  id: "action-drink-healing-potion",
                  type: "dnd-roll",
                  label: "Drink Potion",
                  roll: "2d4+2",
                  notes: "Regain the rolled hit points."
                }
              }
            ]
          }
        }
      },
      {
        id: "dnd-spell-scroll-moonbeam",
        label: "Spell Scroll: Moonbeam",
        weight: 2,
        reward: {
          type: "item",
          item: {
            id: "item-spell-scroll-moonbeam",
            codexEntryId: "item-spell-scroll-moonbeam",
            sourceCodexEntryId: "item-spell-scroll-moonbeam",
            name: "Spell Scroll: Moonbeam",
            quantity: 1,
            rarity: "uncommon",
            notes: "A silvered vellum scroll sealed with pale wax.",
            powers: [
              {
                id: "power-cast-moonbeam",
                label: "Cast Moonbeam",
                description: "Use the character sheet spell save DC. Damage can be rolled from this item.",
                consumesItem: true,
                action: {
                  id: "action-cast-moonbeam",
                  type: "note",
                  label: "Cast Moonbeam",
                  notes:
                    "Creatures entering or starting in the beam make a CON save against your Spell Save DC. Roll 2d10 radiant damage.",
                  metadata: {
                    usesSpellSaveDc: true,
                    saveAbility: "con",
                    damageRoll: "2d10",
                    spellName: "Moonbeam"
                  }
                }
              }
            ]
          }
        }
      },
      {
        id: "dnd-cloak-protection",
        label: "Cloak of Protection lead",
        weight: 1,
        reward: { type: "codex", codexEntryId: "dnd5e-cloak-of-protection" }
      },
      {
        id: "dnd-training-xp",
        label: "Training breakthrough",
        weight: 2,
        reward: { type: "xp", amount: 50 }
      }
    ],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  },
  {
    id: "starter-nwod-clues-leverage",
    campaignId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "NWoD Clues and Leverage",
    description: "Investigation rewards for clues, leverage, and personal advancement.",
    visibility: "campaign",
    entries: [
      {
        id: "nwod-informed-condition",
        label: "Useful dossier",
        weight: 3,
        reward: {
          type: "codex",
          codexEntryId: "nwod-informed"
        }
      },
      {
        id: "nwod-leverage-note",
        label: "Blackmail fragment",
        weight: 2,
        reward: {
          type: "note",
          title: "Blackmail Fragment",
          body: "A partial record gives leverage over a minor NPC. Spend it when the fiction supports pressure."
        }
      },
      {
        id: "nwod-xp",
        label: "Hard-earned lesson",
        weight: 2,
        reward: { type: "xp", amount: 1 }
      },
      {
        id: "nwod-resources",
        label: "Temporary resources",
        weight: 1,
        reward: { type: "currency", walletDelta: { resources: 1 } }
      }
    ],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  }
];
