import { expect, test } from "@playwright/test";

test("Learning is interactive without launching Phaser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));
  await page.goto("/learning");
  await expect(page.getByRole("heading", { name: "What would you like to practise?" })).toBeVisible();
  await page.getByRole("button", { name: "START PRACTICE" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay question" })).toBeVisible();

  const answers = page.locator(".answer-options button");
  await answers.first().focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "CHECK ANSWER" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".learning-question .feedback")).toBeVisible();
  await expect(page.locator("#phaser-root canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
