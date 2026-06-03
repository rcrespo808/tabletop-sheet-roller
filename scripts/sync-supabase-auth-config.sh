#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "Skipping Supabase auth URL sync (missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_ID)."
  exit 0
fi

DEFAULT_SITE_URL="https://tabletop-sheet-roller.vercel.app"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-$DEFAULT_SITE_URL}"
SITE_URL="${SITE_URL%/}"

if [ -z "${NEXT_PUBLIC_SITE_URL:-}" ]; then
  echo "NEXT_PUBLIC_SITE_URL not set; using default ${DEFAULT_SITE_URL}"
fi
CONFIRM_URL="${SITE_URL}/auth/confirm"

payload="$(jq -n \
  --arg site_url "$SITE_URL" \
  --arg confirm_url "$CONFIRM_URL" \
  '{
    site_url: $site_url,
    uri_allow_list: [
      $confirm_url,
      "http://localhost:3000/auth/confirm",
      "http://127.0.0.1:3000/auth/confirm",
      "https://127.0.0.1:3000/auth/confirm",
      "https://*-*.vercel.app/auth/confirm"
    ] | join(",")
  }')"

echo "Syncing Supabase auth config for project ${SUPABASE_PROJECT_ID}"
echo "  site_url=${SITE_URL}"

curl --fail-with-body --silent --show-error \
  -X PATCH "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  | jq '{site_url, uri_allow_list}'

echo "Supabase auth redirect configuration updated."
