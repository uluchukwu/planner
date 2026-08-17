import { test, expect } from "@playwright/test";

function uniqueEmail(suffix: string) {
  return `test-${Date.now()}-${suffix}@example.com`;
}

test.describe("auth", () => {
  test("signup redirects to today and the daily planner renders", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "E2E Test");
    await page.fill("#email", uniqueEmail("signup"));
    await page.fill("#password", "testpass123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/day\//);
    await expect(page.getByText("Today's challenge")).toBeVisible();
  });

  test("logout returns to login, and the protected day route bounces an unauthenticated visitor", async ({ page }) => {
    const email = uniqueEmail("logout");
    await page.goto("/signup");
    await page.fill("#name", "E2E Test");
    await page.fill("#email", email);
    await page.fill("#password", "testpass123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/day\//);

    await page.click("text=Log out");
    await expect(page).toHaveURL(/\/login/);

    // A logged-out visitor hitting a protected route directly must be redirected,
    // not shown the page — this is the proxy.ts + DAL auth gate described in
    // docs/ARCHITECTURE.md, exercised here as a black-box check.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password is rejected with a visible error, not a silent failure", async ({ page }) => {
    const email = uniqueEmail("wrongpw");
    await page.goto("/signup");
    await page.fill("#name", "E2E Test");
    await page.fill("#email", email);
    await page.fill("#password", "testpass123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/day\//);
    await page.click("text=Log out");

    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", "not-the-right-password");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
