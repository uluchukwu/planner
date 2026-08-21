# Architecture

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4.
- **Prisma 7** with the new `prisma-client` (TypeScript) generator — this generator requires a **driver adapter**; there is no implicit query engine binary. We use `@prisma/adapter-pg` + `pg` against PostgreSQL. See `src/lib/db.ts`.
- **PostgreSQL 16**, run locally via Docker for development (see below).
- **Auth:** hand-rolled, deliberately minimal — see "Auth" below. No NextAuth/Auth.js; a single-user personal app doesn't need its ceremony.
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Validation:** `zod`, used in the two real forms (signup/login). Everything else is typed function arguments passed directly to Server Actions (see "Data flow").
- **PDF export:** `@react-pdf/renderer`, rendered server-side only (see "PDF export" below) — never bundled into client JS.

## Why Next 16 specifics matter here

This project was scaffolded in August 2026 against Next 16, which has real breaking changes from the Next 14/15 mental model. Two matter throughout this codebase:

- **`middleware.ts` is now `proxy.ts`** (`src/proxy.ts`). Same file convention, same purpose (edge-ish request interception before rendering), renamed. It does an *optimistic* cookie-presence check only — see "Auth" for why it must not do more than that.
- **Server Actions behavior is unchanged in spirit:** an action invoked from a client event handler (not just a `<form action>`) still triggers the framework's RSC-refresh mechanism when the action calls `revalidatePath`/`revalidateTag`. Every mutating action in `src/lib/actions/*.ts` ends with `revalidatePath("/", "layout")` for exactly this reason — see "Data flow" for the client-state implication.

## Data flow: Server Components + Server Actions + optimistic client state

Pages are Server Components that fetch with Prisma directly (`src/app/(app)/**/page.tsx`) and pass plain serializable props (`src/lib/types.ts`) into Client Components. Client Components (`WeekBoard`, `DayView`, `WeeklyPriorityPanel`, `GoalList`, `TimeBlockTimeline`, `QuickTaskList`) hold local `useState` seeded from those props so drag-and-drop and checkbox toggles feel instant, then call a Server Action directly (not through a `<form>`) to persist.

Two things had to be true for this to actually work, and both were caught by browser-testing this session, not by typechecking:

1. **A prop's initial value only seeds `useState` once.** When `revalidatePath` causes the server to re-render with fresh data, the Client Component's *props* change but a plain `useState(initialX)` does **not** re-run. Without a fix, newly created items (a weekly goal, a task) silently never appeared until a manual reload. The fix is `src/lib/hooks/useSyncedState.ts` — React's documented "adjust state during render" pattern (not a `useEffect`, which `eslint-plugin-react-hooks`'s `set-state-in-effect` rule correctly flags as the wrong tool here). Every list-holding Client Component uses it.
2. **`setState` updater callbacks must stay pure.** `WeekBoard`'s drag-end handler originally called the persistence Server Action (`moveTask`) *inside* a `setState(prev => ...)` updater. React is allowed to invoke updater functions more than once (Strict Mode, concurrent rendering), which showed up as a real `"Cannot update a component (Router) while rendering a different component (WeekBoard)"` error in the dev console during a live drag test — not cosmetic, since it meant the mutation could double-fire. Fixed by computing the new state, then firing the Server Action call afterward, outside the updater.

Because of (1), none of the create-flows optimistically insert a client-generated placeholder row — a temp ID would need `Date.now()`/`crypto.randomUUID()` called during render, which `eslint-plugin-react-hooks`'s purity rule also flags, and it's unnecessary complexity once resync-on-revalidate works correctly. New rows appear as soon as the Server Action's revalidation lands (typically well under a second locally). Toggles that have an obvious two-state optimistic value (checkbox complete/incomplete, weekly/daily priority star, habit dot) *do* update local state immediately and revert only if the server rejects them (the priority-limit case) — see `DayView.handleToggleStar` / `WeeklyPriorityPanel.handleTogglePriority` / `HabitTracker.handleToggleDot`.

