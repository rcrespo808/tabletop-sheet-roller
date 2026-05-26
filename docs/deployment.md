# Deployment

This repo uses GitHub Actions for CI checks and Supabase migrations. Vercel is expected to deploy the Next.js app through its GitHub integration.

Do not commit `.env.local`, Supabase access tokens, database passwords, service-role keys, or Vercel tokens.

## Vercel

Vercel should stay connected to GitHub and deploy automatically on pushes/PRs. No Vercel CLI deployment workflow is included, so there are no duplicate Vercel deployments.

Add these environment variables in Vercel Project Settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://toogirtxlnsbtvmqcqgw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

The publishable key is intended for browser use, but it is still environment-specific and should be managed in Vercel rather than hardcoded in source.

## GitHub Actions

Add these repository secrets in GitHub Settings > Secrets and variables > Actions:

```env
SUPABASE_ACCESS_TOKEN=<Supabase personal access token>
SUPABASE_DB_PASSWORD=<existing Supabase project database password>
SUPABASE_PROJECT_ID=toogirtxlnsbtvmqcqgw
```

`SUPABASE_PROJECT_ID` is the project ref from the Supabase URL.

Add this repository variable only after the secrets above are configured:

```env
SUPABASE_MIGRATIONS_ENABLED=true
```

Without that variable, pushes that touch `supabase/**` will create a skipped migration workflow instead of failing because secrets are not configured yet.

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
