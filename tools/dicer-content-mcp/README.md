# Dicer Content MCP

Project-specific stdio MCP server for generating, validating, previewing, and applying themed JSON/JSONB content to the configured Dicer Supabase cloud project.

## Run

```powershell
npm run content:mcp --silent
```

Codex user-level registration:

- server name: `dicer-content`
- command: `npm`
- args: `["run", "content:mcp", "--silent"]`
- cwd: `C:\dev\dicer`

This repo also includes a project-scoped Codex registration in `.codex/config.toml`.
That file is intended for Codex App/CLI/IDE, SSH remote projects, and remote
executor environments. It contains no secrets and forwards env vars from the
active environment.

## Environment

Required for cloud reads/writes:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_PROJECT_ID=toogirtxlnsbtvmqcqgw
SUPABASE_SECRET_KEY=
# or
SUPABASE_SERVICE_ROLE_KEY=
```

Optional for full direct Postgres SQL:

```text
SUPABASE_DB_URL=
# or
DATABASE_URL=
```

Required for generation:

```text
OPENAI_API_KEY=
DICER_CONTENT_MODEL=gpt-5.5
```

Optional run log override:

```text
DICER_CONTENT_RUN_DIR=
```

By default, local run logs are written below `.tools/dicer-content-mcp/runs/`, which is ignored by git.

## Codex Usage

For local Codex on this Windows checkout, the user-level `~/.codex/config.toml`
entry can pin `cwd = 'C:\dev\dicer'`. For project-scoped or remote Codex usage,
prefer `.codex/config.toml`; it omits a machine-specific working directory and
uses `experimental_environment = "remote"` so stdio startup can run through a
remote executor when Codex provides one.

Codex cloud environment variables behave differently from secrets. Current
Codex cloud docs say environment variables are available during setup and the
agent phase, while secrets are removed before the agent phase. This MCP needs
`OPENAI_API_KEY` for generation and a Supabase service key for live cloud
reads/writes, so those values must be configured as agent-phase environment
variables if you want the MCP to use them during a cloud task. Keep the service
key out of cloud environments unless cloud-side writes are explicitly intended.

For safer cloud work, omit `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`.
The MCP can still validate local shapes and generate packs, but live previews
and applies will remain unavailable until a service key is present in the active
environment.

## Remote Checklist

For Codex App remote control of this Windows host:

- Keep this host online, awake, and signed in to Codex.
- Keep the user-level `dicer-content` MCP entry enabled.
- Keep `.env.local` or host environment variables configured for MCP credentials.

For Codex Remote SSH or a managed remote development host:

- Clone this repo on the remote host.
- Run `npm ci` on the remote host.
- Install/authenticate Codex on that host.
- Configure the required MCP env vars in the remote shell or Codex environment.
- Trust the project so `.codex/config.toml` is loaded.

For Codex Cloud:

- Push this repo, including `.codex/config.toml`, to GitHub.
- Configure a Codex cloud environment for the repo.
- Use environment variables, not setup-only secrets, for values the MCP needs
  during the agent phase.
- Enable agent internet access only if the task needs outbound API calls during
  generation or live Supabase reads/writes.

## Tools

- `audit_schema`: read-only local target audit plus live row counts/samples when service credentials are configured.
- `list_content_context`: read game tables, characters, codex entries, loot tables, handouts, markets, combat summaries, transactions, and roll logs for prompt grounding.
- `read_table`: read any public Supabase Data API table through service credentials.
- `write_table_rows`: insert/upsert/update/delete any public Supabase Data API table through service credentials.
- `update_character_profile`: preferred one-call character updater. It reads the current row, applies scalar updates plus JSON replacements/patches, computes diffs/hashes internally, and writes without caller-provided `expectedHash`.
- `execute_sql`: full direct Postgres SQL when `SUPABASE_DB_URL` or `DATABASE_URL` is configured. Use `readOnly: true` for inspection. Mutations require `confirmProjectRef`; `adminWrite: true` sets `dicer.admin_write` for reward-state trigger bypasses.
- `generate_content_pack`: call OpenAI Responses API Structured Outputs and validate the returned `ContentPack`.
- `preview_content_pack`: validate rows, references, duplicates, expected hashes, and exact write diffs without writing.
- `apply_content_pack`: apply only after preview passes and `confirmProjectRef` exactly matches `SUPABASE_PROJECT_ID`.
- `patch_json_rows`: apply JSON Patch to allowlisted JSON/JSONB columns. Stateful tables require `expectedHash`.

## Preferred Codex Workflow

For character edits like "make Bruno a sword fighter" or "change Reverend's attack":

1. Call `update_character_profile` directly.
2. Include `confirmProjectRef: "toogirtxlnsbtvmqcqgw"`.
3. Put visible text in `scalars` and complete JSON replacements or JSON Patch operations in `json`/`patches`.
4. Use `dryRun: true` only when the user explicitly asks for preview-only work.

For table rows that do not need character-specific merging, use `read_table` then `write_table_rows`.

For generated packs or broad content creation, use `generate_content_pack`, `preview_content_pack`, then `apply_content_pack`.

Writes use service-role credentials and bypass RLS. Direct SQL uses `SUPABASE_DB_URL` and can bypass ordinary app permission paths; use it only for admin maintenance, migrations, or cases where Data API tools are insufficient.
