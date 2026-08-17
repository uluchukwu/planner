import { test, expect } from "@playwright/test";
import { connectTestDb } from "./db";

// These two limits are called out as non-negotiable in docs/PRD.md: "Weekly priority
// goals: maximum 4" and "Daily priorities: maximum 3", each enforced server-side in a
// transaction (see toggleWeeklyPriority / toggleDailyPriority). A UI-only limit is not
// a real limit, so every assertion here checks either a visible rejection or the
// database directly — never just "the button looked disabled."

function uniqueEmail(suffix: string) {
  return `test-${Date.now()}-${suffix}@example.com`;
}

async function signUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signup");
  await page.fill("#name", "E2E Test");
  await page.fill("#email", email);
  await page.fill("#password", "testpass123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/day\/(.+)/);
  return page.url().split("/day/")[1];
}

test.describe("priority limits", () => {
  test("weekly: a 5th star is rejected with a visible error and the count stays at 4/4", async ({ page }) => {
    const dateKey = await signUp(page, uniqueEmail("weekly-limit"));
    await page.goto(`/week/${dateKey}`);
    await expect(page.getByText("Weekly priority goals")).toBeVisible();

    for (let i = 1; i <= 5; i++) {
      await page.click("text=+ Add weekly goal");
      const input = page.locator('input[placeholder*="MSc"]');
      await input.fill(`Goal ${i}`);
      await page.keyboard.press("Enter");
      await expect(page.getByText(`Goal ${i}`, { exact: false })).toBeVisible();
    }

    for (let i = 1; i <= 4; i++) {
      const card = page.locator(`li:has-text("Goal ${i}")`);
      await card.locator('button[aria-label="Mark as a weekly priority"]').click();
    }
    await expect(page.getByText("4/4")).toBeVisible();

    const fifthCard = page.locator(`li:has-text("Goal 5")`);
    await fifthCard.locator('button[aria-label="Mark as a weekly priority"]').click();

    await expect(page.getByText(/full\. Remove one first\./i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("4/4")).toBeVisible();
  });

  test("weekly: the limit holds in the database under rapid concurrent clicks, not just the DOM", async ({ page }) => {
    const email = uniqueEmail("weekly-race");
    const dateKey = await signUp(page, email);
    await page.goto(`/week/${dateKey}`);
    await expect(page.getByText("Weekly priority goals")).toBeVisible();

    for (let i = 1; i <= 5; i++) {
      await page.click("text=+ Add weekly goal");
      const input = page.locator('input[placeholder*="MSc"]');
      await input.fill(`Race Goal ${i}`);
      await page.keyboard.press("Enter");
      await expect(page.getByText(`Race Goal ${i}`, { exact: false })).toBeVisible();
    }

    // No waits between clicks, deliberately — this is the interleaving that produced
    // a stale "5/4" DOM display during manual testing (see docs/PRD.md). The DOM can
    // lag; the database is the actual source of truth being tested here.
    for (let i = 1; i <= 5; i++) {
      const card = page.locator(`li:has-text("Race Goal ${i}")`);
      await card.locator('button[aria-label="Mark as a weekly priority"]').click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(2000);

    const db = connectTestDb();
    await db.connect();
    try {
      const { rows } = await db.query(
        `SELECT g."weeklyPriorityRank" FROM goals g JOIN users u ON g."userId" = u.id WHERE u.email = $1 AND g.level = 'WEEK'`,
        [email]
      );
      const starredCount = rows.filter((r: { weeklyPriorityRank: number | null }) => r.weeklyPriorityRank !== null).length;
      expect(starredCount).toBeLessThanOrEqual(4);
    } finally {
      await db.end();
    }
  });

  test("daily: a 4th top-3 pick is rejected with a visible error and the count stays at 3/3", async ({ page }) => {
    const dateKey = await signUp(page, uniqueEmail("daily-limit"));
    await page.goto(`/day/${dateKey}`);

    const quickAdd = page.locator('input[placeholder*="Add a task" i]');
    for (let i = 1; i <= 4; i++) {
      await quickAdd.fill(`Task ${i}`);
      await quickAdd.press("Enter");
      await expect(page.getByText(`Task ${i}`, { exact: false })).toBeVisible();
    }

    // TaskContent (DayTaskRow's shared wrapper) renders its row as <div class="group ...">
    // — that class is only applied to the row root, not any ancestor, so it scopes
    // `hasText` to exactly one row per unique task title rather than matching nested parents.
    for (let i = 1; i <= 3; i++) {
      const row = page.locator("div.group", { hasText: `Task ${i}` }).first();
      await row.locator('button[aria-label="Mark as a top-3 priority today"]').click();
    }
    await expect(page.getByText("3/3")).toBeVisible();

    const fourthRow = page.locator("div.group", { hasText: "Task 4" }).first();
    await fourthRow.locator('button[aria-label="Mark as a top-3 priority today"]').click();

    await expect(page.getByText(/full\. Remove one first\./i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("3/3")).toBeVisible();
  });
});
