# Roadmap

Phases as specified in the original brief, annotated with actual status after this session.

## Phase 1 — Foundation ✅ done

- [x] Authentication (email/password, DB-backed sessions, logout)
- [x] Database (Postgres + Prisma 7, full schema including tables for later phases)
- [x] Dashboard (today / this week / this month / quick stats / today's timeline)
- [x] Year goals, monthly goals (with parent-child linking)
- [x] Weekly goals
- [x] Daily tasks, task completion
- [x] Navigation (desktop sidebar, mobile bottom nav)

## Phase 2 — Planner ✅ done

- [x] Weekly planner (Inbox + 7 day columns)
- [x] Drag-and-drop tasks (`@dnd-kit`, mouse + long-press touch activation)
- [x] Daily planner (challenge, objective, top-3, other tasks)
- [x] Top-3 daily priorities (server-enforced max)
- [x] 4 weekly priority goals (server-enforced max)
- [x] Time blocking (6am–8pm timeline; create/delete, optional task link)
- [x] Urgent/important matrix (view + per-task quadrant assignment)

**Known simplification:** time blocks are created via a form (title + start/end time), not pixel-drag-to-create or drag-to-resize. The brief asks for draggable/resizable blocks; this pass ships create/delete/task-linking, which is the functional core, and defers the drag-resize interaction — it's a meaningfully different (and riskier) `@dnd-kit` integration on top of the sortable-list one already shipped for the week board, and better done as its own focused pass than bolted on at the end of this one.

**Fixed in the Phase 3 pass:** a goal `<select>` now lives in `DayTaskRow`'s `<details>` menu (populated from that week's goals), so a task can actually be linked to a goal from the interface. `AUTO` goal progress was already verified correct against direct DB writes; it's now also verified end-to-end through the UI — link 2 tasks to a goal, complete 1, the weekly review page shows 50%.

## Phase 3 — Personal productivity ✅ done

- [x] Habit tracker — one-click daily completion dots on the Week page (aligned to whichever week is on screen, not hardcoded to "today"), current-streak calculation, dedicated `/habits` management page (monthly completion %, this-week count, archive/restore/delete)
- [x] Checklists — generic `Checklist`/`ChecklistItem` model wired up for the `WEEK` scope (one checklist per week, auto-created lazily like `Week`/`Day`), rendered on the Week page next to the habit tracker. `DAY`/`YEAR`/`MONTH`/`GOAL` scopes are schema-ready but not surfaced in any UI yet.
- [x] Weekly review screen (`/week/[date]/review`) — planned/completed/completion-rate stats, per-goal progress, average habit completion for the week, and the six reflection fields (went well / didn't go well / learned / change next week / proud of / carry forward)
- [x] Week transition flow (§42) — the review page's incomplete-task list offers exactly the three dispositions the brief asks for (move to next week's inbox / reschedule to a specific day next week / archive), nothing carries forward silently

**Modelling decision worth knowing:** the review's planned/completed stats are computed from an **unfiltered** task query (including archived tasks), deliberately different from every other view in the app, which filters `status: { not: "ARCHIVED" }`. This was a real bug caught during testing — without it, archiving an incomplete task during triage would retroactively shrink "planned" and inflate the completion rate, which §27 explicitly rules out. Verified: archiving a task during review leaves the Planned/Completed/Rate numbers unchanged.

