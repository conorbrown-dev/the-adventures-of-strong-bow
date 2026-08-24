import { expect, test } from "@playwright/test";
import { mockModelTts } from "./testSupport";

test.beforeEach(async ({ page }) => mockModelTts(page));

async function openStudentAccess(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new Event("quiz-ui:open")));
  await expect(page.getByRole("heading", { name: "STUDENT QUIZZES" })).toBeVisible();
}

test("demo mode exposes lessons and games in their own libraries", async ({ page }) => {
  await openStudentAccess(page);
  await page.getByRole("button", { name: "DEMO MODE" }).click();
  await page.getByRole("button", { name: "Lessons & Quizzes" }).click();
  await expect(page.getByRole("heading", { name: "What would you like to learn?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Math Lessons" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reading & Language" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sight Word Studio" })).toHaveCount(0);
  await page.getByRole("button", { name: "MAIN MENU" }).click();
  await page.getByRole("button", { name: "Games" }).click();
  await expect(page.getByRole("button", { name: "Sight Word Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vowel Sounds" })).toBeVisible();
});

test("oral practice does not reveal multiple-choice answers", async ({ page }) => {
  await openStudentAccess(page);
  await page.getByRole("button", { name: "DEMO MODE" }).click();
  await page.getByRole("button", { name: "Lessons & Quizzes" }).click();
  await page.getByRole("button", { name: "Math Lessons" }).click();
  await expect(page.getByText("KEY IDEA")).toBeVisible();
  await page.getByRole("button", { name: "START PRACTICE" }).click();
  await expect(page.getByRole("button", { name: /SAY ANSWER/ })).toBeVisible();
  await expect(page.getByLabel("Type your answer")).toBeVisible();
  await expect(page.locator(".quiz-panel button")).toHaveCount(5);
});

test("unauthenticated deep links redirect to lessons login and authenticated users skip it", async ({ page }) => {
  await page.goto("/learning");
  await expect(page).toHaveURL(/\/lessons$/);
  await expect(page.getByRole("heading", { name: "STUDENT QUIZZES" })).toBeVisible();

  await page.evaluate(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));
  await page.goto("/lessons");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Choose an adventure" })).toBeVisible();
});

for (const [gameName, sceneKey] of [
  ["Sight Word Studio", "SightWordsQuizScene"],
  ["Addition Lab", "AdditionGameScene"]
] as const) {
  test(`${gameName} launches from the learning library`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await openStudentAccess(page);
    await page.getByRole("button", { name: "DEMO MODE" }).click();
    await page.getByRole("button", { name: "Games" }).click();
    await page.getByRole("button", { name: gameName }).click();

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(page.locator("#phaser-root")).toHaveAttribute("data-active-scene", sceneKey);
    expect(pageErrors).toEqual([]);
  });
}

test("Sight Word Studio recovers after a direct-route refresh", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await openStudentAccess(page);
  await page.getByRole("button", { name: "DEMO MODE" }).click();
  await page.getByRole("button", { name: "Games" }).click();
  await page.getByRole("button", { name: "Sight Word Studio" }).click();
  await expect(page).toHaveURL(/\/games\/sight-words$/);
  await expect(page.locator("#phaser-root")).toHaveAttribute("data-active-scene", "SightWordsQuizScene", { timeout: 15_000 });

  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page).toHaveURL(/\/games\/sight-words$/);
  await expect(page.locator("#phaser-root")).toHaveAttribute("data-active-scene", "SightWordsQuizScene", { timeout: 15_000 });
  expect(pageErrors).toEqual([]);
});

test("a failed quiz save is explained without an unhandled error", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["MATH"] } })));
  await page.route("**/api/students/test-student/quiz-attempts", (route) => route.fulfill({ status: 500, json: { message: "Save failed" } }));

  await page.goto("/");
  await page.getByRole("button", { name: "Lessons & Quizzes" }).click();
  await page.getByRole("button", { name: "Math Lessons" }).click();
  await page.getByRole("button", { name: "START PRACTICE" }).click();
  for (const answer of ["7", "five", "3"]) {
    await page.getByLabel("Type your answer").fill(answer);
    await page.getByRole("button", { name: "CHECK", exact: true }).click();
  }

  await expect(page.getByRole("heading", { name: "Great learning!" })).toBeVisible();
  await expect(page.getByText("Your quiz is complete, but your progress could not be saved. Please try again later.")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
