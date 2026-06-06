import { LOCAL_DEMO_CAMPAIGN_ID } from "@/lib/loot/types";
import type { Market } from "@/lib/markets/types";

export const starterMarkets: Market[] = [
  {
    id: "blackreed-crossing-market",
    gameTableId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "Blackreed Crossing Market",
    description:
      "A temporary riverside bazaar where salvage traders, chapel fences, apothecaries, and faction quartermasters trade under wary torchlight.",
    location: "Blackreed Crossing",
    status: "draft",
    stores: [
      {
        id: "mire-crossing-salvager",
        name: "Mire-Crossing Salvager",
        theme: "salvage",
        description: "A mud-stained trader selling things recovered from swamp graves.",
        quality: 2,
        scarcity: 4,
        meanRarity: "uncommon",
        priceMultiplier: 1.15,
        sellMultiplier: 0.45,
        stock: [
          {
            id: "grave-moss-candle",
            item: {
              id: "grave-moss-candle",
              name: "Grave-Moss Candle",
              quantity: 1,
              rarity: "common",
              notes: "Burns with green smoke. Grants advantage or a +2 situational bonus to track undead traces for one scene.",
              tags: ["swamp", "occult", "consumable"]
            },
            price: { gp: 4 },
            quantityAvailable: 6,
            rarity: "common",
            tags: ["swamp", "occult"],
            source: "manual"
          },
          {
            id: "ring-of-marsh-breath",
            item: {
              id: "ring-of-marsh-breath",
              name: "Ring of Marsh-Breath",
              quantity: 1,
              rarity: "uncommon",
              notes: "Lets the wearer breathe foul swamp air and shallow bog-water for short stretches.",
              powers: [
                {
                  id: "power-marsh-breath",
                  label: "Marsh-Breath",
                  description: "Ignore one suffocation or toxic-miasma complication in swamp terrain.",
                  action: {
                    id: "action-marsh-breath",
                    type: "note",
                    label: "Use Marsh-Breath",
                    notes: "Ignore one suffocation or toxic-miasma complication in swamp terrain."
                  },
                  charges: { current: 1, max: 1, reset: "long_rest" }
                }
              ],
              tags: ["swamp", "survival", "magic"]
            },
            price: { gp: 85 },
            quantityAvailable: 1,
            rarity: "uncommon",
            tags: ["swamp", "survival"],
            source: "manual"
          },
          {
            id: "rust-bloom-knife",
            item: {
              id: "rust-bloom-knife",
              name: "Rust-Bloom Knife",
              quantity: 1,
              rarity: "common",
              notes: "A pitted blade useful as a ritual component or emergency weapon.",
              tags: ["weapon", "salvage"]
            },
            price: { gp: 9, sp: 5 },
            quantityAvailable: 3,
            rarity: "common",
            tags: ["weapon", "salvage"],
            source: "manual"
          }
        ]
      },
      {
        id: "rat-chapel-fence",
        name: "Rat Chapel Fence",
        theme: "black_market",
        description: "A filthy broker dealing in stolen church goods, plague tools, and secrets.",
        quality: 3,
        scarcity: 5,
        meanRarity: "rare",
        priceMultiplier: 1.45,
        sellMultiplier: 0.35,
        stock: [
          {
            id: "saint-of-vermin-icon",
            item: {
              id: "saint-of-vermin-icon",
              name: "Saint of Vermin Icon",
              quantity: 1,
              rarity: "rare",
              notes: "A tarnished icon that draws or repels plague-ridden swarms depending on the prayer spoken.",
              powers: [
                {
                  id: "power-vermin-litany",
                  label: "Vermin Litany",
                  description: "Once per session, turn a vermin swarm's attention toward a nearby target.",
                  action: {
                    id: "action-vermin-litany",
                    type: "note",
                    label: "Speak Vermin Litany",
                    notes: "Once per session, redirect a vermin swarm's attention toward a nearby target."
                  },
                  charges: { current: 1, max: 1, reset: "session" }
                }
              ],
              tags: ["temple", "plague", "relic"]
            },
            price: { gp: 240 },
            quantityAvailable: 1,
            rarity: "rare",
            tags: ["temple", "plague", "relic"],
            requiresGmApproval: true,
            source: "manual"
          },
          {
            id: "stolen-chapel-ledger",
            item: {
              id: "stolen-chapel-ledger",
              name: "Stolen Chapel Ledger",
              quantity: 1,
              rarity: "uncommon",
              notes: "Names donors, smugglers, and burial debts tied to the rat chapel.",
              tags: ["intel", "faction"]
            },
            price: { gp: 60 },
            quantityAvailable: 1,
            rarity: "uncommon",
            tags: ["intel", "faction"],
            source: "manual"
          },
          {
            id: "ratbone-lockpicks",
            item: {
              id: "ratbone-lockpicks",
              name: "Ratbone Lockpicks",
              quantity: 1,
              rarity: "common",
              notes: "Brittle but quiet picks wrapped in old altar cloth.",
              tags: ["tool", "black_market"]
            },
            price: { gp: 18 },
            quantityAvailable: 2,
            rarity: "common",
            tags: ["tool", "black_market"],
            source: "manual"
          }
        ]
      },
      {
        id: "hollowford-apothecary",
        name: "Hollowford Apothecary",
        theme: "apothecary",
        description: "A plague-town healer with bitter tonics, field kits, and rotblossom mixtures.",
        quality: 4,
        scarcity: 4,
        meanRarity: "uncommon",
        priceMultiplier: 2,
        sellMultiplier: 0.6,
        stock: [
          {
            id: "rotblossom-poultice",
            item: {
              id: "rotblossom-poultice",
              name: "Rotblossom Poultice",
              quantity: 1,
              rarity: "common",
              notes: "A foul poultice that stabilizes a poisoned or diseased patient.",
              powers: [
                {
                  id: "power-apply-rotblossom",
                  label: "Apply Poultice",
                  description: "Stabilize one poisoned or diseased patient; consumed on use.",
                  action: {
                    id: "action-apply-rotblossom",
                    type: "note",
                    label: "Apply Rotblossom Poultice",
                    notes: "Stabilize one poisoned or diseased patient; consumed on use."
                  },
                  consumesItem: true
                }
              ],
              tags: ["medicine", "plague", "consumable"]
            },
            price: { gp: 12 },
            quantityAvailable: 8,
            rarity: "common",
            tags: ["medicine", "plague"],
            source: "manual"
          },
          {
            id: "stained-medical-kit",
            item: {
              id: "stained-medical-kit",
              name: "Stained Medical Kit",
              quantity: 1,
              rarity: "common",
              notes: "Complete enough to help, stained enough to worry everyone.",
              tags: ["medicine", "tool"]
            },
            price: { gp: 25 },
            quantityAvailable: 3,
            rarity: "common",
            tags: ["medicine", "tool"],
            source: "manual"
          },
          {
            id: "disease-notes",
            item: {
              id: "disease-notes",
              name: "Blackreed Disease Notes",
              quantity: 1,
              rarity: "uncommon",
              notes: "Field notes on symptoms, vectors, and flawed cures.",
              tags: ["medicine", "intel", "plague"]
            },
            price: { gp: 40 },
            quantityAvailable: 2,
            rarity: "uncommon",
            tags: ["medicine", "intel"],
            source: "manual"
          }
        ]
      },
      {
        id: "veinwatch-quartermaster",
        name: "Veinwatch Quartermaster",
        theme: "faction",
        description: "Faction-controlled supplies for hunters, wardens, and sanctioned problem-solvers.",
        quality: 4,
        scarcity: 3,
        meanRarity: "uncommon",
        priceMultiplier: 0.8,
        sellMultiplier: 0.2,
        stock: [
          {
            id: "holy-oil-flask",
            item: {
              id: "holy-oil-flask",
              name: "Holy Oil Flask",
              quantity: 1,
              rarity: "common",
              notes: "Consecrated oil used to prepare weapons, thresholds, or burial seals.",
              tags: ["radiant", "temple", "consumable"]
            },
            price: { gp: 18 },
            quantityAvailable: 6,
            rarity: "common",
            tags: ["radiant", "temple"],
            source: "manual"
          },
          {
            id: "anti-magic-restraints",
            item: {
              id: "anti-magic-restraints",
              name: "Anti-Magic Restraints",
              quantity: 1,
              rarity: "uncommon",
              notes: "Heavy manacles etched with warding script. Not subtle.",
              tags: ["restraint", "anti_magic", "faction"]
            },
            price: { gp: 110 },
            quantityAvailable: 2,
            rarity: "uncommon",
            tags: ["restraint", "anti_magic"],
            source: "manual"
          },
          {
            id: "quiver-of-phasebolts",
            item: {
              id: "quiver-of-phasebolts",
              name: "Quiver of Phasebolts",
              quantity: 1,
              rarity: "rare",
              notes: "A bundle of bolts that slip through partial cover and spectral interference.",
              powers: [
                {
                  id: "power-fire-phasebolt",
                  label: "Fire Phasebolt",
                  description: "Ignore partial cover or a spectral defense on one ranged attack.",
                  action: {
                    id: "action-fire-phasebolt",
                    type: "note",
                    label: "Fire Phasebolt",
                    notes: "Ignore partial cover or a spectral defense on one ranged attack."
                  },
                  charges: { current: 6, max: 6, reset: "never" }
                }
              ],
              tags: ["ammo", "magic", "radiant"]
            },
            price: { gp: 320 },
            quantityAvailable: 1,
            rarity: "rare",
            tags: ["ammo", "magic", "radiant"],
            source: "manual"
          }
        ]
      },
      {
        id: "eryndor-syndicate-broker",
        name: "Eryndor Syndicate Broker",
        theme: "black_market",
        description: "Rare stock, high prices, and dangerous political strings attached.",
        quality: 5,
        scarcity: 5,
        meanRarity: "rare",
        priceMultiplier: 1.65,
        sellMultiplier: 0.3,
        stock: [
          {
            id: "spell-scroll-moonbeam",
            item: {
              id: "spell-scroll-moonbeam",
              name: "Spell Scroll: Moonbeam",
              quantity: 1,
              rarity: "uncommon",
              notes: "A silvered scroll that calls down a column of pale radiant light.",
              powers: [
                {
                  id: "power-scroll-moonbeam",
                  label: "Cast Moonbeam",
                  description: "Cast Moonbeam from the scroll; consumed on use.",
                  action: {
                    id: "action-scroll-moonbeam",
                    type: "dnd-roll",
                    label: "Moonbeam Damage",
                    roll: "2d10",
                    notes: "Radiant damage. Save DC and spell details are GM adjudicated."
                  },
                  consumesItem: true
                }
              ],
              tags: ["spell", "scroll", "radiant"]
            },
            price: { gp: 150 },
            quantityAvailable: 1,
            rarity: "uncommon",
            tags: ["spell", "scroll", "radiant"],
            source: "manual"
          },
          {
            id: "syndicate-contract",
            item: {
              id: "syndicate-contract",
              name: "Syndicate Contract",
              quantity: 1,
              rarity: "unique",
              notes: "A favor-backed contract. The item is the deal, not the paper.",
              tags: ["contract", "faction", "intel"]
            },
            price: { custom: { favors: 1 } },
            quantityAvailable: 1,
            rarity: "unique",
            tags: ["contract", "faction"],
            requiresGmApproval: true,
            source: "manual"
          },
          {
            id: "stolen-mage-signet",
            item: {
              id: "stolen-mage-signet",
              name: "Stolen Mage Signet",
              quantity: 1,
              rarity: "rare",
              notes: "Useful for doors, letters, and making the wrong enemies.",
              tags: ["arcane", "political", "black_market"]
            },
            price: { gp: 275 },
            quantityAvailable: 1,
            rarity: "rare",
            tags: ["arcane", "political"],
            source: "manual"
          }
        ]
      }
    ],
    metadata: { source: "starter" }
  },
  {
    id: "dnd-adventurers-test-market",
    gameTableId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "D&D Adventurer's Test Market",
    description:
      "A clean D&D 5e test market with mundane gear, scrolls, healing stock, and one gated rare item.",
    location: "Hollowford East Gate",
    status: "draft",
    stores: [
      {
        id: "east-gate-outfitter",
        name: "East Gate Outfitter",
        theme: "general",
        description: "Reliable adventuring supplies for quick buy/sell regression tests.",
        quality: 3,
        scarcity: 2,
        meanRarity: "common",
        priceMultiplier: 1,
        sellMultiplier: 0.5,
        stock: [
          {
            id: "dnd-rope-silk",
            item: {
              id: "dnd-rope-silk",
              name: "Silk Rope",
              quantity: 1,
              rarity: "common",
              notes: "50 feet of strong, light rope.",
              tags: ["gear", "climbing"]
            },
            price: { gp: 10 },
            quantityAvailable: 5,
            rarity: "common",
            tags: ["gear", "climbing"],
            source: "manual"
          },
          {
            id: "dnd-healing-potion",
            item: {
              id: "dnd-healing-potion",
              name: "Potion of Healing",
              quantity: 1,
              rarity: "common",
              notes: "Regain 2d4+2 hit points when consumed.",
              powers: [
                {
                  id: "power-drink-healing-potion",
                  label: "Drink Potion",
                  description: "Regain 2d4+2 hit points; consumed on use.",
                  action: {
                    id: "action-drink-healing-potion",
                    type: "dnd-roll",
                    label: "Potion Healing",
                    roll: "2d4+2",
                    notes: "Healing from a standard potion."
                  },
                  consumesItem: true
                }
              ],
              tags: ["potion", "healing", "consumable"]
            },
            price: { gp: 50 },
            quantityAvailable: 4,
            rarity: "common",
            tags: ["potion", "healing"],
            source: "manual"
          },
          {
            id: "dnd-scroll-magic-missile",
            item: {
              id: "dnd-scroll-magic-missile",
              name: "Spell Scroll: Magic Missile",
              quantity: 1,
              rarity: "uncommon",
              notes: "A first-level spell scroll for testing inventory powers.",
              powers: [
                {
                  id: "power-scroll-magic-missile",
                  label: "Cast Magic Missile",
                  description: "Cast Magic Missile from the scroll; consumed on use.",
                  action: {
                    id: "action-scroll-magic-missile",
                    type: "dnd-roll",
                    label: "Magic Missile Damage",
                    roll: "3d4+3",
                    notes: "Force damage split as the caster chooses."
                  },
                  consumesItem: true
                }
              ],
              tags: ["spell", "scroll", "arcane"]
            },
            price: { gp: 85 },
            quantityAvailable: 2,
            rarity: "uncommon",
            tags: ["spell", "scroll"],
            source: "manual"
          }
        ]
      },
      {
        id: "oathbound-armory",
        name: "Oathbound Armory",
        theme: "blacksmith",
        description: "Weapons and armor for transaction and stock decrement tests.",
        quality: 4,
        scarcity: 3,
        meanRarity: "uncommon",
        priceMultiplier: 1.1,
        sellMultiplier: 0.45,
        stock: [
          {
            id: "dnd-silvered-shortsword",
            item: {
              id: "dnd-silvered-shortsword",
              name: "Silvered Shortsword",
              quantity: 1,
              rarity: "common",
              notes: "A silvered blade for monsters with silver vulnerabilities.",
              tags: ["weapon", "silvered"]
            },
            price: { gp: 125 },
            quantityAvailable: 2,
            rarity: "common",
            tags: ["weapon", "silvered"],
            source: "manual"
          },
          {
            id: "dnd-sentinel-shield",
            item: {
              id: "dnd-sentinel-shield",
              name: "Sentinel Shield",
              quantity: 1,
              rarity: "uncommon",
              notes: "Test rare-ish stock. Grants advantage on initiative and Perception checks while held.",
              tags: ["shield", "magic"]
            },
            price: { gp: 350 },
            quantityAvailable: 1,
            rarity: "uncommon",
            tags: ["shield", "magic"],
            requiresGmApproval: true,
            source: "manual"
          }
        ]
      }
    ],
    metadata: { source: "starter", system: "dnd5e", purpose: "test-market" }
  },
  {
    id: "nwod-street-test-market",
    gameTableId: LOCAL_DEMO_CAMPAIGN_ID,
    name: "NWoD Street Test Market",
    description:
      "A street-level NWoD test market using cash and resources-style custom currency.",
    location: "Rat Chapel Back Rooms",
    status: "draft",
    stores: [
      {
        id: "after-hours-fixer",
        name: "After-Hours Fixer",
        theme: "black_market",
        description: "Burner phones, illegal tools, and favors priced in cash.",
        quality: 3,
        scarcity: 3,
        meanRarity: "common",
        priceMultiplier: 1.2,
        sellMultiplier: 0.3,
        stock: [
          {
            id: "nwod-burner-phone-pack",
            item: {
              id: "nwod-burner-phone-pack",
              name: "Burner Phone Pack",
              quantity: 1,
              rarity: "common",
              notes: "Three prepaid phones for contacts, dead drops, and surveillance tests.",
              tags: ["equipment", "intel"]
            },
            price: { custom: { cash: 40 } },
            quantityAvailable: 4,
            rarity: "common",
            tags: ["equipment", "intel"],
            source: "manual"
          },
          {
            id: "nwod-lock-bypass-kit",
            item: {
              id: "nwod-lock-bypass-kit",
              name: "Lock Bypass Kit",
              quantity: 1,
              rarity: "common",
              notes: "A practical kit for Larceny scenes.",
              tags: ["tool", "larceny"]
            },
            price: { custom: { cash: 75 } },
            quantityAvailable: 2,
            rarity: "common",
            tags: ["tool", "larceny"],
            source: "manual"
          }
        ]
      },
      {
        id: "occult-curio-dealer",
        name: "Occult Curio Dealer",
        theme: "arcane",
        description: "Questionable relics and condition-style supernatural tools.",
        quality: 4,
        scarcity: 4,
        meanRarity: "uncommon",
        priceMultiplier: 1.4,
        sellMultiplier: 0.25,
        stock: [
          {
            id: "nwod-rat-bone-rosary",
            item: {
              id: "nwod-rat-bone-rosary",
              name: "Rat-Bone Rosary",
              quantity: 1,
              rarity: "uncommon",
              notes: "A focus for vermin-haunted occult investigation scenes.",
              powers: [
                {
                  id: "power-rat-bone-focus",
                  label: "Vermin Focus",
                  description: "Add a +1 situational bonus to one Occult or Investigation pool involving vermin signs.",
                  action: {
                    id: "action-rat-bone-focus",
                    type: "nwod-pool",
                    label: "Vermin Focus",
                    pool: 1,
                    notes: "Add this as a situational bonus die when the GM agrees."
                  },
                  charges: { current: 1, max: 1, reset: "session" }
                }
              ],
              tags: ["occult", "vermin", "tool"]
            },
            price: { custom: { resources: 1 } },
            quantityAvailable: 1,
            rarity: "uncommon",
            tags: ["occult", "vermin"],
            source: "manual"
          },
          {
            id: "nwod-confession-ledger",
            item: {
              id: "nwod-confession-ledger",
              name: "Confession Ledger Copy",
              quantity: 1,
              rarity: "rare",
              notes: "Blackmail material for social leverage and faction testing.",
              tags: ["intel", "leverage", "black_market"]
            },
            price: { custom: { resources: 2 } },
            quantityAvailable: 1,
            rarity: "rare",
            tags: ["intel", "leverage"],
            requiresGmApproval: true,
            source: "manual"
          }
        ]
      }
    ],
    metadata: { source: "starter", system: "nwod", purpose: "test-market" }
  }
];