**Two known limitations carried forward:**
- Streak calculation only understands consecutive calendar days — a habit with `frequency: WEEKLY` or `X_TIMES_PER_WEEK` still gets a daily-consecutive streak number, which isn't quite the right metric for those frequencies. The frequency field is stored and settable but doesn't yet change how completion or streaks are computed.
- No drag-reordering for checklist items (append-only, matches "don't overbuild" — reordering six checklist lines by hand isn't worth a second `@dnd-kit` integration).

## Phase 4 — Finance ✅ done

- [x] Expense tracking — add/delete, amount + date + category + payment method + optional description, `user.currency` now actually used (via `Intl.NumberFormat`, first feature to read that setting)
- [x] Weekly/monthly views (`/expenses/[month]` and `/expenses/week/[date]`, mirroring the `/week/[date]` prev/next/jump-to-current pattern) with a toggle between them
- [x] Category breakdown — per-category totals and % of period spend, rendered as `ProgressBar`s (reused from the goal-progress UI, not a new charting dependency — "simple charts" per the roadmap didn't warrant pulling in a chart library)

**Modelling note:** `Expense.amount` is a Prisma `Decimal`. Decimal instances aren't safe to pass across the Server→Client Component boundary, so every query converts with `Number(e.amount)` before building the `ExpenseLite` prop (see `lib/types.ts`). Filtering by month reuses the "dates are strings" decision from `DATABASE.md` — `date: { startsWith: "2026-08" }` needs no date-range math.

**Known limitations:**
- No edit — only create/delete. Editing a logged expense (fixing a typo'd amount, say) currently means deleting and re-adding. Small enough to defer; add if it turns out to matter in practice.
- `computeCategoryBreakdown`'s per-category percentages are rounded independently (`Math.round` per row), so they can sum to 99% or 101% rather than exactly 100 — e.g. a 3-way even split renders as 33/33/33. This is a per-bar label, not a stated total, so it's cosmetic, but noted here in the same spirit as the archive-invariant decision above (§27: progress must never mislead).
- The expense date field is constrained (`min`/`max`) to the period currently on screen, so a save can't silently vanish from the view a user is looking at — logging an expense for a different week/month requires switching to that period first.

**Not done (deliberately out of scope this pass, per the "don't build beyond what's asked" instruction):** no dashboard tile for spend-to-date, no `DAY`/`YEAR`-scoped views, no budget/limit-setting.

## Phase 5 — Printing ✅ done

- [x] Daily/Weekly/Monthly PDF export — `GET /day/[date]/export`, `GET /week/[date]/export`, `GET /goals/export?year=&month=`, each a Route Handler rendering a `@react-pdf/renderer` document server-side and streaming it back as `application/pdf` with a `Content-Disposition: attachment` header (one click, no browser print dialog involved)
- [x] Print-optimized layout (A4, high-contrast, low-ink) — black text and hairline strokes on white only, no filled color backgrounds (`lib/pdf/theme.ts`); daily and monthly export as A4 portrait, weekly exports landscape (7 day-columns need the width)

**Security note:** Route Handlers sit outside the `(app)/layout.tsx` tree — that layout's `getCurrentUser()` call only gates `page.tsx` rendering, not co-located `route.ts` files. Each export route independently calls `getCurrentUser()` and scopes every query by `userId`, the same pattern every Server Action already follows. Verified: an unauthenticated request to an export URL gets a 307 to `/login`, not a PDF.

**Bug found and fixed during this pass:** a P2002 unique-constraint error surfaced from `day.upsert()` under dev-server load (exact trigger not pinned down — root cause wasn't isolated, only the symptom, and it stopped reproducing once the export routes were past their first Turbopack compile). `getOrCreateWeek`/`getOrCreateDay`/`getOrCreateWeeklyChecklist` now retry via `upsertOrFetch` (`lib/planner/upsertOrFetch.ts`): on a P2002 from the upsert, re-fetch instead of throwing — correct regardless of cause, since a P2002 there means the row was created by whichever request won the race. Verified with 3 clean back-to-back runs post-fix, including a cold dev-server restart (the condition under which it previously reproduced).

**Not done:** no print stylesheet for the live on-screen views (a `@media print` treatment of `/day` or `/week` as rendered) — the PDF export is a separate, deliberately simpler rendering path built for this instead, per `ARCHITECTURE.md`'s original note under `UI_SYSTEM.md`.

## Phase 6 — Android — foundation only (auth + one screen)

- [x] React Native / Expo app scaffolded (`C:\programming\PlannerMobile`, separate repo, Expo SDK 57) — login screen + a Today screen (challenge, objective, tap-to-complete task list), talking to this app over a new `/api/mobile/*` JSON surface (see `ARCHITECTURE.md`)
- [ ] Domain-logic sharing with the web app — not done; the mobile app currently duplicates nothing but also shares nothing (see `PlannerMobile/README.md`'s "Code sharing" section for why, and the trigger condition for doing it)
- [ ] Offline-first local persistence + sync — not started, not attempted this pass
- [ ] Push notifications — not started

**Verification caveat, important:** this environment has no Android SDK, `adb`, Java, or physical device. Only the `expo start --web` target (react-native-web) was actually run and tested — 4 assertions via a scripted Playwright pass: wrong-password rejection shows the server's error text, correct login reaches the Today screen with seeded data, a task toggle persists across a hard reload (checked against the server's own response, not local state or CSS), zero unexpected console errors. Native SecureStore token storage, native navigation/gestures, and anything Android/iOS-specific are unverified — see `PlannerMobile/README.md`.

**Bug found in review, not shipped:** the mobile client's `ApiError` initially had no `status` field, so 401 handling matched on the literal string `"Unauthorized"` — a server-side copy change would have silently broken the expired-token-bounces-to-login flow. Fixed before shipping: `ApiError` now carries the HTTP status, checked as `=== 401`.

## Also deferred (cut from this pass, not phase-mapped in the original brief)

- **Notifications** (schema exists: `Notification`, `User.notificationsEnabled`) — no delivery mechanism (no push/email infra wired up).
- **Global search** across tasks/goals/habits/expenses/notes.
- **Quick-add with natural-language parsing** ("Study Cell Biology tomorrow at 9am") — the brief explicitly allows shipping structured quick-add first; even structured quick-add as a dedicated omnipresent affordance isn't built yet, though every planner surface has its own inline quick-add.
- **Data export/import** (JSON/CSV) and **account deletion**.
- **Password reset** — token generation is a natural extension of the existing session model, but delivering the email needs an SMTP/email-provider dependency this environment can't exercise, so it's explicitly not implemented rather than half-wired.
- **Keyboard-driven drag reordering** — the drag handle is a focusable `<button>`, but there's no keyboard-equivalent move-up/move-down yet.
- **Formal test suite — done for the highest-value slice, not full coverage.** `vitest.config.mts` + `tests/unit/` (37 tests: `lib/date/week.ts`, `lib/progress.ts`, `lib/habits.ts`, `lib/expenses.ts`, `lib/format.ts` — all the hand-written pure math, run with `npm run test:unit`) and `playwright.config.ts` + `tests/e2e/` (7 tests: signup/logout/protected-route redirect, the plan→execute→complete→dashboard core loop with task↔goal linking and AUTO progress, and both non-negotiable priority limits including a DB-level check that the weekly limit holds under rapid concurrent clicks — run with `npm run test:e2e`, or `npm test` for both). See `tests/e2e/README.md` for the no-test-database strategy (unique email per test against the real dev Postgres) and exactly what's *not* covered yet: habits, checklists, weekly review triage, expenses, PDF export, and the mobile API were each manually verified with ad hoc scripts during their respective builds but not converted into permanent specs this pass — that conversion is the natural next increment.
  - Integration-layer tests (Server Actions against Prisma directly, no browser) were deliberately not added as a separate layer — the E2E suite already exercises every action file through the real UI, and a second DB-isolation strategy for a narrower "integration" tier wasn't worth the added complexity for this pass.

## Environment note for whoever picks this up next

This project must live on an **NTFS** volume — Next 16's Turbopack cannot create the junctions it needs on exFAT/FAT32. See `ARCHITECTURE.md` → "Local development environment." If cloning fresh onto a new machine, just make sure the target drive is NTFS; there's nothing else project-specific about it.
