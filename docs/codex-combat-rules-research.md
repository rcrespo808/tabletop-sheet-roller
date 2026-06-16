# Codex Combat Rules Research

Date: 2026-06-13

## Scope

Add compact combat-reference Codex entries for:

- D&D 5e / 5.5e-compatible play, summarized from SRD material.
- NWoD / Chronicles-style play, written as original table-facing guidance because the core text is proprietary.

These entries are reference aids for Dicer, not replacements for the rulebooks.

## Sources

### D&D

- D&D Beyond SRD v5.2.1 page: https://www.dndbeyond.com/srd
- SRD 5.2 PDF: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf
- SRD 5.1 PDF: https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf

The D&D entries are original summaries of combat procedure and include SRD attribution in metadata/source labels.

Attribution text for SRD-derived entries:

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

### NWoD / Chronicles-style

- Paradox World of Darkness free content overview: https://www.paradoxinteractive.com/games/world-of-darkness/community/free-content
- Storytellers Vault Chronicles of Darkness cheat sheet product listing: https://www.storytellersvault.com/en/product/260891/cheat-sheet-for-chronicles-of-darkness-rules
- Onyx Path and White Wolf product/forum pages found during research confirmed that core Chronicles/NWoD combat rules are commercial/proprietary references, not open SRD text.

The NWoD entries are original guidance for table use. They avoid copying book language and frame combat as intent-driven, dice-pool-centered horror conflict suitable for this app.

## Content Decisions

- Use `type: "note"` for combat reference entries. They are not character powers or inventory.
- Use `visibility: "public"` so any signed-in Dicer user can read shared rules references, regardless of table membership.
- Keep entries concise enough for in-app scanning.
- Include structured metadata with source URLs, copyright notes, and seed keys.
- Use stable UUIDs so the Supabase upsert is idempotent.

## Entry Set

1. D&D Combat Flow
2. D&D Actions, Movement, and Reactions
3. D&D Attacks, Damage, and Dropping
4. NWoD Combat Flow
5. NWoD Attacks, Defense, and Damage
6. NWoD Combat Intent, Conditions, and Consequences