A subtler variant of (1) showed up as a one-off `5/4` DOM display during a back-to-back test run (never a real breach — see `PRD.md`'s Acceptance workflow for the DB-level verification): `WeeklyPriorityPanel.handleTogglePriority` sets local state optimistically, then reverts it if the server rejects. But `goals` is a `useSyncedState`, which resets local state whenever a new `initialGoals` prop reference arrives from a revalidation. If a *previous* star's revalidation response lands late — after the optimistic set but interleaved around the revert — that resync can race the revert. It's a display-only race, not a persistence one, because `toggleWeeklyPriority`'s server-side transaction is the actual source of truth and was verified to hold under rapid-fire concurrent clicks. Not fixed (cosmetic, narrow window, requires unusual response interleaving), but documented as a known display-race edge case — see `ROADMAP.md`.

A third issue surfaced during Phase 3 testing, unrelated to the above: `@dnd-kit`'s `DndContext` generates its accessibility-announcer element IDs (`aria-describedby="DndDescribedBy-N"`) from a module-level counter that increments per mount. That counter starts fresh on every server render but keeps climbing across client-side navigations within the same browser session, so after navigating through a few pages the server-rendered ID and the client's ID disagreed — a real (if low-severity) hydration mismatch caught by `console --errors` during a scripted browser pass, not by anything static. Fixed by passing a static `id="week-board"` prop to `DndContext` (`WeekBoard.tsx`), which `@dnd-kit` uses instead of the counter — deterministic across server and client regardless of navigation history.

A fourth issue, found while testing Phase 5's PDF export routes: `getOrCreateWeek`/`getOrCreateDay`/`getOrCreateWeeklyChecklist` (`src/lib/planner/`) lazily create their row via `db.X.upsert()` on first visit. A P2002 unique-constraint error surfaced from `day.upsert()` under dev-server load — the exact trigger wasn't pinned down (Postgres's `INSERT ... ON CONFLICT DO UPDATE` is atomic per-statement, so this shouldn't be reachable from ordinary concurrent requests; deliberate concurrent-request tests couldn't reproduce it on demand), only the symptom. All three lazy-creation helpers now go through `upsertOrFetch` (`src/lib/planner/upsertOrFetch.ts`): on a P2002 from the upsert, re-fetch instead of throwing. This is correct regardless of cause — a P2002 there means the row was created by whichever request won the race, so a re-fetch returns the right row either way. Verified with repeated clean runs across a cold dev-server restart, the condition under which it had previously reproduced.

## PDF export

`GET /day/[date]/export`, `GET /week/[date]/export`, and `GET /goals/export?year=&month=` are Route Handlers, not pages — each fetches the same shape of data its live-view counterpart does, then renders a `@react-pdf/renderer` `<Document>` server-side via `renderToBuffer` and streams it back as `application/pdf` with `Content-Disposition: attachment`. The PDF templates live in `src/lib/pdf/` and are never imported by client code, so `@react-pdf/renderer` doesn't reach the client bundle.

**Route Handlers sit outside the `(app)/layout.tsx` tree** — that layout's `getCurrentUser()` call only wraps `page.tsx` rendering, not co-located `route.ts` files. Each export route independently calls `getCurrentUser()` (which redirects to `/login` if unauthenticated, same as every page) and scopes every query by `userId`, exactly like every Server Action already does. This was verified, not assumed: an unauthenticated request to an export URL gets a 307 to `/login`, not a PDF.

Styling (`src/lib/pdf/theme.ts`) follows the roadmap's "A4, high-contrast, low-ink" instruction literally: black text and hairline strokes on white only, no filled color backgrounds — the live app's accent/priority colors don't survive a black-and-white printer, and filled boxes waste toner on something meant to be reprinted weekly. The weekly export uses `orientation="landscape"` (seven day-columns don't fit A4 portrait width); daily and monthly stay portrait.

## Mobile API surface

`src/app/api/mobile/*` are JSON Route Handlers for a separate Expo/React Native client (`C:\programming\PlannerMobile`, Phase 6) that can't reach Postgres directly and has no cookie jar shared with this server. They reuse the exact same `Session` table as web auth (`src/lib/auth/session.ts`'s `createSessionToken`/`getSessionUserIdForToken`/`deleteSessionForToken`) but hand the raw token back in the JSON response body instead of setting a cookie, and expect it back as `Authorization: Bearer <token>` on every subsequent request (`src/lib/auth/mobileAuth.ts`'s `requireMobileUser`). A mobile login and a web login are the same kind of row — just handed to the client differently, including at logout: `POST /api/mobile/logout` deletes that row directly by its bearer token (there's no cookie to read it from the way `deleteSession()` does for web), so a signed-out mobile token can't be replayed.

