import { expect, test } from "@playwright/test";

async function openStudentAccess(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new Event("quiz-ui:open")));
  await expect(page.getByRole("heading", { name: "STUDENT QUIZZES" })).toBeVisible();
}

test("demo mode opens the full learning library", async ({ page }) => {
  await openStudentAccess(page);
  await page.getByRole("button", { name: "DEMO MODE" }).click();
  await expect(page.getByRole("heading", { name: "What would you like to learn?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Math Lessons" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reading & Language" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sight Word Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vowel Sounds" })).toBeVisible();
});

test("oral practice does not reveal multiple-choice answers", async ({ page }) => {
  await openStudentAccess(page);
  await page.getByRole("button", { name: "DEMO MODE" }).click();
  await page.getByRole("button", { name: "Math Lessons" }).click();
  await expect(page.getByText("KEY IDEA")).toBeVisible();
  await page.getByRole("button", { name: "START PRACTICE" }).click();
  await expect(page.getByRole("button", { name: /SAY ANSWER/ })).toBeVisible();
  await expect(page.getByLabel("Type your answer")).toBeVisible();
  await expect(page.locator(".quiz-panel button")).toHaveCount(5);
});
