# Database

Full source of truth: `prisma/schema.prisma`. This doc explains the modelling decisions that aren't obvious from reading the schema cold, plus how the pieces relate.

## Five decisions that shaped everything else

1. **Days and weeks are keyed by `YYYY-MM-DD` / `YYYY-MM` strings, never `DateTime`.** `Day.date`, `Week.startDate`/`endDate`, `Task.dueTime` (`"HH:MM"`), `Goal.targetDate`, `Goal.monthKey`, `HabitCompletion.date`, `Expense.date` are all plain strings. A `DateTime` day-boundary is the single most common source of off-by-one bugs in planner apps once timezones or DST are involved — a string sidesteps the whole class of bug by construction. All date math lives in one module, `src/lib/date/week.ts`.
2. **Week identity is derived, never a hardcoded Monday.** `User.weekStartsOn` is a per-user setting (`Weekday` enum); every week-boundary calculation (`getWeekStart`, `getWeekEnd`, `getWeekDays`) takes it as a parameter. There is exactly one place in the codebase allowed to know how a week's boundaries are computed.
3. **`Task.dayId` is nullable; `Task.weekId` is separate and required for week-scoped tasks.** A task with `dayId = null` and `weekId` set is sitting in that week's Inbox — this is what makes the Inbox representable at all rather than a UI-only concept. `Task.sortOrder` gives manual ordering within whichever column (Inbox or a specific day) it's in.
4. **`Goal.progressMode` is explicit (`AUTO` | `MANUAL`), not inferred.** If you infer "manual" from "a value is present," a manually-set 0% is indistinguishable from "nobody's touched this yet." `AUTO` derives progress from linked tasks' completion ratio (`computeGoalProgress` in `src/lib/progress.ts`); `MANUAL` always trusts `Goal.manualProgress`, including when it's 0.
5. **`TimeBlock.taskId` is nullable, and a task can have multiple blocks.** A time block doesn't require a linked task (you can block out "Lunch" with nothing to check off), and real days split one task across two sessions — the schema doesn't force a 1:1 relationship that doesn't hold in practice.

## Entity overview

```
User 1──* Session
User 1──* Goal (self-referential parent/child: Year → Month → Week)
User 1──* Week 1──* Day
User 1──* Task ──* (optional) Week, Day, Goal, parentTask (subtasks)
User 1──* TimeBlock ──1 Day, ──0/1 Task
User 1──* Habit 1──* HabitCompletion
User 1──* Checklist 1──* ChecklistItem
User 1──* Expense
User 1──* Note
User 1──* WeeklyReview ──1 Week
User 1──* Notification
```

Every top-level row carries `userId` directly (not just reachable via a join) — this is what makes every mutation's ownership check a single `findFirst({ where: { id, userId } })` rather than a multi-hop query, and it's the whole authorization model for a personal-use app (see "Security" below). **`HabitCompletion` is the one exception** — it has no `userId` column, only `habitId`. Every action that reads or writes a completion (`toggleHabitCompletion` in `src/lib/actions/habits.ts`) verifies ownership through the parent `Habit` first (`db.habit.findFirst({ where: { id: habitId, userId } })`) rather than querying `HabitCompletion` directly with a `userId` filter, since one doesn't exist there.

## Goal hierarchy

`Goal.level` is `YEAR | MONTH | WEEK`. `Goal.parentId` self-references for Year→Month→Week chains (`Goal.parent` / `Goal.children`). A `WEEK`-level goal additionally has `weekId` (which week it belongs to) and `weeklyPriorityRank` (1–4, non-null only when it's one of that week's chosen priorities — see the max-4 rule in `PRD.md`). `YEAR` goals carry `yearKey` (an int, e.g. `2026`); `MONTH` goals carry `monthKey` (`"2026-08"`). This trio of nullable, level-specific fields on one table was chosen over three separate tables because goals share every other field (title, description, category, progress, status) and the app frequently needs to query "all goals for this user" without a union.

`Goal.isPriority` is a separate boolean from `weeklyPriorityRank` — it's the year-goal "most important" star (§5 of the PRD), unranked and uncapped, distinct from the weekly 4-goal hard limit.

## Task relationships

A task can simultaneously reference: `Week` (which week's pool it's from), `Day` (nullable — which day, or Inbox), `Goal` (which goal it rolls up to, for progress calculation), `parentTask` (subtasks), and `TimeBlock[]` (its scheduled sessions). `dailyPriorityRank` (1–3) is the "top 3 today" slot, enforced server-side (see `PRD.md`).

## Checklists

Generic and scope-tagged (`ChecklistScope`: YEAR/MONTH/WEEK/DAY/GOAL) rather than five separate tables, since a checklist and its items are identical in shape regardless of what they're attached to. Only `WEEK` scope is wired to a UI so far (`getOrCreateWeeklyChecklist` lazily creates one per week, same pattern as `Week`/`Day`) — `DAY`/`YEAR`/`MONTH`/`GOAL` are schema-ready but unused. This brings the week page's lazy-upsert count to three (`Week`, up to 7 `Day`s, and now the weekly `Checklist`) per render — fine at personal-use scale, but worth knowing if this page's query cost ever needs auditing.

`@@unique([userId, weekId])` and `@@unique([userId, dayId])` on `Checklist` enforce "at most one checklist per week / per day" so `getOrCreateWeeklyChecklist` can safely `upsert`. Both are nullable columns, and Postgres treats each `NULL` as distinct for uniqueness purposes — so these constraints don't block a future `YEAR`/`MONTH`/`GOAL`-scoped checklist, which would leave both `weekId` and `dayId` null.

## Expenses

`Expense.amount` is a `Decimal(10, 2)`, not a float — money shouldn't be represented with binary floating point. This has one consequence that reaches into the UI layer: Prisma's `Decimal` is a class instance, and passing one directly as a Server→Client Component prop either fails to serialize correctly or crashes, the same class of problem `DateTime`/string dates were chosen to avoid elsewhere (see decision 1 above). Every query that reaches a client component converts with `Number(e.amount)` first (see `ExpenseLite` in `lib/types.ts`) — the `Decimal` never leaves server code.

`Expense.date` follows the same `YYYY-MM-DD` string convention as everything else, which makes month filtering a plain `startsWith` string match (`date: { startsWith: "2026-08" }`) rather than a date-range query — no month-boundary math needed.

## Migrations

`prisma/migrations/`:
- `..._init` — the full initial schema.
- `..._add_checklist_unique` — the two `Checklist` unique indexes above. Applied via `prisma migrate deploy` rather than `prisma migrate dev`, because `migrate dev`'s interactive confirmation prompt (for the "this could fail if duplicate rows exist" warning) isn't supported in a non-interactive shell; the table was confirmed empty first, so the warning didn't apply.

Applied against a local Postgres 16 container (see `ARCHITECTURE.md` for the exact `docker run` command and port). Prisma 7's generator (`prisma-client`, not the old `prisma-client-js`) requires a driver adapter at runtime (`@prisma/adapter-pg`) — there's no implicit query-engine binary anymore.