29 routes now exist under `src/app/api/mobile/` (auth + logout, today/day + task create, week aggregation, goals + priority/star toggles, habits + toggle, checklist items, expenses, dashboard, weekly review + task triage, settings) — see `PlannerMobile/README.md` for the full endpoint table. Still not a general API: each route returns exactly the shape its one mobile screen needs, not a resource-oriented REST surface. CORS is wide open (`Access-Control-Allow-Origin: *`) on all of them, which is safe specifically because auth here is a Bearer token the client must already possess rather than an ambient cookie — there's no session to ride cross-origin the way there would be with cookie-based auth.

`POST /api/mobile/settings` is the one mobile route that validates more strictly than its web counterpart: the web `SettingsForm` gets enum safety for free from `<select>` (the browser can't submit a `weekStartsOn` value that isn't one of the rendered `<option>`s), but a mobile client sends raw JSON, so the route re-validates `weekStartsOn`/`theme` against the `Weekday`/`ThemePreference` enums and range-checks the working-hours/currency fields explicitly before writing — `lib/actions/settings.ts`'s `updateSettings` trusts its caller in a way this route can't.

**The one place mobile and web share logic, not just a table:** `src/lib/core/weeklyPriority.ts` holds the non-negotiable "max 4 weekly priority goals" transaction. Both `lib/actions/goals.ts`'s `toggleWeeklyPriority` (web) and `app/api/mobile/goals/[id]/priority/route.ts` (mobile) call the same function rather than each re-implementing the limit check — duplicating a safety-critical transaction across two call sites is how it drifts out of sync, which matters more here than the extra indirection costs. Everything else mobile-facing (simple create/delete/toggle CRUD for tasks, habits, checklist items, expenses, weekly review, task triage) is written directly in each route handler, mirroring the corresponding Server Action's logic inline rather than extracting a shared helper — those aren't safety-critical, so the duplication is an accepted, deliberate tradeoff against the complexity of threading a shared core through both a cookie-based and a token-based auth path for every domain.

## Auth

Database-backed sessions, not JWTs: `Session.tokenHash` (SHA-256 of a random 32-byte token) in Postgres, the raw token in an `httpOnly`/`sameSite=lax` cookie (`src/lib/auth/session.ts`). Passwords are hashed with Node's built-in `scrypt` (`src/lib/auth/password.ts`) — no `bcrypt` native dependency to fight on Windows.

`src/lib/auth/dal.ts` is the single Data Access Layer: `verifySession()` (redirects to `/login` if invalid, `React.cache`-memoized per request) and `getCurrentUser()` are called at the top of every protected page and every Server Action. `proxy.ts` only checks cookie *presence* for a cheap "definitely logged out" redirect — it deliberately does **not** redirect an already-authenticated-looking cookie away from `/login`, because that direction created a real login↔today redirect loop the first time this was tested: a stale/expired cookie would get bounced by the DAL to `/login`, and an optimistic proxy check would immediately bounce it back to `/today`, forever. Login/signup pages do their own DB-verified `getOptionalUser()` redirect instead (see `src/app/login/page.tsx`).

