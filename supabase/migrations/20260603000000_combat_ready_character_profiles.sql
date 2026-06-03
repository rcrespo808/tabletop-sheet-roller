-- Normalize existing named character profiles for combat extraction.
--
-- This migration intentionally updates only matching existing rows. It does not
-- insert characters, delete characters, truncate data, or modify ownership.

create or replace function pg_temp.ensure_jsonb_array(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(value) = 'array' then value
    else '[]'::jsonb
  end;
$$;

create or replace function pg_temp.ensure_jsonb_object(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(value) = 'object' then value
    else '{}'::jsonb
  end;
$$;

create or replace function pg_temp.merge_jsonb_array_by_id(existing jsonb, additions jsonb)
returns jsonb
language sql
as $$
  with existing_entries as (
    select value as item, ordinality
    from jsonb_array_elements(pg_temp.ensure_jsonb_array(existing)) with ordinality
  ),
  addition_entries as (
    select value as item, ordinality
    from jsonb_array_elements(pg_temp.ensure_jsonb_array(additions)) with ordinality
  ),
  merged_existing as (
    select
      e.ordinality,
      case
        when a.item is null then e.item
        else
          e.item
          || a.item
          || case
            when jsonb_typeof(e.item -> 'metadata') = 'object'
              or jsonb_typeof(a.item -> 'metadata') = 'object'
            then jsonb_build_object(
              'metadata',
              pg_temp.ensure_jsonb_object(e.item -> 'metadata')
              || pg_temp.ensure_jsonb_object(a.item -> 'metadata')
            )
            else '{}'::jsonb
          end
      end as item
    from existing_entries e
    left join lateral (
      select item
      from addition_entries a
      where a.item ? 'id'
        and e.item ? 'id'
        and a.item ->> 'id' = e.item ->> 'id'
      order by a.ordinality
      limit 1
    ) a on true
  ),
  new_additions as (
    select
      100000 + a.ordinality as ordinality,
      a.item
    from addition_entries a
    where not exists (
      select 1
      from existing_entries e
      where a.item ? 'id'
        and e.item ? 'id'
        and a.item ->> 'id' = e.item ->> 'id'
    )
  )
  select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
  from (
    select * from merged_existing
    union all
    select * from new_additions
  ) combined;
$$;

create or replace function pg_temp.merge_system_sheet(
  sheets jsonb,
  system_key text,
  template jsonb,
  action_additions jsonb
)
returns jsonb
language sql
as $$
  with base as (
    select pg_temp.ensure_jsonb_object(sheets) as sheets
  ),
  existing as (
    select pg_temp.ensure_jsonb_object(base.sheets -> system_key) as sheet
    from base
  ),
  merged as (
    select
      template
      || existing.sheet
      || jsonb_build_object(
        'system', system_key,
        'attributes',
          pg_temp.ensure_jsonb_object(template -> 'attributes')
          || pg_temp.ensure_jsonb_object(existing.sheet -> 'attributes'),
        'stats',
          pg_temp.ensure_jsonb_object(template -> 'stats')
          || pg_temp.ensure_jsonb_object(existing.sheet -> 'stats'),
        'skills',
          pg_temp.ensure_jsonb_object(template -> 'skills')
          || pg_temp.ensure_jsonb_object(existing.sheet -> 'skills'),
        'metadata',
          pg_temp.ensure_jsonb_object(template -> 'metadata')
          || pg_temp.ensure_jsonb_object(existing.sheet -> 'metadata'),
        'actions',
          pg_temp.merge_jsonb_array_by_id(existing.sheet -> 'actions', action_additions)
      ) as sheet
    from existing
  )
  select jsonb_set(base.sheets, array[system_key], merged.sheet, true)
  from base, merged;
$$;

create or replace function pg_temp.add_power_to_named_item(
  inventory jsonb,
  item_name_pattern text,
  power_addition jsonb
)
returns jsonb
language sql
as $$
  select coalesce(
    jsonb_agg(
      case
        when lower(item ->> 'name') like lower(item_name_pattern)
        then jsonb_set(
          item,
          '{powers}',
          pg_temp.merge_jsonb_array_by_id(item -> 'powers', jsonb_build_array(power_addition)),
          true
        )
        else item
      end
      order by ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(pg_temp.ensure_jsonb_array(inventory)) with ordinality as entry(item, ordinality);
$$;

do $$
declare
  he_rows integer := 0;
  reverend_rows integer := 0;
  bruno_rows integer := 0;

  he_dnd_template jsonb := $json$
  {
    "system": "dnd5e",
    "label": "D&D 5e",
    "levelLabel": "Level 12 Resonant",
    "sheetImage": "/characters/he-zhen/sheet.png",
    "metadata": {
      "class": "Resonant",
      "role": "Occult anti-magic controller",
      "theme": "Silence, resonance, signal manipulation"
    },
    "attributes": {
      "str": 10,
      "dex": 16,
      "con": 14,
      "int": 20,
      "wis": 14,
      "cha": 12
    },
    "stats": {
      "level": 12,
      "proficiencyBonus": 4,
      "armorClass": 16,
      "initiativeBonus": 3,
      "speed": 30,
      "maxHp": 84,
      "currentHp": 84,
      "spellSaveDc": 18,
      "spellAttackBonus": 10,
      "saveProficiencies": { "int": true, "wis": true }
    },
    "skills": {
      "arcana": { "ability": "int", "proficient": true },
      "investigation": { "ability": "int", "proficient": true },
      "insight": { "ability": "wis", "proficient": true },
      "perception": { "ability": "wis", "proficient": true },
      "religion": { "ability": "int", "proficient": true },
      "stealth": { "ability": "dex", "proficient": true }
    },
    "actions": []
  }
  $json$::jsonb;

  he_dnd_actions jsonb := $json$
  [
    {
      "id": "dnd-resonant-strike",
      "type": "dnd-roll",
      "label": "Resonant Strike",
      "roll": "1d20+10",
      "notes": "Focused resonance attack. On hit, deal 2d8+5 thunder damage and expose signal interference for GM adjudication.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "attackRoll": "1d20+10",
        "damageRoll": "2d8+5",
        "damageType": "thunder"
      }
    },
    {
      "id": "dnd-sonic-thread",
      "type": "dnd-check",
      "label": "Sonic Thread",
      "ability": "int",
      "skill": "arcana",
      "modifier": 0,
      "notes": "Trace, bend, or sever a supernatural signal without making He Zhen a pure damage dealer.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    },
    {
      "id": "dnd-absolute-silence",
      "type": "dnd-check",
      "label": "Absolute Silence",
      "ability": "int",
      "skill": "arcana",
      "modifier": 0,
      "notes": "Suppress sound, verbal components, alarms, and resonance signatures. Roll-only combat control.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    },
    {
      "id": "dnd-harmonic-ward",
      "type": "dnd-check",
      "label": "Harmonic Ward",
      "ability": "wis",
      "skill": "insight",
      "modifier": 0,
      "notes": "Read hostile rhythm and tune a warding counter-frequency.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "dnd-resonance-check",
      "type": "dnd-check",
      "label": "Resonance Check",
      "ability": "int",
      "skill": "arcana",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    }
  ]
  $json$::jsonb;

  he_nwod_template jsonb := $json$
  {
    "system": "nwod",
    "label": "NWoD",
    "levelLabel": "Occult Resonance Operator",
    "sheetImage": "/characters/he-zhen/sheet.png",
    "metadata": {
      "role": "Occult resonance operator",
      "theme": "Dead air, signal hijacking, harmonic warding"
    },
    "attributes": {
      "intelligence": 4,
      "wits": 5,
      "resolve": 4,
      "strength": 2,
      "dexterity": 3,
      "stamina": 3,
      "presence": 3,
      "manipulation": 4,
      "composure": 4
    },
    "stats": {
      "willpower": 6,
      "maxWillpower": 6,
      "health": 7,
      "maxHealth": 7,
      "defense": 2,
      "speed": 9,
      "initiative": 9,
      "armor": 0,
      "morality": 7
    },
    "skills": {
      "computer": 2,
      "empathy": 2,
      "expression": 3,
      "intimidation": 2,
      "investigation": 3,
      "occult": 4,
      "persuasion": 2,
      "science": 2,
      "stealth": 2,
      "subterfuge": 3
    },
    "actions": []
  }
  $json$::jsonb;

  he_nwod_actions jsonb := $json$
  [
    {
      "id": "nwod-resonance-projection",
      "type": "nwod-check",
      "label": "Resonance Projection",
      "attribute": "wits",
      "skill": "occult",
      "modifier": 1,
      "again": 10,
      "rote": false,
      "notes": "Project a controlled occult resonance through the field.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "damage": 1
      }
    },
    {
      "id": "nwod-absolute-silence",
      "type": "nwod-check",
      "label": "Absolute Silence",
      "attribute": "wits",
      "skill": "occult",
      "modifier": 1,
      "again": 10,
      "rote": false,
      "notes": "Smother sound, attention, and ritual signal. Roll-only combat control.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    },
    {
      "id": "nwod-signal-hijack",
      "type": "nwod-check",
      "label": "Signal Hijack",
      "attribute": "intelligence",
      "skill": "investigation",
      "modifier": 1,
      "again": 10,
      "rote": false,
      "notes": "Find and redirect a mundane or supernatural command channel.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "nwod-harmonic-ward",
      "type": "nwod-check",
      "label": "Harmonic Ward",
      "attribute": "resolve",
      "skill": "occult",
      "modifier": 1,
      "again": 10,
      "rote": false,
      "notes": "Tune a defensive counter-frequency against intrusion or hostile resonance.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    }
  ]
  $json$::jsonb;

  reverend_nwod_template jsonb := $json$
  {
    "system": "nwod",
    "label": "NWoD",
    "levelLabel": "Changing Breed Rat",
    "sheetImage": "/characters/reverend-of-rats/sheet.png",
    "metadata": {
      "breed": "Rat Changing Breed",
      "primalForm": "Swarm of Rats",
      "hideout": "Sloppily refurbished abandoned church",
      "theme": "Disease, intelligence gathering, infiltration, swarm cognition"
    },
    "attributes": {
      "intelligence": 4,
      "wits": 5,
      "resolve": 3,
      "strength": 2,
      "dexterity": 4,
      "stamina": 3,
      "presence": 3,
      "manipulation": 4,
      "composure": 3
    },
    "stats": {
      "willpower": 6,
      "maxWillpower": 6,
      "health": 8,
      "maxHealth": 8,
      "defense": 4,
      "speed": 11,
      "initiative": 7,
      "armor": 0,
      "morality": 5
    },
    "skills": {
      "academics": 2,
      "animalKen": 4,
      "athletics": 2,
      "brawl": 2,
      "crafts": 2,
      "empathy": 2,
      "expression": 2,
      "intimidation": 3,
      "investigation": 4,
      "larceny": 4,
      "medicine": 3,
      "occult": 4,
      "persuasion": 2,
      "politics": 1,
      "science": 2,
      "socialize": 1,
      "stealth": 5,
      "streetwise": 4,
      "subterfuge": 4,
      "survival": 3
    },
    "actions": []
  }
  $json$::jsonb;

  reverend_nwod_actions jsonb := $json$
  [
    {
      "id": "nwod-swarm-bite",
      "type": "nwod-check",
      "label": "Swarm Bite",
      "attribute": "dexterity",
      "skill": "brawl",
      "modifier": 2,
      "again": 10,
      "rote": false,
      "notes": "A coordinated mass of teeth overwhelms close targets in the chapel dark.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "damage": 1
      }
    },
    {
      "id": "nwod-vermin-gospel-attack",
      "type": "nwod-check",
      "label": "Vermin Gospel",
      "attribute": "manipulation",
      "skill": "animalKen",
      "modifier": 2,
      "again": 10,
      "rote": true,
      "notes": "Command the congregation into a violent surge while retaining the Reverend's intelligence-gathering identity.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "damage": 1
      }
    },
    {
      "id": "nwod-many-eyes-sermon",
      "type": "nwod-check",
      "label": "Many-Eyed Sermon",
      "attribute": "wits",
      "skill": "investigation",
      "modifier": 2,
      "again": 10,
      "rote": true,
      "notes": "Process dozens of rat-scout sensory streams in parallel.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "nwod-rat-in-the-walls",
      "type": "nwod-check",
      "label": "Rat in the Walls",
      "attribute": "dexterity",
      "skill": "stealth",
      "modifier": 2,
      "again": 9,
      "rote": false,
      "notes": "Infiltrate through impossible gaps, drains, attics, confessionals, and rotten chapel wood.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "nwod-vesper-plague",
      "type": "nwod-check",
      "label": "Vesper Plague",
      "attribute": "intelligence",
      "skill": "medicine",
      "modifier": 1,
      "again": 10,
      "rote": false,
      "notes": "Prepare, identify, or weaponize disease vectors carried by the swarm.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    }
  ]
  $json$::jsonb;

  reverend_dnd_template jsonb := $json$
  {
    "system": "dnd5e",
    "label": "D&D 5e",
    "levelLabel": "Level 12 Custom Druid: Circle of the Vermin Mass",
    "sheetImage": "/characters/reverend-of-rats/sheet.png",
    "metadata": {
      "class": "Custom Druid",
      "subclass": "Circle of the Vermin Mass",
      "primalForm": "Swarm of Rats",
      "spellcasting": "Wisdom",
      "theme": "Disease, infiltration, swarm divination, abandoned church lair"
    },
    "attributes": {
      "str": 8,
      "dex": 16,
      "con": 15,
      "int": 14,
      "wis": 20,
      "cha": 14
    },
    "stats": {
      "level": 12,
      "proficiencyBonus": 4,
      "armorClass": 16,
      "initiativeBonus": 3,
      "speed": 30,
      "maxHp": 87,
      "currentHp": 87,
      "spellSaveDc": 17,
      "spellAttackBonus": 9
    },
    "skills": {
      "animalHandling": { "ability": "wis", "proficient": true },
      "arcana": { "ability": "int", "proficient": true },
      "deception": { "ability": "cha", "proficient": true },
      "insight": { "ability": "wis", "proficient": true },
      "investigation": { "ability": "int", "proficient": true },
      "medicine": { "ability": "wis", "proficient": true },
      "nature": { "ability": "int", "proficient": true },
      "perception": { "ability": "wis", "expertise": true },
      "religion": { "ability": "int", "proficient": true },
      "sleightOfHand": { "ability": "dex", "proficient": true },
      "stealth": { "ability": "dex", "expertise": true },
      "survival": { "ability": "wis", "proficient": true }
    },
    "actions": []
  }
  $json$::jsonb;

  reverend_dnd_actions jsonb := $json$
  [
    {
      "id": "dnd-bite-of-the-congregation",
      "type": "dnd-roll",
      "label": "Bite of the Congregation",
      "roll": "1d20+9",
      "notes": "Spell or swarm attack roll. On hit, deal 4d6+5 piercing and necrotic swarm damage.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "attackRoll": "1d20+9",
        "damageRoll": "4d6+5",
        "damageType": "piercing"
      }
    },
    {
      "id": "dnd-swarm-damage",
      "type": "dnd-roll",
      "label": "Swarm Damage",
      "roll": "4d6+5",
      "notes": "Roll-only swarm damage reminder when the GM resolves an area swarm effect.",
      "source": "custom",
      "metadata": {
        "combatCategory": "power",
        "damageRoll": "4d6+5",
        "damageType": "piercing"
      }
    },
    {
      "id": "dnd-many-eyes-sermon",
      "type": "dnd-check",
      "label": "Many-Eyed Sermon",
      "ability": "wis",
      "skill": "perception",
      "modifier": 2,
      "notes": "Use rat scouts and parallel beast-mind processing to gather information.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "dnd-rat-in-the-walls",
      "type": "dnd-check",
      "label": "Rat in the Walls",
      "ability": "dex",
      "skill": "stealth",
      "modifier": 2,
      "notes": "Infiltration through vents, cracks, tunnels, drains, and ruined masonry.",
      "source": "custom",
      "metadata": { "combatCategory": "skill" }
    },
    {
      "id": "dnd-vesper-plague-save",
      "type": "note",
      "label": "Vesper Plague",
      "notes": "Enemies in the swarm or infected area make a CON save against Spell Save DC 17. Suggested failure: poisoned, reduced speed, or unable to regain hit points until end of next turn.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    }
  ]
  $json$::jsonb;

  bruno_dnd_template jsonb := $json$
  {
    "system": "dnd5e",
    "label": "D&D 5e",
    "levelLabel": "Level 6 Monk",
    "sheetImage": "/characters/bruno-salvatierra/sheet.png",
    "metadata": {
      "class": "Monk",
      "level": 6,
      "fightingStyle": "Boxing",
      "theme": "Boxing champion, defensive atavism, concrete endurance"
    },
    "attributes": {
      "str": 18,
      "dex": 16,
      "con": 16,
      "int": 10,
      "wis": 14,
      "cha": 11
    },
    "stats": {
      "level": 6,
      "proficiencyBonus": 3,
      "armorClass": 16,
      "initiativeBonus": 3,
      "speed": 45,
      "maxHp": 51,
      "currentHp": 51
    },
    "skills": {
      "athletics": { "ability": "str", "expertise": true },
      "insight": { "ability": "wis", "proficient": true },
      "intimidation": { "ability": "cha", "proficient": true },
      "perception": { "ability": "wis", "proficient": true }
    },
    "actions": []
  }
  $json$::jsonb;

  bruno_dnd_actions jsonb := $json$
  [
    {
      "id": "dnd-boxing-jab",
      "type": "dnd-roll",
      "label": "Boxing Jab",
      "roll": "1d20+7",
      "notes": "Fast monk unarmed strike. On hit, deal 1d6+4 bludgeoning damage.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "attackRoll": "1d20+7",
        "damageRoll": "1d6+4",
        "damageType": "bludgeoning"
      }
    },
    {
      "id": "dnd-power-cross",
      "type": "dnd-roll",
      "label": "Power Cross",
      "roll": "1d20+7",
      "notes": "Committed boxing strike. On hit, deal 1d8+4 bludgeoning damage.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "attackRoll": "1d20+7",
        "damageRoll": "1d8+4",
        "damageType": "bludgeoning"
      }
    },
    {
      "id": "dnd-flurry-of-blows",
      "type": "dnd-roll",
      "label": "Flurry of Blows",
      "roll": "1d20+7",
      "notes": "Spend ki after the Attack action to add rapid unarmed strikes. Resolve each hit as 1d6+4 bludgeoning.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "attackRoll": "1d20+7",
        "damageRoll": "1d6+4",
        "damageType": "bludgeoning",
        "resource": "ki"
      }
    },
    {
      "id": "dnd-stunning-strike",
      "type": "note",
      "label": "Stunning Strike",
      "notes": "After a melee weapon attack hits, spend 1 ki. Target makes a CON save against DC 14 or is stunned until the end of Bruno's next turn.",
      "source": "custom",
      "metadata": {
        "combatCategory": "power",
        "saveDc": 14,
        "saveAbility": "con",
        "resource": "ki"
      }
    },
    {
      "id": "dnd-patient-defense",
      "type": "note",
      "label": "Patient Defense",
      "notes": "Spend 1 ki to Dodge as a bonus action. Defensive atavism hardens his posture like poured concrete.",
      "source": "custom",
      "metadata": {
        "combatCategory": "power",
        "resource": "ki"
      }
    }
  ]
  $json$::jsonb;

  bruno_nwod_template jsonb := $json$
  {
    "system": "nwod",
    "label": "NWoD",
    "levelLabel": "Boxing Champion",
    "sheetImage": "/characters/bruno-salvatierra/sheet.png",
    "metadata": {
      "fightingStyle": "Boxing",
      "atavism": "Concrete Hide",
      "theme": "High Strength, defensive atavism, sparse personal life"
    },
    "attributes": {
      "intelligence": 2,
      "wits": 3,
      "resolve": 4,
      "strength": 5,
      "dexterity": 3,
      "stamina": 4,
      "presence": 2,
      "manipulation": 1,
      "composure": 3
    },
    "stats": {
      "willpower": 7,
      "maxWillpower": 7,
      "health": 9,
      "maxHealth": 9,
      "defense": 3,
      "speed": 13,
      "initiative": 6,
      "armor": 0,
      "morality": 6
    },
    "skills": {
      "athletics": 3,
      "brawl": 5,
      "empathy": 1,
      "intimidation": 2,
      "streetwise": 2,
      "survival": 1
    },
    "actions": []
  }
  $json$::jsonb;

  bruno_nwod_actions jsonb := $json$
  [
    {
      "id": "nwod-heavy-jab",
      "type": "nwod-check",
      "label": "Heavy Jab",
      "attribute": "strength",
      "skill": "brawl",
      "modifier": 0,
      "again": 10,
      "rote": false,
      "notes": "Clean championship jab backed by extraordinary strength.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "damage": 1
      }
    },
    {
      "id": "nwod-championship-combination",
      "type": "nwod-check",
      "label": "Championship Combination",
      "attribute": "strength",
      "skill": "brawl",
      "modifier": 2,
      "again": 10,
      "rote": false,
      "notes": "A practiced one-two-three combination that punishes openings.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "fight",
        "damage": 1
      }
    },
    {
      "id": "nwod-concrete-hide",
      "type": "note",
      "label": "Concrete Hide",
      "notes": "Defensive atavism: Bruno's body goes dense and unyielding. Use as a defensive power or armor justification at GM discretion.",
      "source": "custom",
      "metadata": { "combatCategory": "power" }
    }
  ]
  $json$::jsonb;

  bruno_wraps_power jsonb := $json$
  {
    "id": "power-concrete-psalm-cross",
    "label": "Concrete Psalm Cross",
    "description": "The worn wraps focus Bruno's championship cross into a combat-ready strike.",
    "charges": { "current": 1, "max": 1, "reset": "short_rest" },
    "consumesItem": false,
    "action": {
      "id": "action-concrete-psalm-cross",
      "type": "dnd-roll",
      "label": "Concrete Psalm Cross",
      "roll": "1d20+7",
      "notes": "On hit, deal 1d8+4 bludgeoning damage.",
      "source": "custom",
      "metadata": {
        "combatKind": "attack",
        "combatCategory": "item",
        "attackRoll": "1d20+7",
        "damageRoll": "1d8+4",
        "damageType": "bludgeoning"
      }
    }
  }
  $json$::jsonb;
