# Gravity Switch Runner

Gravity Switch Runner is an original 2D side-scrolling auto-runner built around
one action: reversing gravity. This repository follows the project system design
and Task Board maintained in Notion.

## Repository layout

- `apps/web`: browser application shell (React and Phaser arrive in later tasks)
- `apps/api`: REST API shell (Fastify arrives in a later task)
- `packages/game-core`: framework-free deterministic gameplay rules
- `packages/shared-contracts`: shared schema-derived API and gameplay contracts
- `packages/level-format`: level manifest parsing and validation
- `packages/config`: shared repository configuration
- `packages/test-fixtures`: reusable levels, traces, and expected results
- `infra`: local infrastructure and database migrations
- `docs/adr`: architecture decision records

## Requirements

- Node.js 22 or newer
- pnpm 11.9.0

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

The current foundation task intentionally contains no gameplay, production
backend, or copyrighted assets from other games.
