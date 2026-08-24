import { expect, test } from "@playwright/test";

test("Learning is interactive without launching Phaser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const question = {
    schemaVersion: 1,
    id: "lowercase-letter-test",
    templateId: "k.rf.1.d.lowercase-name",
    templateVersion: 1,
    standardIds: ["K.RF.1.d"],
    responseType: "singleChoice",
    prompt: { text: "Which lowercase letter matches L?", audioText: "Which lowercase letter matches L?", instructions: "Choose one answer." },
    interaction: { choices: [{ id: "x", label: "x" }, { id: "f", label: "f" }, { id: "l", label: "l" }] },
    explanation: "l is the lowercase form of the letter L.",
    accessibility: { spokenPrompt: "Which lowercase letter matches L?", textAlternative: "Which lowercase letter matches L?" }
  };
  const session = { sessionId: "test-session", position: 0, length: 1, question };
  await page.route("**/api/curriculum/learning/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/answers")) {
      await route.fulfill({ json: { correct: true, explanation: question.explanation, masteryState: "learning", complete: true } });
      return;
    }
    await route.fulfill({ json: session });
  });

  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));
  await page.goto("/learning");
  await expect(page.getByRole("heading", { name: "Ready to learn something new?" })).toBeVisible();
  await page.getByRole("button", { name: "START PRACTICE" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: question.prompt.text })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay question" })).toBeVisible();
  await expect(page.getByText("Choose one answer.")).toBeVisible();

  await expect(page.getByRole("button", { name: "x", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "f", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "l", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "CHECK ANSWER" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".learning-question .feedback")).toHaveText(question.explanation);
  await expect(page.locator("#phaser-root canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