begin
  update public.character_profiles
  set
    owner_label = coalesce(nullif(owner_label, ''), 'NPC / Player Character'),
    character_kind = coalesce(character_kind, 'player_character'::public.character_kind),
    subtitle = coalesce(nullif(subtitle, ''), 'The Tuned Immortal'),
    concept = coalesce(nullif(concept, ''), 'Occult signal manipulator and silence-based controller.'),
    portrait_image = coalesce(nullif(portrait_image, ''), '/characters/he-zhen/sheet.png'),
    default_system = 'dnd5e',
    sheets = pg_temp.merge_system_sheet(
      pg_temp.merge_system_sheet(sheets, 'dnd5e', he_dnd_template, he_dnd_actions),
      'nwod',
      he_nwod_template,
      he_nwod_actions
    ),
    inventory = pg_temp.ensure_jsonb_array(inventory),
    wallet = '{"gp":0,"sp":0,"cp":0,"xp":0,"custom":{}}'::jsonb || pg_temp.ensure_jsonb_object(wallet),
    reward_history = pg_temp.ensure_jsonb_array(reward_history),
    progression = '{"level":12,"xp":0,"milestones":[]}'::jsonb || pg_temp.ensure_jsonb_object(progression),
    conditions = pg_temp.ensure_jsonb_array(conditions)
  where id in ('he-zhen', 'deploy-he-zhen')
     or lower(name) = 'he zhen';
  get diagnostics he_rows = row_count;

  update public.character_profiles
  set
    owner_label = coalesce(nullif(owner_label, ''), 'NPC / Player Character'),
    character_kind = coalesce(character_kind, 'gm_character'::public.character_kind),
    name = case when lower(name) = 'reverend of rats' then 'The Reverend of Rats' else name end,
    subtitle = coalesce(nullif(subtitle, ''), 'The Vermin Saint Beneath the Chapel'),
    concept = coalesce(
      nullif(concept, ''),
      'A Changing Breed rat-priest who rules an abandoned church through disease, whispers, infiltration, and a swarm-mind miracle.'
    ),
    portrait_image = coalesce(nullif(portrait_image, ''), '/characters/reverend-of-rats/sheet.png'),
    default_system = 'nwod',
    sheets = pg_temp.merge_system_sheet(
      pg_temp.merge_system_sheet(sheets, 'nwod', reverend_nwod_template, reverend_nwod_actions),
      'dnd5e',
      reverend_dnd_template,
      reverend_dnd_actions
    ),
    inventory = pg_temp.ensure_jsonb_array(inventory),
    wallet = '{"gp":0,"sp":0,"cp":0,"xp":0,"custom":{"resources":0}}'::jsonb || pg_temp.ensure_jsonb_object(wallet),
    reward_history = pg_temp.ensure_jsonb_array(reward_history),
    progression = '{"level":12,"xp":0,"milestones":[]}'::jsonb || pg_temp.ensure_jsonb_object(progression),
    conditions = pg_temp.ensure_jsonb_array(conditions)
  where id in ('reverend-of-rats', 'deploy-reverend-of-rats')
     or lower(name) in ('the reverend of rats', 'reverend of rats');
  get diagnostics reverend_rows = row_count;

  update public.character_profiles
  set
    owner_label = coalesce(nullif(owner_label, ''), 'NPC / Player Character'),
    character_kind = coalesce(character_kind, 'player_character'::public.character_kind),
    subtitle = coalesce(nullif(subtitle, ''), 'The Concrete Psalm'),
    concept = coalesce(
      nullif(concept, ''),
      'A boxing champion with little personal life, high Strength, disciplined combinations, and defensive concrete atavism.'
    ),
    portrait_image = coalesce(nullif(portrait_image, ''), '/characters/bruno-salvatierra/sheet.png'),
    default_system = 'dnd5e',
    sheets = pg_temp.merge_system_sheet(
      pg_temp.merge_system_sheet(sheets, 'dnd5e', bruno_dnd_template, bruno_dnd_actions),
      'nwod',
      bruno_nwod_template,
      bruno_nwod_actions
    ),
    inventory = pg_temp.add_power_to_named_item(
      pg_temp.ensure_jsonb_array(inventory),
      '%worn championship wraps%',
      bruno_wraps_power
    ),
    wallet = '{"gp":0,"sp":0,"cp":0,"xp":0,"custom":{}}'::jsonb || pg_temp.ensure_jsonb_object(wallet),
    reward_history = pg_temp.ensure_jsonb_array(reward_history),
    progression = '{"level":6,"xp":0,"milestones":[]}'::jsonb || pg_temp.ensure_jsonb_object(progression),
    conditions = pg_temp.ensure_jsonb_array(conditions)
  where id in (
      'bruno-salvatierra',
      'bruno-the-concrete-psalm-salvatierra',
      'bruno-concrete-psalm'
    )
     or (
      lower(name) like '%bruno%'
      and (
        lower(name) like '%salvatierra%'
        or lower(name) like '%concrete psalm%'
      )
    );
  get diagnostics bruno_rows = row_count;

  raise notice 'Combat-ready character migration updated % He Zhen row(s), % Reverend row(s), and % Bruno row(s).',
    he_rows,
    reverend_rows,
    bruno_rows;

  if exists (
    select 1
    from public.character_profiles
    where (
      id in (
        'he-zhen',
        'deploy-he-zhen',
        'reverend-of-rats',
        'deploy-reverend-of-rats',
        'bruno-salvatierra',
        'bruno-the-concrete-psalm-salvatierra',
        'bruno-concrete-psalm'
      )
      or lower(name) in ('he zhen', 'the reverend of rats', 'reverend of rats')
      or (
        lower(name) like '%bruno%'
        and (
          lower(name) like '%salvatierra%'
          or lower(name) like '%concrete psalm%'
        )
      )
    )
    and not (pg_temp.ensure_jsonb_object(sheets) ? default_system)
  ) then
    raise exception 'Combat-ready character migration produced a default_system without a matching sheet.';
  end if;

  if exists (
    select 1
    from public.character_profiles
    where pg_temp.ensure_jsonb_object(sheets) ? 'dnd5e'
      and (
        not (pg_temp.ensure_jsonb_object(sheets #> '{dnd5e,attributes}') ?& array['str','dex','con','int','wis','cha'])
        or not (pg_temp.ensure_jsonb_object(sheets #> '{dnd5e,stats}') ?& array['level','proficiencyBonus','armorClass','initiativeBonus','speed','maxHp','currentHp'])
      )
      and (
        id in ('he-zhen', 'deploy-he-zhen', 'reverend-of-rats', 'deploy-reverend-of-rats', 'bruno-salvatierra', 'bruno-the-concrete-psalm-salvatierra', 'bruno-concrete-psalm')
        or lower(name) in ('he zhen', 'the reverend of rats', 'reverend of rats')
        or lower(name) like '%bruno%salvatierra%'
        or lower(name) like '%bruno%concrete psalm%'
      )
  ) then
    raise exception 'Combat-ready character migration produced an incomplete D&D 5e sheet.';
  end if;

  if exists (
    select 1
    from public.character_profiles
    where pg_temp.ensure_jsonb_object(sheets) ? 'nwod'
      and (
        not (pg_temp.ensure_jsonb_object(sheets #> '{nwod,attributes}') ?& array['intelligence','wits','resolve','strength','dexterity','stamina','presence','manipulation','composure'])
        or not (pg_temp.ensure_jsonb_object(sheets #> '{nwod,stats}') ?& array['health','maxHealth','defense','speed','initiative','armor'])
      )
      and (
        id in ('he-zhen', 'deploy-he-zhen', 'reverend-of-rats', 'deploy-reverend-of-rats', 'bruno-salvatierra', 'bruno-the-concrete-psalm-salvatierra', 'bruno-concrete-psalm')
        or lower(name) in ('he zhen', 'the reverend of rats', 'reverend of rats')
        or lower(name) like '%bruno%salvatierra%'
        or lower(name) like '%bruno%concrete psalm%'
      )
  ) then
    raise exception 'Combat-ready character migration produced an incomplete NWoD sheet.';
  end if;

  if exists (
    select 1
    from public.character_profiles profiles
    where (
      id in ('he-zhen', 'deploy-he-zhen', 'reverend-of-rats', 'deploy-reverend-of-rats', 'bruno-salvatierra', 'bruno-the-concrete-psalm-salvatierra', 'bruno-concrete-psalm')
      or lower(name) in ('he zhen', 'the reverend of rats', 'reverend of rats')
      or lower(name) like '%bruno%salvatierra%'
      or lower(name) like '%bruno%concrete psalm%'
    )
    and pg_temp.ensure_jsonb_object(sheets) ? 'dnd5e'
    and not exists (
      select 1
      from jsonb_array_elements(pg_temp.ensure_jsonb_array(sheets #> '{dnd5e,actions}')) as action(value)
      where action.value ->> 'type' = 'dnd-roll'
        and action.value #>> '{metadata,combatKind}' = 'attack'
        and nullif(action.value #>> '{metadata,attackRoll}', '') is not null
        and nullif(action.value #>> '{metadata,damageRoll}', '') is not null
    )
  ) then
    raise exception 'Combat-ready character migration produced a D&D sheet without a combat-compatible attack.';
  end if;

  if exists (
    select 1
    from public.character_profiles profiles
    where (
      id in ('he-zhen', 'deploy-he-zhen', 'reverend-of-rats', 'deploy-reverend-of-rats', 'bruno-salvatierra', 'bruno-the-concrete-psalm-salvatierra', 'bruno-concrete-psalm')
      or lower(name) in ('he zhen', 'the reverend of rats', 'reverend of rats')
      or lower(name) like '%bruno%salvatierra%'
      or lower(name) like '%bruno%concrete psalm%'
    )
    and pg_temp.ensure_jsonb_object(sheets) ? 'nwod'
    and not exists (
      select 1
      from jsonb_array_elements(pg_temp.ensure_jsonb_array(sheets #> '{nwod,actions}')) as action(value)
      where action.value ->> 'type' = 'nwod-check'
        and action.value #>> '{metadata,combatKind}' = 'attack'
    )
  ) then
    raise exception 'Combat-ready character migration produced an NWoD sheet without a combat-compatible attack.';
  end if;
end $$;
