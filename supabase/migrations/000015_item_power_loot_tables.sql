-- Add rollable item powers to the seeded starter loot tables.

with updated_entries as (
  select
    jsonb_agg(
      case entry.value ->> 'id'
        when 'entry-mire-14' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-marsh-lung-focus",
              "label": "Marsh-Lung Focus",
              "description": "Steady breath against fumes, drowning, or swamp gases.",
              "action": {
                "id": "action-marsh-lung-focus",
                "type": "dnd-check",
                "label": "Marsh-Lung Focus",
                "ability": "con",
                "save": true,
                "modifier": 2,
                "notes": "Use the ring to steady breath against fumes, drowning, or swamp gases."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-mire-15' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-fire-phasebolt",
              "label": "Fire Phasebolt",
              "description": "Fire a spectral bolt that ignores half cover.",
              "charges": { "current": 3, "max": 3, "reset": "never" },
              "consumesItem": false,
              "action": {
                "id": "action-fire-phasebolt",
                "type": "dnd-roll",
                "label": "Fire Phasebolt",
                "roll": "1d20+8",
                "notes": "Ignores half cover; on hit, roll normal weapon damage plus GM-approved phase effect."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-mire-16' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-regret-cut",
              "label": "Regret Cut",
              "description": "Strike with the scimitar's memory-biting edge.",
              "charges": { "current": 1, "max": 1, "reset": "long_rest" },
              "action": {
                "id": "action-regret-cut",
                "type": "dnd-roll",
                "label": "Regret Cut",
                "roll": "1d20+7",
                "notes": "On hit, target makes WIS save against your item DC or loses reactions until next turn."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-mire-17' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-mirelords-tremor",
              "label": "Mirelord's Tremor",
              "description": "Sense movement through mud, water, and roots for one scene.",
              "charges": { "current": 1, "max": 1, "reset": "long_rest" },
              "action": {
                "id": "action-mirelords-tremor",
                "type": "note",
                "label": "Mirelord's Tremor",
                "notes": "Once per long rest, gain tremorsense-like awareness through mud, water, and roots for one scene."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-mire-18' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-nightmare-inquiry",
              "label": "Nightmare Inquiry",
              "description": "Ask one question and receive a symbolic dream answer.",
              "charges": { "current": 1, "max": 1, "reset": "long_rest" },
              "action": {
                "id": "action-nightmare-inquiry",
                "type": "note",
                "label": "Nightmare Inquiry",
                "notes": "Ask one question during a long rest. Receive a symbolic dream answer. The book claims one memory."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-mire-19' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-grasping-grave",
              "label": "Grasping Grave",
              "description": "Raise marsh-hands as difficult terrain.",
              "charges": { "current": 1, "max": 1, "reset": "long_rest" },
              "action": {
                "id": "action-grasping-grave",
                "type": "note",
                "label": "Grasping Grave",
                "notes": "Once per long rest, create a 15-foot area of grasping marsh-hands as difficult terrain."
              }
            }
          ]$json$::jsonb,
          true
        )
        else entry.value
      end
      order by entry.ordinality
    ) as entries
  from public.loot_tables
  cross join lateral jsonb_array_elements(entries) with ordinality as entry(value, ordinality)
  where id = '00000000-0000-4000-8000-000000000101'
)
update public.loot_tables
set
  entries = updated_entries.entries,
  updated_at = now()
from updated_entries
where id = '00000000-0000-4000-8000-000000000101';

with updated_entries as (
  select
    jsonb_agg(
      case entry.value ->> 'id'
        when 'entry-rat-14' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-vermin-benediction",
              "label": "Vermin Benediction",
              "description": "Command, interpret, or bargain with rats or vermin spirits.",
              "action": {
                "id": "action-vermin-benediction",
                "type": "nwod-check",
                "label": "Vermin Benediction",
                "attribute": "manipulation",
                "skill": "animalKen",
                "modifier": 2,
                "rote": false,
                "again": 10,
                "notes": "Use the icon to command, interpret, or bargain with rats or vermin spirits."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-rat-15' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-swarm-mind-focus",
              "label": "Swarm-Mind Focus",
              "description": "Organize many simultaneous rat-scout impressions.",
              "charges": { "current": 1, "max": 1, "reset": "session" },
              "action": {
                "id": "action-swarm-mind-focus",
                "type": "nwod-check",
                "label": "Swarm-Mind Focus",
                "attribute": "wits",
                "skill": "investigation",
                "modifier": 1,
                "rote": true,
                "again": 10,
                "notes": "Use the rosary to organize many simultaneous rat-scout impressions."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-rat-17' then jsonb_set(
          entry.value,
          '{reward,item,powers}',
          $json$[
            {
              "id": "power-invoke-many-teeth",
              "label": "Invoke Many Teeth",
              "description": "Read the tooth-signs for hidden vermin-borne clues.",
              "charges": { "current": 1, "max": 1, "reset": "session" },
              "action": {
                "id": "action-invoke-many-teeth",
                "type": "nwod-check",
                "label": "Invoke Many Teeth",
                "attribute": "wits",
                "skill": "occult",
                "modifier": 2,
                "rote": true,
                "again": 9,
                "notes": "Use the reliquary to pull a clue through vermin omens."
              }
            }
          ]$json$::jsonb,
          true
        )
        when 'entry-rat-20' then jsonb_set(
          entry.value,
          '{reward,condition,metadata}',
          $json${
            "actionSuggestions": [
              "Dexterity + Stealth + 2 in tunnels, filth, or ruins",
              "Wits + Streetwise + 2 to follow vermin rumor trails"
            ]
          }$json$::jsonb,
          true
        )
        else entry.value
      end
      order by entry.ordinality
    ) as entries
  from public.loot_tables
  cross join lateral jsonb_array_elements(entries) with ordinality as entry(value, ordinality)
  where id = '00000000-0000-4000-8000-000000000102'
)
update public.loot_tables
set
  entries = updated_entries.entries,
  updated_at = now()
from updated_entries
where id = '00000000-0000-4000-8000-000000000102';
