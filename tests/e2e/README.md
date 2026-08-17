# E2E tests

Real browser tests (Chromium via `@playwright/test`) against a running dev server, exercising Server Actions and Prisma end to end — not mocked.

## Strategy

- **No test database.** Every test signs up a fresh user with a timestamp-unique email (`test-${Date.now()}-${suffix}@example.com`) against the same dev Postgres the app normally uses. Each user's data is fully isolated by `userId` on every query (see `docs/DATABASE.md`), so tests never collide with each other or with data you create by hand while developing — but they do leave rows behind. This is a personal single-user app's dev database, not a shared CI environment; periodic manual cleanup (or a fresh `docker compose down -v` on the Postgres container) is the expected way to reset it, not a per-test transaction rollback.
- **`fullyParallel: false`, `workers: 1`** in `playwright.config.ts`. Not a hard technical requirement (unique-email isolation would tolerate parallelism), but the priority-limit tests intentionally fire rapid-fire concurrent requests *within* a test to probe a real race condition (see `priority-limits.spec.ts` and `docs/ROADMAP.md`'s "known display-race edge case" note) — running test *files* concurrently on top of that makes failures harder to attribute. Revisit if the suite grows slow enough to matter.
- **`webServer.reuseExistingServer: true`** — if a dev server is already running on :3100 (the normal case while actively developing), Playwright uses it rather than starting a second one. If none is running, it starts `npm run dev` itself and waits for `/login` to respond.
- **`tests/e2e/db.ts`** provides a raw `pg` client for the handful of assertions that need to read the database directly rather than trust the UI — specifically the priority-limit race check, where the whole point is verifying the *server's* enforcement, not what the DOM claims happened.

## Running

```bash
npm run test:e2e
```

Requires the Postgres container from `docs/ARCHITECTURE.md` to be running. `DATABASE_URL` is read from `.env` via `dotenv/config` in `playwright.config.ts`.

## What's covered vs. not

Covered: signup/logout/protected-route redirect, the core plan→execute→review loop (weekly goal → task → drag to a day → complete → dashboard reflects it), and the two non-negotiable priority limits (max 4 weekly, max 3 daily) including a DB-level check that the limit holds under rapid concurrent clicks.

Not covered by this initial pass: habits, checklists, weekly review triage, expenses, PDF export, or the mobile API — these were each manually verified with ad hoc Playwright scripts during their respective build sessions (see `docs/ROADMAP.md`'s phase-by-phase notes for what was checked), but converting every one of those into a permanent spec was out of scope for this pass. Extending coverage to them is the natural next increment, not a rewrite of this setup.
