# Deployment

This repo uses GitHub Actions for CI checks, Supabase migrations, and production Vercel deploys.

Do not commit `.env.local`, Supabase access tokens, database passwords, service-role keys, or Vercel tokens.

## Vercel

Production deploys are built by `.github/workflows/deploy.yml` with the Vercel CLI. The production build env comes from GitHub Actions secrets, not from committed files.

Required GitHub Actions secrets for app deployment:

```env
VERCEL_TOKEN=<Vercel token>
VERCEL_ORG_ID=<Vercel team/user id>
VERCEL_PROJECT_ID=<Vercel project id>
NEXT_PUBLIC_SUPABASE_URL=https://toogirtxlnsbtvmqcqgw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
NEXT_PUBLIC_SITE_URL=https://tabletop-sheet-roller.vercel.app
```

`NEXT_PUBLIC_SITE_URL` must be your canonical production origin (no trailing slash). The app sends email verification redirects to `{NEXT_PUBLIC_SITE_URL}/auth/confirm`.

Vercel Project Settings are optional for dashboard-triggered rebuilds or preview deployments. The GitHub Actions production path passes the `NEXT_PUBLIC_*` secrets into `vercel build` on the runner and deploys the prebuilt output.

## Email verification and auth redirects

Sign-up email verification redirects to `/auth/confirm`, which exchanges the Supabase token and then sends the user back to the gallery.

On deploy, `.github/workflows/deploy.yml` runs `scripts/sync-supabase-auth-config.sh` when these GitHub Actions secrets are set:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SITE_URL`

That script patches the hosted Supabase project auth config so `site_url` matches production and the redirect allow list includes:

- `{NEXT_PUBLIC_SITE_URL}/auth/confirm`
- Local dev URLs (`localhost`, `127.0.0.1`)
- `https://*-*.vercel.app/auth/confirm` for preview deployments

Keep `NEXT_PUBLIC_SITE_URL` in GitHub Actions secrets aligned with the Supabase auth config so client redirects and the Supabase dashboard stay aligned.

For local-only testing without CI, you can still verify accounts at `http://localhost:3000/auth/confirm` after adding that URL under Supabase **Authentication -> URL Configuration -> Redirect URLs**.

## GitHub Actions

Add these repository secrets in GitHub Settings > Secrets and variables > Actions:

```env
SUPABASE_ACCESS_TOKEN=<Supabase personal access token>
SUPABASE_DB_PASSWORD=<existing Supabase project database password>
SUPABASE_PROJECT_ID=toogirtxlnsbtvmqcqgw
```

`SUPABASE_PROJECT_ID` is the project ref from the Supabase URL.

Add this repository variable only if you want to disable automatic migrations:

```env
SUPABASE_MIGRATIONS_ENABLED=false
```

By default, pushes that touch `supabase/**` run the migration workflow when the Supabase secrets above are configured. Pushes to `main` also run the unified deploy workflow, which attempts migrations before app deployment.

## Workflows

- `CI`: runs `npm ci`, lint, typecheck, and build on pull requests and pushes to `main`.
- `Supabase Migrations`: links to the existing Supabase project, shows pending migrations with `supabase db push --dry-run`, and applies them with `supabase db push`.

The migration workflow can also be run manually. Use `dry_run=true` to inspect pending migrations without applying them. Use `dry_run=false` to apply migrations manually.

## Supabase Migrations

Create migration files in:

```txt
supabase/migrations/
```

Use the Supabase CLI locally:

```bash
npx supabase migration new create_example_table
```

Then edit the generated SQL file and commit it. The workflow does not create a Supabase project; it only links to the existing project and pushes committed migrations.


## Unified Deploy Workflow

A combined workflow is available at `.github/workflows/deploy.yml`:

- On `push` to `main`, it attempts Supabase migrations and app deployment.
- On `workflow_dispatch`, you can run migrations only, app deployment only, or both.
- If required secrets are missing, it logs explicit warnings and skips that section instead of failing silently.

Required repository **secrets** for migration:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

Required repository **secrets** for app deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

When deploying through GitHub Actions, the workflow passes the `NEXT_PUBLIC_*` secrets into `vercel build` on the runner. Because the workflow deploys a prebuilt Next.js output, the current app does not need Supabase runtime secrets configured in Vercel for production.

If future server routes or background jobs need server-only runtime variables, add those to the Vercel project or sync them from GitHub Actions before deploying.
