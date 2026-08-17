# Product Requirements — Personal Productivity & Weekly Planning App

## Core loop

**Plan the year → define the month → define the week → choose today's priorities → execute → check things off → review what was achieved.**

The product exists to answer, at a glance:
1. What am I supposed to do today?
2. What am I trying to achieve this week?
3. Where am I going this month/year?
4. How am I actually doing?

Everything else (habits, expenses, PDF export, notifications, search) is in service of that loop, not a separate feature surface. See `ROADMAP.md` for what's built vs. planned.

## Source of the information architecture

`WEEKLY TRACKER.pdf` (a hand-drawn paper planner) is the structural reference:

- **Page 1 (daily):** date, objective, urgent/not-urgent × important/not-important grid, an hourly timetable from 6am–8pm, "Challenge for the day," "Top priorities."
- **Page 2 (weekly):** a date-range heading, Monday–Sunday columns, a large weekly-planning area, "Weekly Goals / Check List," "Habit Tracker," "Priority Goals."

The app translates this into: Year → Month → Week → Day → Task/TimeBlock, with goals flowing downward and progress rolling upward.

## Non-negotiable rules

- **Weekly priority goals: maximum 4.** Enforced server-side in `toggleWeeklyPriority` (`src/lib/actions/goals.ts`) inside a transaction — a UI-only limit is not a real limit.
- **Daily priorities: maximum 3.** Enforced server-side in `toggleDailyPriority` (`src/lib/actions/tasks.ts`), same reasoning.
- Progress is never invented: `Goal.progressMode` is explicitly `AUTO` (derived from linked tasks' completion ratio) or `MANUAL` (user-entered, including 0%). See `computeGoalProgress` in `src/lib/progress.ts`.

## Design philosophy

Calm, personal, paper-planner-inspired, not an enterprise PM tool. See `UI_SYSTEM.md` for the concrete visual language. In practice this means: generous whitespace, one accent color used sparingly (reserved for priority markers), no gradients, no decorative animation, and empty states that ask a question ("What's worth moving forward this week?") instead of showing a blank list.

## What's built (this pass)

Auth, dashboard, year/month/week goals with hierarchy, weekly planner with drag-and-drop (Inbox ⇄ 7 day columns, cross-tab reorder), daily planner (challenge, objective, top-3, other tasks), time-blocking timeline (create/delete, task-linked), Eisenhower matrix (view + per-task quadrant assignment), task↔goal linking, habit tracker (week-view dots + streaks + `/habits` management page), weekly checklist, weekly review with week-transition triage (move/reschedule/archive), expense tracking with weekly/monthly views and a category breakdown (`/expenses`), daily/weekly/monthly PDF export (A4, high-contrast, low-ink), settings (week-start day, theme, work hours, currency, notifications toggle — currency is now read by the expense views; work hours and notifications are still stored but not yet wired to features).

## What's deliberately out of scope (this pass)

In-app notifications, global search, Android app, natural-language quick-add, data export/import, account deletion, password reset delivery, expense editing (create/delete only), budgets/spending limits, a `@media print` stylesheet for the live on-screen views (PDF export is a separate, purpose-built rendering path instead). All of these have a home in the data model already (`prisma/schema.prisma`) so they're additive, not a redesign. See `ROADMAP.md` for phase ordering and rationale.

## Acceptance workflow — what was actually verified this pass

Verified in a real browser (headless Chromium, scripted, zero console errors) across several separate runs, each starting from a fresh signup — not as one continuous chain:

- **Drag-and-drop:** add a task to the weekly Inbox, drag it onto a day column by its drag handle, confirm it lands and persists.
- **Priority limits:** create 5 weekly goals, star 4 (each one shows in the "N/4" counter), attempt a 5th — server rejects it with a visible error, count stays at 4/4. Same pattern independently confirmed for the daily top-3 limit (4th task rejected with a visible error). One run during this pass showed a `5/4` DOM badge; this was tracked down to a DB-level check (5 clicks fired with zero delay between them, verdict read from Postgres, not the DOM), run 4 times — every run showed exactly 4 non-null `weeklyPriorityRank` rows server-side. The transaction-enforced limit was never breached; the stale `5/4` was a client display artifact (a late `useSyncedState` prop-resync landing after the optimistic-revert, see `ARCHITECTURE.md`), not a persistence bug.
- **Daily execution:** complete a task (checkbox, strikethrough, stays visible in the list rather than disappearing) → dashboard reflects it in both the Top-3 list and the quick-stats counts.
- **Goal hierarchy:** create a year goal, create a month goal, link it to the year goal via the parent selector, confirm the "from {year goal}" label appears.
- **Task↔goal linking and `AUTO` progress, end to end:** link 2 tasks to a weekly goal via `DayTaskRow`'s goal picker, complete 1 of them, open the weekly review page, confirm the goal shows exactly 50%.
- **Habit tracking on a non-current week:** navigate two weeks forward, create a habit, toggle a completion dot there; confirm the current week's dots for that habit are unaffected, and the future week's dot survives a reload.
- **Checklist persistence:** add a weekly checklist item, reload the page, confirm it's still there.
- **Week transition / archive invariant:** in the weekly review, record the Planned/Completed/Rate stats, archive one incomplete task, reload — the stats are byte-for-byte unchanged (archiving is a disposition, not an erasure that should retroactively improve the completion rate).
- **Expense tracking, both period views:** from the sidebar, land on the current month's `/expenses/[month]`, add three expenses across two categories, confirm the total and per-category breakdown percentages sum correctly, delete one and confirm the total updates, switch to `/expenses/week/[date]` via "View by week" and confirm the same expense is visible there (it falls in both the month and the week containing today). Confirmed the browser's native `min="0.01"` constraint blocks a zero/negative amount before the form ever submits — server-side `amount <= 0` rejection in `createExpense` is defense-in-depth for a bypassed form, not the primary guard, and wasn't reachable through the UI in this pass (expected, not a bug).
- **PDF export, all three routes:** seeded real data (challenge text, a task, a starred weekly goal, a year goal), hit `/day/[date]/export`, `/week/[date]/export`, and `/goals/export?year=&month=` directly and confirmed each returns HTTP 200, `Content-Type: application/pdf`, a `Content-Disposition: attachment` header, and a byte stream starting with the `%PDF` magic bytes — 3 clean back-to-back runs, including one starting from a cold dev-server restart. Confirmed a request to an export URL with no session cookie gets a 307 redirect to `/login`, not a PDF (Route Handlers don't inherit the `(app)` layout's auth check for free — see `ARCHITECTURE.md`).

Not exercised at all this session: Android parity (doesn't exist yet — `ROADMAP.md` Phase 6), cross-device sync (single-device only right now, by construction — there's one client and one Postgres instance), a production build's cold-start behavior for the export routes (only dev-mode was tested), and the full 21-step acceptance list in §51 of the original brief run as one unbroken sequence.
