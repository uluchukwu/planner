# UI System

## Philosophy

Paper-planner-inspired, not skeuomorphic. The reference (`WEEKLY TRACKER.pdf`) is a hand-ruled notebook page — the app borrows its *structure* (grid-based, zoned, one thing per area) and its *restraint* (no chrome, no decoration competing with the content) without pretending to be paper. No lined-paper textures, no handwriting fonts, no page-curl effects.

Concretely: generous whitespace over dense cards; a single accent color (`--accent`, a muted forest green) for structure and navigation; a second accent (`--priority`, a muted terracotta) reserved *only* for the 3/4-priority markers, so seeing that color means "one of the few things that matter" — using it anywhere else would cheapen the signal. No gradients. No border-on-everything. Animation limited to short (~500ms) width/opacity transitions on progress bars and drag states, and respects `prefers-reduced-motion` (see the media query in `globals.css`).

## Design tokens

Defined in `src/app/globals.css` as CSS custom properties, mapped into Tailwind v4 utility classes via `@theme inline` (so `bg-paper`, `text-ink`, `border-hairline`, etc. are real utility classes, not one-off inline styles):

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#faf7f1` | `#1a1b1d` | page background |
| `surface` | `#ffffff` | `#222325` | cards, inputs |
| `surface-sunken` | `#f3efe6` | `#29292c` | inbox/board columns, subtle recess |
| `ink` / `ink-soft` / `ink-faint` | dark→light grays | light→dark grays | primary / secondary / tertiary text |
| `hairline` | `#e6e0d2` | `#35363a` | all borders |
| `accent` / `accent-soft` / `accent-strong` | forest green family | brightened for dark | structural accent, links, focus rings |
| `priority` / `priority-soft` | terracotta family | brightened for dark | **priority markers only** |
| `danger` / `danger-soft` | muted red | brightened for dark | delete, errors, limit-reached messages |

Dark mode is three-state, matching the `theme` setting on `User` (`LIGHT` / `DARK` / `SYSTEM`): bare `:root` holds light tokens; `@media (prefers-color-scheme: dark)` (guarded by `:root:not([data-theme="light"])`) covers `SYSTEM` users on a dark OS; `:root[data-theme="dark"]` covers an explicit `DARK` choice regardless of OS. The root layout (`src/app/layout.tsx`) reads the signed-in user's `theme` server-side and stamps `data-theme` on `<html>` accordingly — no client-side flash-of-wrong-theme script needed, no separate light/dark builds.

## Component inventory

| Component | File | Notes |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | 4 variants (primary/secondary/ghost/danger) × 2 sizes |
| `Input`/`Textarea`/`Select`/`Label` | `components/ui/Field.tsx` | shared form primitives |
| `Checkbox` | `components/ui/Checkbox.tsx` | custom-styled, not a native checkbox — needed control over the checked-state fill/tick without fighting native OS rendering |
| `ProgressRing` / `ProgressBar` | `components/ui/ProgressRing.tsx` | ring for goal cards, bar for inline/compact progress |
| `EmptyState` | `components/ui/EmptyState.tsx` | question-framed prompts ("What's worth moving forward this week?"), never "No items found" |
| `Sidebar` | `components/nav/Sidebar.tsx` | desktop left rail, 7 items (`NAV_ITEMS` in `navItems.ts`) |
| `MobileNav` | `components/nav/MobileNav.tsx` | bottom bar, a deliberately smaller 5-item subset (`MOBILE_NAV_ITEMS`) — Habits isn't one of them, per §21's "don't expose everything" instruction |
| `WeekBoard` / `BoardTaskCard` | `components/planner/` | the drag-and-drop board — Inbox + 7 day columns |
| `DayView` / `DayTaskRow` | `components/planner/` | daily task list (top-3 + others), owns the optimistic-priority-toggle logic and the goal-linking `<select>` |
| `TaskContent` | `components/planner/TaskContent.tsx` | shared presentational task row (checkbox, title, chips, delete) — `BoardTaskCard` and `DayTaskRow` both wrap it rather than duplicating markup |
| `TimeBlockTimeline` | `components/planner/TimeBlockTimeline.tsx` | 6am–8pm vertical timeline, absolutely-positioned blocks |
| `UrgentImportantMatrix` | `components/planner/UrgentImportantMatrix.tsx` | collapsible 2×2, read-only view of a day's tasks by quadrant |
| `WeeklyPriorityPanel` | `components/planner/WeeklyPriorityPanel.tsx` | the 4-goal weekly priority list |
| `Checklist` | `components/planner/Checklist.tsx` | generic checklist widget (currently only used for the week-scoped one) |
| `WeeklyReviewForm` / `WeeklyReviewTriage` | `components/planner/` | the six reflection fields, and the incomplete-task move/reschedule/archive triage |
| `HabitTracker` | `components/habits/HabitTracker.tsx` | week-scoped widget on the Week page — 7 dots per habit, aligned to whichever week is on screen |
| `HabitManageList` | `components/habits/HabitManageList.tsx` | the `/habits` page — streak, weekly count, monthly %, archive/restore/delete |
| `ExpenseForm` / `ExpenseList` / `CategoryBreakdown` | `components/expenses/` | add/delete expenses, per-category `ProgressBar` breakdown — reuses the goal-progress bar rather than a new chart library for "simple charts" |
| `GoalCard` / `GoalList` | `components/goals/` | year/month goal cards with progress ring + status |
| `Greeting` / `QuickTaskList` / `StatTile` | `components/dashboard/` | dashboard-specific widgets |

## Layout

Desktop: fixed 224px left sidebar, fluid content area, no third "right rail" column forced everywhere — the day page uses a right-hand column for the timeline/matrix specifically because that's where the PDF puts the timetable, not as a global layout rule. Mobile: sidebar hidden, bottom nav (`Home / Today / Week / Goals / Settings` — a subset, not a 1:1 mirror of the desktop sidebar per §21 of the brief).

## Accessibility

Every icon-only control has an `aria-label`; toggle buttons (checkbox, priority stars) use `aria-pressed`/`role="checkbox"` with `aria-checked`; focus states are a visible 2px accent outline (`focus-visible:outline-2 focus-visible:outline-accent`) on every interactive element, not just links; the drag handle is a real `<button>` so it's keyboard-focusable even though keyboard-driven reordering isn't implemented yet (see `ROADMAP.md`); `prefers-reduced-motion` is honored globally.

## What's not built

A formal component-story/Storybook setup, a documented spacing/type scale beyond Tailwind's defaults, and a `@media print` stylesheet for the live on-screen views. PDF export (`ROADMAP.md` Phase 5) shipped instead as a separate `@react-pdf/renderer` rendering path (`src/lib/pdf/`) — its own high-contrast, low-ink visual language, not a reuse of this design system's tokens.
