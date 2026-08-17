import { test, expect } from "@playwright/test";

function uniqueEmail(suffix: string) {
  return `test-${Date.now()}-${suffix}@example.com`;
}

// The PRD's core loop: plan the week -> choose today's priorities -> execute ->
// check things off -> the dashboard reflects it. This also exercises task<->goal
// linking and AUTO progress end to end (docs/ROADMAP.md's Phase 2 fix), since that's
// the one gap in the acceptance workflow that isn't covered by priority-limits.spec.ts.
//
// Deliberately does not exercise drag-and-drop (WeekBoard's Inbox-to-day move) — that
// was verified manually during Phase 2 (see docs/ARCHITECTURE.md) but converting a
// @dnd-kit interaction into a reliable scripted drag was out of scope for this pass;
// this test creates the task directly on a day instead, which reaches the same
// task/goal/completion code paths without depending on drag simulation.
test("plan -> execute -> complete -> dashboard reflects it", async ({ page }) => {
  const email = uniqueEmail("core-loop");
  await page.goto("/signup");
  await page.fill("#name", "E2E Test");
  await page.fill("#email", email);
  await page.fill("#password", "testpass123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/day\/(.+)/);
  const dateKey = page.url().split("/day/")[1];

  // Plan: a weekly goal
  await page.goto(`/week/${dateKey}`);
  await page.click("text=+ Add weekly goal");
  await page.locator('input[placeholder*="MSc"]').fill("Ship the core loop test");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ship the core loop test")).toBeVisible();

  // Execute: a task on today, linked to that goal
  await page.goto(`/day/${dateKey}`);
  const taskTitle = "Write the core-loop spec";
  const quickAdd = page.locator('input[placeholder*="Add a task" i]');
  await quickAdd.fill(taskTitle);
  await quickAdd.press("Enter");
  const row = page.locator("div.group", { hasText: taskTitle }).first();
  await expect(row).toBeVisible();

  const moreActions = row.locator('summary[aria-label="More actions"]');
  await moreActions.click(); // opens the <details> panel
  await row.getByLabel("Weekly goal").selectOption({ label: "Ship the core loop test" });
  await moreActions.click(); // closes it — leaving it open makes the <option>'s own text
  // collide with the rendered chip text below, since <select> options stay in the DOM

  await expect(row.locator("span", { hasText: "Ship the core loop test" })).toBeVisible(); // the goal chip

  // Check it off
  await row.getByRole("checkbox", { name: `Mark "${taskTitle}" complete` }).click();
  await expect(row.getByRole("checkbox", { name: `Mark "${taskTitle}" incomplete` })).toBeVisible();

  // Review: dashboard reflects both today's completion and the goal's AUTO progress
  await page.goto("/dashboard");
  const goalListItem = page.locator("li", { hasText: "Ship the core loop test" });
  await expect(goalListItem).toBeVisible();
  // Scoped to the goal's own row — "100%" also legitimately appears in the separate
  // "Weekly task completion" stat below it (1/1 task done computes to 100% too), so an
  // unscoped match would be ambiguous, not wrong.
  await expect(goalListItem.getByText("100%")).toBeVisible(); // 1/1 linked task complete -> AUTO progress
});