Password reset is schema-ready (nothing currently) but not implemented — it needs an email-sending dependency this environment can't exercise. Documented as a gap, not silently half-built.

## AI import

`/import` turns a pasted freeform plan (a study schedule, project timeline, anything with dates and daily activities) into real Days/Tasks/Goals — no new storage system, it writes through the same tables every other page uses. `src/lib/actions/aiImport.ts` has two Server Actions, deliberately not one: `parsePlanWithAI` calls the Anthropic API (`claude-opus-5`, via `client.messages.stream` with `zodOutputFormat` against the schema in `src/lib/ai/plan.ts`, reading `parsed_output` off `finalMessage()`) and returns a preview — nothing is written to the database yet — and `commitParsedPlan` writes that (possibly user-reviewed) result once the user confirms in the UI. Splitting these into two actions is the actual safety mechanism: an LLM parsing an arbitrary plan can misdate things, invent a habit that was never asked for, or miss a scheduling conflict, so nothing lands in the database without a human looking at what's about to be created first — the preview lists tasks *and* habits for exactly this reason.

Streaming (not `client.messages.parse()`, which is non-streaming) is load-bearing, not a style choice: a large plan can legitimately take minutes to generate (confirmed directly — 83s for 29 days, 137s for 90), and the non-streaming form risks the SDK's own request timing out before a slow generation finishes. `max_tokens: 64000` matches streaming's higher ceiling, avoiding truncation on a plan large enough to approach the previous 16000-token cap. This fixes the SDK-level failure only — Render's own reverse-proxy timeout on the outer browser request is a separate, platform-level limit a Server Action can't extend from inside its own code; a plan large enough to take several minutes may still fail on the deployed site even though it now succeeds locally (see `ROADMAP.md` → Phase 7).

Requires `ANTHROPIC_API_KEY` in `.env` (unset in this repo — add your own key to use it; `parsePlanWithAI` fails gracefully with a message telling you to, rather than crashing, when it's missing).

The parsed output intentionally produces a flatter goal structure than a hand-written seed script could — one overarching goal per import, not a hierarchy of week-level sub-goals — because an LLM parsing content it didn't design is far more likely to get a flat structure right than to correctly infer week groupings; a user can always split it into sub-goals afterward through the existing Goals UI.

**The daily-priority cap gets a second call site here, so it's now genuinely shared, not just duplicated:** `src/lib/core/dailyPriority.ts` holds `toggleDailyPriorityCore` (extracted from `lib/actions/tasks.ts`'s `toggleDailyPriority`, same rationale as `weeklyPriority.ts` below) plus `nextOpenDailyPriorityRanks`, a bulk variant `commitParsedPlan` uses to assign as many of a day's AI-flagged "priority" tasks as still fit in that day's 3 slots — respecting whatever's already there — rather than overflowing past 3 or silently overwriting an existing task's rank.

## Local development environment

**The project must live on an NTFS volume.** Next.js 16's Turbopack (both `next dev` and `next build`) creates filesystem junctions/symlinks under `.next/` for its dependency trace, and this fails hard (`ERROR_INVALID_FUNCTION`, os error 1) on exFAT/FAT32. This repo was moved from `D:\programming\Planner` (exFAT) to `C:\programming\Planner` (NTFS) for exactly this reason, mid-session. `C:\programming\Planner` is the live copy going forward; `D:\programming\Planner` is now a superseded snapshot from just before that move — nothing has been committed anywhere, so removing it (or not) is entirely your call.

Postgres runs in Docker on **port 5434** (not 5432) because this machine already had an unrelated project's Postgres bound to 5432/5433:

```bash
docker run -d --name planner-pg -e POSTGRES_PASSWORD=plannerdev -e POSTGRES_USER=planner -e POSTGRES_DB=planner -p 5434:5432 postgres:16
```

