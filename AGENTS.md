# Dicer Codex Notes

## Supabase Content MCP

Use the project MCP server `dicer-content` for live Dicer Supabase content work.

Preferred tools:

- Character edits: call `update_character_profile` first. It fetches the current row, applies scalar changes and JSON replacements/patches, computes JSON diffs internally, and writes in one call.
- Table reads: use `read_table`.
- Table writes: use `write_table_rows`.
- Raw SQL: use `execute_sql` only when `SUPABASE_DB_URL` or `DATABASE_URL` is configured and Data API tools are insufficient.
- Generated content packs: use `generate_content_pack`, then `preview_content_pack`, then `apply_content_pack`.

Always include `confirmProjectRef: "toogirtxlnsbtvmqcqgw"` for writes.

Do not use browser GM credentials for MCP writes. The MCP is an admin automation path and should use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; direct SQL additionally needs `SUPABASE_DB_URL` or `DATABASE_URL`.

If a character update touches `inventory`, `wallet`, `reward_history`, `progression`, or `conditions`, make sure migration `20260608173950_allow_service_role_character_reward_state.sql` has been applied. It allows service-role MCP writes through the reward-state trigger while preserving browser-side GM/assignment checks.

For visibility issues, check both layers:

- Cloud row state with `read_table`.
- Frontend fallback/cache behavior in `src/lib/storage/characterRepository.ts`.
