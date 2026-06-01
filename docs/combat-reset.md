# Combat Encounter Reset

Combat encounter persistence is pre-stable while the turn-based resolver is being built.
Old saved encounter JSON can be discarded; compatibility with previous combat encounter
shapes is not required.

## Browser localStorage

Current key:

```txt
tsr.combatEncounters.v2
```

Previous key intentionally ignored:

```txt
tsr.combatEncounters.v1
```

The `/combat` page includes a danger-section button to clear browser-local saved
encounters for the current storage key. This only affects combat encounters.

## Supabase

Combat encounters are stored in:

```sql
public.combat_encounters
```

Use this dev reset when you want to discard remote saved combat encounters without
touching characters, game tables, roll logs, loot, handouts, codex entries, or inventory:

```sql
delete from public.combat_encounters;
```

For a local-only development database where a full table reset is acceptable:

```sql
truncate table public.combat_encounters restart identity cascade;
```

Do not run either statement against production data unless the combat reset has been
explicitly approved.