`.env` → `DATABASE_URL="postgresql://planner:plannerdev@localhost:5434/planner?schema=public"`. `SESSION_SECRET` in `.env` is a placeholder — it's not currently read anywhere (sessions are DB-backed, not signed tokens), kept only in case a future JWT-based feature needs it; safe to regenerate or remove.

```bash
npm install
npx prisma generate       # regenerate the TS client into src/generated/prisma (gitignored)
npx prisma migrate dev    # apply prisma/migrations/
npm run dev               # http://localhost:3100 in this session; defaults to :3000
```

`npx tsc --noEmit`, `npx eslint .`, and `npx next build` are all green as of this commit. `npm run test:unit` (Vitest, `tests/unit/`) covers the hand-written pure math; `npm run test:e2e` (`@playwright/test`, `tests/e2e/`) covers auth, the core plan→execute→complete→dashboard loop, and both non-negotiable priority limits in a real browser against a real Postgres — see `tests/e2e/README.md` for the test-isolation strategy (unique email per test, no separate test database) and `ROADMAP.md` for what's covered vs. not. Features built before this checked-in suite existed (habits, checklists, weekly review, expenses, PDF export, the mobile API) were verified with ad hoc Playwright scripts run from outside the repo during their respective build sessions — real signal at the time, but not part of the repeatable suite; extending coverage to them is the natural next increment, not a rewrite.

## Directory map

```
src/
  app/
    login/, signup/           — public, redirect away if already authenticated
    (app)/                    — route group behind auth (layout calls getCurrentUser())
      dashboard/, today/, week/, week/[date]/, week/[date]/review/, day/[date]/, goals/, habits/, expenses/, settings/
      expenses/[month]/, expenses/week/[date]/  — same prev/next/jump-to-current pattern as week/[date]
      day/[date]/export/, week/[date]/export/, goals/export/  — route.ts PDF handlers, not pages (see "PDF export")
  components/
    ui/                       — Button, Field (Input/Textarea/Select/Label), Checkbox, ProgressRing/Bar, EmptyState
    nav/                      — Sidebar (desktop, 7 items), MobileNav (bottom nav, 5 items — see navItems.ts for the split)
    planner/                  — WeekBoard (dnd), DayView, TimeBlockTimeline, UrgentImportantMatrix, ChallengeField,
                                 Checklist, WeeklyReviewForm, WeeklyReviewTriage, ...
    habits/                   — HabitTracker (week-scoped widget), HabitManageList (/habits page)
    expenses/                 — ExpenseForm, ExpenseList, CategoryBreakdown
    goals/, dashboard/, auth/, settings/
  lib/
    actions/                  — "use server" mutations, one file per domain, all auth-checked + revalidating
                                 (tasks, goals, timeblocks, days, settings, auth, habits, checklists, weeklyReview, expenses)
    auth/                     — password.ts, session.ts, dal.ts, mobileAuth.ts (Bearer-token auth for /api/mobile/*)
    core/                      — business logic shared between a web Server Action and a mobile route handler,
                                 used only where duplication would be a correctness risk (see "Mobile API surface")
    validation/                — zod schemas that can't live in a "use server" file (which may only export async functions)
    date/week.ts              — all week/day-boundary math; the one place that knows about weekStartsOn
    planner/                  — getOrCreateWeek/Day/WeeklyChecklist (lazy creation, via upsertOrFetch), timeblocks.ts (pure time-math)
    pdf/                       — @react-pdf/renderer document templates, server-only, imported only by export route.ts handlers
    habits.ts                 — pure streak/completion-count math, no DB access (testable in isolation)
    expenses.ts                — pure category-breakdown math, no DB access, same shape as habits.ts
    format.ts                  — formatCurrency (Intl.NumberFormat, falls back gracefully on an invalid currency code)
    hooks/useSyncedState.ts   — see "Data flow" above
    db.ts, progress.ts, types.ts
  proxy.ts                    — optimistic auth redirect (see "Auth")
prisma/schema.prisma          — full data model, including tables for not-yet-built features
docs/                         — this file and its four siblings
```
