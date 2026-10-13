import { expect, test } from "@playwright/test";
import { mockModelTts } from "./testSupport";

test("parent settings disable mastered modes and persist after reload", async ({ page }) => {
  test.setTimeout(90_000);
  const press = async (key: string): Promise<void> => {
    await page.keyboard.press(key);
    // Phaser processes keyboard events on its next animation frame.
    await page.waitForTimeout(100);
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockModelTts(page);
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));
  await page.goto("/games/fossil-dig");
  await expect(page.locator('#phaser-root[data-active-scene="FossilDigTitleScene"]')).toBeVisible({ timeout: 60_000 });
  await press("ArrowDown");
  await press("Enter");
  const dialog = page.getByRole("dialog", { name: "Parent & teacher settings" });
  await expect(dialog).toBeVisible();
  await page.getByRole("checkbox", { name: "CVC practice across games" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "CVC Words", exact: true })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: "Short Vowels", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Silent E", exact: true }).uncheck();
  await page.screenshot({ path: test.info().outputPath("learning-mode-settings.png") });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await page.reload();
  await expect(page.locator('#phaser-root[data-active-scene="FossilDigTitleScene"]')).toBeVisible({ timeout: 60_000 });
  await press("ArrowDown");
  await press("Enter");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "CVC practice across games" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Silent E", exact: true })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "CVC practice across games" }).check();
  await expect(page.getByRole("checkbox", { name: "CVC Words", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "CVC Words", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Silent E", exact: true })).not.toBeChecked();
  for (const name of ["CVC Words", "Short Vowels", "Vowel Teams", "Consonant Digraphs"]) {
    await page.getByRole("checkbox", { name, exact: true }).uncheck();
  }
  await press("Escape");
  await expect(dialog).toHaveCount(0);
  await press("ArrowUp");
  await press("Enter");
  await page.waitForTimeout(400);
  await press("ArrowDown");
  await press("Enter");
  await press("Escape");
  await press("ArrowDown");
  await press("Enter");
  await expect(dialog).toBeVisible();
  expect(errors).toEqual([]);
});
