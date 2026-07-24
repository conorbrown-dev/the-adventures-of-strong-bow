import { expect, test } from "@playwright/test";

test("Learning is interactive without launching Phaser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/learning");
  await expect(page.getByRole("heading", { name: "What would you like to practise?" })).toBeVisible();
  await page.getByRole("button", { name: "START PRACTICE" }).click();
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay question" })).toBeVisible();

  const answers = page.locator(".answer-options button");
  await answers.first().click();
  await page.getByRole("button", { name: "CHECK ANSWER" }).click();
  await expect(page.locator(".learning-question .feedback")).toBeVisible();
  await expect(page.locator("#phaser-root canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
