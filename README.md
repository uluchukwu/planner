# Planner

A personal productivity & weekly planning app, inspired by a paper planner: goal setting (year → month → week), weekly/daily planning with drag-and-drop, time-blocking, habit tracking, checklists, expense tracking, a weekly review flow, and PDF export.

Built with Next.js 16 (App Router), Prisma 7, PostgreSQL, and TypeScript.

## Getting started

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev          # http://localhost:3100
```

Requires a running PostgreSQL instance — see `docs/ARCHITECTURE.md` for the exact local setup (Docker command, port, `.env` shape).

## Testing

```bash
npm run test:unit    # Vitest — pure logic (date math, progress, streaks, etc.)
npm run test:e2e     # Playwright — real browser against a real dev database
npm test              # both
```

See `tests/e2e/README.md` for the test-isolation strategy and current coverage.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product scope, non-negotiable rules, what's built vs. deliberately out of scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, data flow, auth, known issues and their fixes
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema modelling decisions
- [`docs/UI_SYSTEM.md`](docs/UI_SYSTEM.md) — design tokens and component inventory
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phase-by-phase status and known limitations

A companion mobile client (Expo/React Native, auth + a Today screen so far) lives in a sibling `PlannerMobile` repo and talks to this app over `/api/mobile/*` — see `ARCHITECTURE.md`'s "Mobile API surface" section.
