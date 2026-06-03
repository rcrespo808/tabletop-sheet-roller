# Dicer

Dicer is a work-in-progress virtual tabletop and campaign operations tool for running character-driven tabletop RPG sessions in the browser.

The current build started as a character sheet roller and is growing toward a Roll20-style table: shared characters, tactical encounters, loot and reward automation, handouts, campaign lore, and eventually AI-assisted prep and session management.

This repository is public as a showcase of the engineering, product thinking, and tabletop systems work behind that direction. It is not production-ready yet.

## Current Focus

- Character gallery with player and GM character profiles
- Multi-system character sheets, currently covering D&D 5e and New World of Darkness style rolls
- Structured stats that drive prepared actions, quick rolls, and combat-ready actions
- Manual dice rolling for ad-hoc table moments
- Inventory, wallet, conditions, progression, and reward history panels
- Loot tables with weighted rewards and reward application flows
- Handouts and codex entries for campaign lore, clues, grants, and unlocks
- Combat workspaces for GM and player views
- Optional Supabase persistence with local browser fallback
- Next.js app deployment path through Vercel and GitHub Actions

## Planned Scope

Dicer is intended to become a full campaign workspace, not just a dice utility.

### Virtual Tabletop

- Multi-layer maps for terrain, tokens, lighting, fog, notes, and GM-only overlays
- Character and NPC token management
- Encounter setup, initiative, targeting, damage, conditions, and turn resolution
- Player-facing and GM-facing table views

### Campaign Management

- Campaign, table, party, and user-role management
- Character ownership and shared character libraries
- Session logs, prep notes, handouts, clues, and lore timelines
- Narrative state tracking for factions, quests, consequences, and unlocked knowledge

### Rewards and Inventory

- Rich inventory items with usable powers and system-specific actions
- Weighted loot tables, milestone rewards, currency grants, XP, notes, codex unlocks, and conditions
- Reward provenance so players and GMs can trace where each grant came from

### AI-Assisted Future

- AI-assisted encounter prep, NPC generation, handout drafting, and session recap
- Campaign memory over established lore, characters, and prior session events
- GM tools that suggest narrative consequences without taking control away from the table

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase for optional auth, database persistence, storage, and future realtime features
- Vercel and GitHub Actions for deployment and CI

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Supabase

The app can run with local browser storage when Supabase is not configured. To enable hosted persistence, copy `.env.example` to `.env.local` and provide the Supabase values for the project.

Database migrations live in `supabase/migrations`. Deployment notes are in `docs/deployment.md`.

## Project Status

This is an active WIP portfolio project. Some surfaces are intentionally rough, and parts of the roadmap are represented by schema, seed data, and early UI rather than a finished end-to-end experience.

The near-term direction is to keep tightening the character, combat, handout, codex, loot, inventory, and reward systems while building toward shared realtime table play and multi-layer map support.
