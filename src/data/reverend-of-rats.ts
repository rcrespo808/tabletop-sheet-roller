import type { CharacterProfile } from "@/lib/sheets/types";

export const reverendOfRatsProfile: CharacterProfile = {
  id: "reverend-of-rats",
  name: "The Reverend of Rats",
  subtitle: "The Vermin Saint Beneath the Chapel",
  concept:
    "A Changing Breed rat-priest who rules an abandoned church through disease, whispers, infiltration, and a swarm-mind miracle.",
  ownerLabel: "NPC / Player Character",
  defaultSystem: "nwod",
  portraitImage: "/characters/reverend-of-rats/sheet.png",
  sheets: {
    nwod: {
      system: "nwod",
      label: "NWoD",
      levelLabel: "Changing Breed Rat",
      sheetImage: "/characters/reverend-of-rats/sheet.png",
      metadata: {
        breed: "Rat Changing Breed",
        primalForm: "Swarm of Rats",
        hideout: "Sloppily refurbished abandoned church",
        theme: "Disease, intelligence gathering, infiltration, swarm cognition"
      },
      attributes: {
        intelligence: 4,
        wits: 5,
        resolve: 3,
        strength: 2,
        dexterity: 4,
        stamina: 3,
        presence: 3,
        manipulation: 4,
        composure: 3
      },
      stats: {
        willpower: 6,
        maxWillpower: 6,
        health: 8,
        maxHealth: 8,
        defense: 4,
        speed: 11,
        initiative: 7,
        armor: 0,
        morality: 5
      },
      skills: {
        academics: 2,
        computer: 1,
        crafts: 2,
        investigation: 4,
        medicine: 3,
        occult: 4,
        politics: 1,
        science: 2,
        athletics: 2,
        brawl: 2,
        drive: 0,
        firearms: 0,
        larceny: 4,
        stealth: 5,
        survival: 3,
        animalKen: 4,
        empathy: 2,
        expression: 2,
        intimidation: 3,
        persuasion: 2,
        socialize: 1,
        streetwise: 4,
        subterfuge: 4
      },
      actions: [
        {
          id: "nwod-swarm-primal-form",
          type: "note",
          label: "Primal Form: Swarm of Rats",
          notes:
            "The Reverend dissolves into a coordinated swarm. Excellent for infiltration, escape, surveillance, and overwhelming enclosed spaces. Individual rats may scout through cracks, vents, pipes, and reliquary holes.",
          source: "custom",
          hotspot: { x: 50, y: 18, icon: "rat" }
        },
        {
          id: "nwod-many-eyes-sermon",
          type: "nwod-check",
          label: "Many-Eyed Sermon",
          attribute: "wits",
          skill: "investigation",
          modifier: 2,
          again: 10,
          rote: true,
          notes: "Process dozens of rat-scout sensory streams in parallel.",
          source: "custom"
        },
        {
          id: "nwod-vesper-plague",
          type: "nwod-check",
          label: "Vesper Plague",
          attribute: "intelligence",
          skill: "medicine",
          modifier: 1,
          again: 10,
          rote: false,
          notes: "Prepare, identify, or weaponize disease vectors carried by the swarm.",
          source: "custom"
        },
        {
          id: "nwod-rat-in-the-walls",
          type: "nwod-check",
          label: "Rat in the Walls",
          attribute: "dexterity",
          skill: "stealth",
          modifier: 2,
          again: 9,
          rote: false,
          notes:
            "Infiltrate through impossible gaps, drains, attics, confessionals, and rotten chapel wood.",
          source: "custom"
        },
        {
          id: "nwod-splintered-flesh",
          type: "nwod-pool",
          label: "Splintered Flesh",
          pool: 8,
          again: 10,
          rote: false,
          notes:
            "Partially transform a hand, eye, tongue, or wound into individual rats for scouting, sabotage, or escape.",
          source: "custom"
        },
        {
          id: "nwod-vermin-gospel",
          type: "nwod-check",
          label: "Vermin Gospel",
          attribute: "manipulation",
          skill: "animalKen",
          modifier: 2,
          again: 10,
          rote: true,
          notes: "Command rats as informants, thieves, witnesses, and congregation.",
          source: "custom"
        },
        {
          id: "nwod-abandoned-church",
          type: "note",
          label: "Hideout: The Rat Chapel",
          notes:
            "An abandoned church crudely restored with stolen pews, wax-dripped icons, patched roofs, hidden tunnels, and rat-holes behind every saint. It is half sanctuary, half intelligence nest.",
          source: "custom"
        }
      ]
    },
    dnd5e: {
      system: "dnd5e",
      label: "D&D 5e",
      levelLabel: "Level 12 Custom Druid: Circle of the Vermin Mass",
      sheetImage: "/characters/reverend-of-rats/sheet.png",
      metadata: {
        class: "Custom Druid",
        subclass: "Circle of the Vermin Mass",
        primalForm: "Swarm of Rats",
        spellcasting: "Wisdom",
        theme: "Disease, infiltration, swarm divination, abandoned church lair"
      },
      attributes: {
        str: 8,
        dex: 16,
        con: 15,
        int: 14,
        wis: 20,
        cha: 14
      },
      stats: {
        level: 12,
        proficiencyBonus: 4,
        armorClass: 16,
        initiativeBonus: 3,
        speed: 30,
        maxHp: 87,
        currentHp: 87,
        spellSaveDc: 17,
        spellAttackBonus: 9
      },
      skills: {
        acrobatics: { ability: "dex" },
        animalHandling: { ability: "wis", proficient: true },
        arcana: { ability: "int", proficient: true },
        athletics: { ability: "str" },
        deception: { ability: "cha", proficient: true },
        history: { ability: "int" },
        insight: { ability: "wis", proficient: true },
        intimidation: { ability: "cha" },
        investigation: { ability: "int", proficient: true },
        medicine: { ability: "wis", proficient: true },
        nature: { ability: "int", proficient: true },
        perception: { ability: "wis", expertise: true },
        performance: { ability: "cha" },
        persuasion: { ability: "cha" },
        religion: { ability: "int", proficient: true },
        sleightOfHand: { ability: "dex", proficient: true },
        stealth: { ability: "dex", expertise: true },
        survival: { ability: "wis", proficient: true }
      },
      actions: [
        {
          id: "dnd-wild-shape-vermin-mass",
          type: "note",
          label: "Wild Shape: Vermin Mass",
          notes:
            "Custom druidic transformation. Become a swarm of rats instead of a beast. Ideal for infiltration, escape, scouting, occupying enemy spaces, and slipping through cracks.",
          source: "custom",
          hotspot: { x: 48, y: 20, icon: "rat" }
        },
        {
          id: "dnd-bite-of-the-congregation",
          type: "dnd-roll",
          label: "Bite of the Congregation",
          roll: "1d20+9",
          notes:
            "Spell or swarm attack roll. On hit, follow with disease or necrotic swarm damage if prepared.",
          source: "custom"
        },
        {
          id: "dnd-swarm-damage",
          type: "dnd-roll",
          label: "Swarm Damage",
          roll: "4d6+5",
          notes: "Piercing/necrotic damage from a coordinated rat swarm.",
          source: "custom"
        },
        {
          id: "dnd-vesper-plague-save",
          type: "note",
          label: "Vesper Plague",
          notes:
            "Enemies in the swarm or infected area make a CON save against Spell Save DC 17. Suggested failure: poisoned, reduced speed, or unable to regain hit points until end of next turn.",
          source: "custom"
        },
        {
          id: "dnd-many-eyes-sermon",
          type: "dnd-check",
          label: "Many-Eyed Sermon",
          ability: "wis",
          skill: "perception",
          modifier: 2,
          notes: "Use rat scouts and parallel beast-mind processing to gather information.",
          source: "custom"
        },
        {
          id: "dnd-rat-in-the-walls",
          type: "dnd-check",
          label: "Rat in the Walls",
          ability: "dex",
          skill: "stealth",
          modifier: 2,
          notes: "Infiltration through vents, cracks, tunnels, drains, and ruined masonry.",
          source: "custom"
        },
        {
          id: "dnd-splintered-flesh",
          type: "note",
          label: "Splintered Flesh",
          notes:
            "Partial transformation: an eye, finger, wound, or tongue becomes a rat. Use for scouting, carrying messages, stealing keys, chewing bindings, or seeing beyond walls.",
          source: "custom"
        },
        {
          id: "dnd-rat-chapel",
          type: "note",
          label: "Lair: The Rat Chapel",
          notes:
            "An abandoned church sloppily restored into a vermin sanctuary. Hidden tunnels, diseased reliquaries, rat nests behind icons, and stolen confession ledgers form his base of operations.",
          source: "custom"
        }
      ]
    }
  }
};
