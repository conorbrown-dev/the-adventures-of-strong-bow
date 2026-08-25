import { expect, test } from "@playwright/test";
import { mockModelTts } from "./testSupport";

test("Learning is interactive without launching Phaser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockModelTts(page);

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
    if (url.pathname.endsWith("/next")) {
      await route.fulfill({ json: { session: null } });
      return;
    }
    if (url.pathname.endsWith("/progress")) {
      await route.fulfill({ json: { attempts: [], mastery: [], latestDiagnosticPlacement: null } });
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
  await page.getByRole("button", { name: "FINISH SESSION" }).click();
  await expect(page.getByRole("heading", { name: "Your skills" })).toBeVisible();
  await expect(page.locator("#phaser-root canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Learning requires a real student login instead of Demo Mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ demo: true, token: "demo-mode", student: { id: "demo-player", username: "Demo Player", grade: "K", subjects: ["ELA", "MATH"] } })));
  await page.goto("/learning");

  await expect(page.getByRole("heading", { name: "Sign in to start Learning" })).toBeVisible();
  await expect(page.getByRole("button", { name: "SIGN IN OR CREATE A STUDENT" })).toBeVisible();
});

test("a completed diagnostic shows its placement and does not call checked skills not started", async ({ page }) => {
  await mockModelTts(page);
  const question = {
    schemaVersion: 1,
    id: "diagnostic-question",
    templateId: "k.rf.diagnostic",
    templateVersion: 1,
    standardIds: ["K.RF.1.d"],
    responseType: "singleChoice",
    prompt: { text: "Which letter is lowercase L?", audioText: "Which letter is lowercase L?", instructions: "Choose one answer." },
    interaction: { choices: [{ id: "l", label: "l" }, { id: "x", label: "x" }] },
    explanation: "The lowercase letter is l.",
    accessibility: { spokenPrompt: "Which letter is lowercase L?", textAlternative: "Which letter is lowercase L?" }
  };
  const placement = { grouping: "Reading & Language", grade: "K", learningTargetIds: [] };
  await page.route("**/api/curriculum/learning/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/answers")) {
      await route.fulfill({ json: { correct: true, explanation: question.explanation, masteryState: "notStarted", complete: true, placement } });
      return;
    }
    if (path.endsWith("/next")) {
      await route.fulfill({ json: { session: null } });
      return;
    }
    if (path.endsWith("/progress")) {
      await route.fulfill({ json: { attempts: [{ primaryStandardId: "K.RF.1.d", correct: true, usedHint: false, independent: true, purpose: "diagnostic", submittedAnswer: "l" }], mastery: [{ standardId: "K.RF.1.d", state: "notStarted", nextReviewAt: null }], latestDiagnosticPlacement: placement } });
      return;
    }
    await route.fulfill({ json: { sessionId: "diagnostic-session", position: 0, length: 1, question } });
  });
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));

  await page.goto("/learning");
  await page.getByRole("button", { name: "START DIAGNOSTIC" }).click();
  await page.getByRole("button", { name: "l", exact: true }).click();
  await page.getByRole("button", { name: "CHECK ANSWER" }).click();
  await expect(page.getByText("Diagnostic complete")).toBeVisible();
  await expect(page.getByText("Recommended starting level:")).toContainText("Kindergarten");
  await page.getByRole("button", { name: "VIEW SKILLS PROGRESS" }).click();
  await expect(page.getByText("Latest diagnostic")).toBeVisible();
  await expect(page.getByText("Diagnostic checked")).toBeVisible();
  await expect(page.getByText("notStarted")).toHaveCount(0);
});
