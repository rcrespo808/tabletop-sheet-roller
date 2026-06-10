-- Local automation such as the Dicer content MCP uses the Supabase service key
-- through the Data API. Service keys bypass RLS, but this trigger still needs to
-- explicitly allow the service-role JWT before checking auth.uid()-based grants.
create or replace function public.prevent_non_gm_reward_state_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
    or current_setting('dicer.admin_write', true) = 'on'
  then
    return new;
  end if;

  if public.is_app_gm() then
    return new;
  end if;

  if exists (
    select 1
    from public.game_table_character_assignments assignments
    where assignments.character_id = new.id
      and assignments.user_id = auth.uid()
  ) then
    return new;
  end if;

  if new.inventory is distinct from old.inventory
    or new.wallet is distinct from old.wallet
    or new.reward_history is distinct from old.reward_history
    or new.progression is distinct from old.progression
    or new.conditions is distinct from old.conditions
  then
    raise exception 'Only GMs can modify character reward state.';
  end if;

  return new;
end;
$$;

select set_config('dicer.admin_write', 'on', true);

update public.character_profiles
set inventory = $json$
[
  {
    "id": "item-salvatierra-heirloom-longsword",
    "name": "Salvatierra Heirloom Longsword",
    "quantity": 1,
    "equipped": true,
    "rarity": "uncommon",
    "tags": ["weapon", "longsword", "heirloom", "magic"],
    "notes": "A balanced family longsword with old initials worked into the fuller. The blade carries a restrained warding magic that wakes when Bruno plants his feet and fights to protect someone.",
    "powers": [
      {
        "id": "power-heirloom-edge-dnd",
        "label": "Heirloom Edge (D&D)",
        "description": "Attack with the +1 longsword in D&D mode.",
        "action": {
          "id": "action-heirloom-edge-dnd",
          "type": "dnd-roll",
          "label": "Heirloom Edge",
          "roll": "1d20+7",
          "notes": "On hit, deal 1d8+4 slashing damage with one hand, or 1d10+4 slashing damage when used two-handed.",
          "source": "custom",
          "metadata": {
            "attackRoll": "1d20+7",
            "combatKind": "attack",
            "combatCategory": "fight",
            "damageRoll": "1d8+4",
            "alternateDamageRoll": "1d10+4",
            "damageType": "slashing",
            "weapon": "heirloom_longsword",
            "magic": true
          }
        }
      },
      {
        "id": "power-warding-steel-nwod",
        "label": "Warding Steel (NWoD)",
        "description": "The sword's warding magic sharpens Bruno's grounded cuts.",
        "action": {
          "id": "action-warding-steel-nwod",
          "type": "nwod-check",
          "label": "Warding Steel",
          "attribute": "strength",
          "skill": "athletics",
          "modifier": 1,
          "again": 9,
          "notes": "The heirloom edge catches a pale glimmer as Bruno cuts from a guarded stance.",
          "source": "custom",
          "metadata": {
            "combatKind": "attack",
            "combatCategory": "fight",
            "damage": 3,
            "weapon": "heirloom_longsword",
            "magic": true
          }
        }
      },
      {
        "id": "power-family-ward",
        "label": "Family Ward",
        "description": "Once per session, the sword flares to protect Bruno or someone within reach.",
        "action": {
          "id": "action-family-ward",
          "type": "note",
          "label": "Family Ward",
          "notes": "Once per session, describe the sword's warding flare to soften a supernatural pressure, guard an ally within reach, or justify a defensive edge by GM ruling.",
          "source": "custom",
          "metadata": {
            "combatKind": "utility",
            "combatCategory": "defend",
            "magic": true
          }
        },
        "charges": {
          "current": 1,
          "max": 1,
          "reset": "session"
        }
      }
    ],
    "metadata": {
      "generatedBy": "dicer-content-mcp",
      "contentPackId": "manual-bruno-longsword-fighter",
      "runId": "manual-bruno-longsword-fighter-2026-06-08",
      "theme": "bruno-longsword-heirloom",
      "source": "migration"
    }
  }
]
$json$::jsonb
where id = 'bruno-concrete-psalm';

select set_config('dicer.admin_write', 'off', true);
