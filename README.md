# Planner

A personal productivity & weekly planning app, inspired by a paper planner: goal setting (year → month → week), weekly/daily planning with drag-and-drop, time-blocking, habit tracking, checklists, expense tracking, a weekly review flow, PDF export, and AI import (paste a freeform plan, review what it parses into, then commit it as real days/tasks/goals — see `docs/ARCHITECTURE.md` → "AI import"; requires your own `ANTHROPIC_API_KEY`).

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

## Deployment (Render)

`render.yaml` is a Render Blueprint — from the Render dashboard, **New → Blueprint**, point it at this repo, and it provisions a free Postgres database plus a web service together, wired to each other automatically (`DATABASE_URL` is injected from the database, `SESSION_SECRET` is generated). The build runs `prisma generate` before `next build` (the generated client at `src/generated/prisma` is gitignored, so this has to happen on every deploy, not just once), and the start command runs `prisma migrate deploy` before `next start` so schema migrations apply automatically on each deploy.

Render's free Postgres plan expires after 30 days — fine for trying this out, but upgrade the database plan before relying on it long-term, since a free-tier expiry deletes the data.

Once deployed, the service's URL (`https://<name>.onrender.com`, where `<name>` is whatever you set for the web service — collides get a random suffix appended) is what the mobile app should point at instead of `localhost:3100` — see `PlannerMobile/src/api.ts`'s `API_BASE_URL`.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product scope, non-negotiable rules, what's built vs. deliberately out of scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, data flow, auth, known issues and their fixes
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema modelling decisions
- [`docs/UI_SYSTEM.md`](docs/UI_SYSTEM.md) — design tokens and component inventory
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phase-by-phase status and known limitations

A companion mobile client (Expo/React Native — all eight planner screens, full parity with the web app, plus a read-only offline cache) lives in a sibling `PlannerMobile` repo and talks to this app over `/api/mobile/*` — see `ARCHITECTURE.md`'s "Mobile API surface" section.
