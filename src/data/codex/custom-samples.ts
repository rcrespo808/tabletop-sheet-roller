import type { CodexEntry } from "@/lib/codex/types";

export const customSampleCodex: CodexEntry[] = [
  {
    id: "seed-custom-rat-chapel-reliquary",
    system: "generic",
    type: "item",
    name: "Rat Chapel Reliquary",
    subtitle: "Stolen saint-bone box with a living swarm inside",
    description:
      "A tarnished reliquary from the abandoned chapel. Its false bottom contains teeth, sermon scraps, old plague charms, and a tiny colony that listens for commands scratched into the lid.",
    rulesText:
      "Campaign item. Use as evidence, a vermin-command focus, or a disease vector. The GM decides whether opening it releases scouts, sickness, or a secret message.",
    tags: ["custom", "rat-chapel", "magic-item", "secret"],
    visibility: "gm_only",
    sourceLabel: "Campaign sample",
    grants: [
      {
        type: "inventory_item",
        item: {
          id: "rat-chapel-reliquary",
          name: "Rat Chapel Reliquary",
          quantity: 1,
          description: "A chapel relic box seeded with rat-priest secrets.",
          tags: ["custom", "relic"]
        }
      },
      {
        type: "note",
        title: "Rat Chapel Reliquary",
        body: "GM note: decide what wakes when the reliquary is opened.",
        visibility: "gm_only"
      }
    ]
  },
  {
    id: "seed-custom-blade-last-hour",
    system: "dnd5e",
    type: "item",
    name: "Blade of the Last Hour",
    subtitle: "Campaign sample weapon",
    description:
      "A narrow black blade whose edge seems to arrive a heartbeat before the wielder moves. It was made for executions scheduled at midnight but never completed.",
    rulesText:
      "Custom item. Suggested use: once per rest, after hitting, add necrotic damage or impose a brief time-slowing rider. Keep exact numbers campaign-tuned.",
    tags: ["custom", "magic-item", "weapon", "necrotic"],
    visibility: "campaign",
    sourceLabel: "Campaign sample",
    actionTemplate: {
      id: "blade-last-hour-strike",
      type: "dnd-roll",
      label: "Blade of the Last Hour",
      roll: "1d20+0",
      notes: "Replace +0 with attack bonus. On a charged hit, apply the campaign-tuned rider.",
      source: "custom"
    },
    grants: [
      {
        type: "inventory_item",
        item: {
          id: "blade-of-the-last-hour",
          name: "Blade of the Last Hour",
          quantity: 1,
          description: "Custom magic weapon with a once-per-rest time or necrotic rider.",
          tags: ["custom", "magic-item", "weapon"]
        }
      }
    ]
  },
  {
    id: "seed-custom-swarm-primal-form",
    system: "nwod",
    type: "power",
    name: "Swarm Primal Form",
    subtitle: "Changing Breed rat-priest form",
    description:
      "The character dissolves into a coordinated swarm of rats, retaining intent while gaining infiltration, surveillance, escape, and overwhelming presence in tight spaces.",
    rulesText:
      "Custom power. Use for movement through tiny gaps, distributed scouting, swarm intimidation, and resisting single-target restraint. Fire, poison, and area effects remain dangerous.",
    tags: ["custom", "rat", "swarm", "primal-form"],
    visibility: "campaign",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "swarm-primal-form",
      type: "note",
      label: "Swarm Primal Form",
      notes:
        "Become a coordinated rat swarm for infiltration, surveillance, escape, or occupying enclosed spaces.",
      source: "custom"
    }
  },
  {
    id: "seed-custom-splintered-flesh",
    system: "nwod",
    type: "power",
    name: "Splintered Flesh",
    description:
      "Part of the body becomes one or more rats: an eye scouts a room, a finger slips under a door, or a wound spills messengers.",
    rulesText:
      "Roll a relevant pool for control under stress. The detached piece can scout, steal small objects, gnaw bindings, or carry whispers.",
    tags: ["custom", "rat", "body-horror", "scouting"],
    visibility: "campaign",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "splintered-flesh",
      type: "nwod-pool",
      label: "Splintered Flesh",
      pool: 8,
      again: 10,
      notes: "Partial transformation for scouting, sabotage, or escape.",
      source: "custom"
    }
  },
  {
    id: "seed-custom-many-eyed-sermon",
    system: "nwod",
    type: "power",
    name: "Many-Eyed Sermon",
    description:
      "The rat-priest processes dozens of rat-scout sensory streams at once and delivers the findings as a muttered sermon.",
    rulesText:
      "Roll Wits + Investigation with a bonus when rat scouts have useful access. Rote if the swarm has prepared the site.",
    tags: ["custom", "rat", "investigation", "scouting"],
    visibility: "campaign",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "many-eyed-sermon",
      type: "nwod-check",
      label: "Many-Eyed Sermon",
      attribute: "wits",
      skill: "investigation",
      modifier: 2,
      again: 10,
      rote: true,
      notes: "Process rat-scout sensory streams in parallel.",
      source: "custom"
    }
  },
  {
    id: "seed-custom-vesper-plague",
    system: "nwod",
    type: "disease",
    name: "Vesper Plague",
    description:
      "A chapel-borne sickness carried by vermin, incense smoke, and damp hymnals. Symptoms worsen when bells ring or prayers are whispered.",
    rulesText:
      "Custom disease. Use Stamina or Medicine resistance as appropriate. On failure, apply Sickened, reduced speed, or contaminated social fallout.",
    tags: ["custom", "disease", "rat-chapel", "gm"],
    visibility: "gm_only",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "vesper-plague",
      type: "nwod-check",
      label: "Vesper Plague",
      attribute: "intelligence",
      skill: "medicine",
      modifier: 1,
      again: 10,
      notes: "Prepare, identify, or weaponize disease vectors carried by the swarm.",
      source: "custom"
    }
  },
  {
    id: "seed-custom-rat-in-the-walls",
    system: "nwod",
    type: "power",
    name: "Rat in the Walls",
    description:
      "The character uses vermin routes, rotten wood, pipes, attics, drains, and confessionals to bypass ordinary barriers.",
    rulesText:
      "Roll Dexterity + Stealth when speed, witnesses, wards, or active opposition matter. Grant bonus dice in rat-infested structures.",
    tags: ["custom", "rat", "stealth", "infiltration"],
    visibility: "campaign",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "rat-in-the-walls",
      type: "nwod-check",
      label: "Rat in the Walls",
      attribute: "dexterity",
      skill: "stealth",
      modifier: 2,
      again: 9,
      notes: "Infiltrate through vents, cracks, drains, and ruined chapel wood.",
      source: "custom"
    }
  },
  {
    id: "seed-custom-vermin-gospel",
    system: "nwod",
    type: "rite",
    name: "Vermin Gospel",
    description:
      "A whispered rite that turns ordinary rats into informants, thieves, witnesses, and congregation.",
    rulesText:
      "Roll Manipulation + Animal Ken. Rote when performed in the Rat Chapel or over a prepared scrap of scripture.",
    tags: ["custom", "rat", "rite", "social"],
    visibility: "campaign",
    sourceLabel: "Reverend of Rats sample",
    actionTemplate: {
      id: "vermin-gospel",
      type: "nwod-check",
      label: "Vermin Gospel",
      attribute: "manipulation",
      skill: "animalKen",
      modifier: 2,
      again: 10,
      rote: true,
      notes: "Command rats as informants, thieves, witnesses, and congregation.",
      source: "custom"
    }
  }
];
