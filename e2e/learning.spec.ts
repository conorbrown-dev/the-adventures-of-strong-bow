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
      await route.fulfill({ json: { attempts: [], mastery: [], latestDiagnosticPlacement: null, latestAssessmentSessionId: null } });
      return;
    }
    if (url.pathname.endsWith("/lesson-plans")) {
      await route.fulfill({ json: [] });
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

test("correct Learning answers celebrate and Continue fills before advancing", async ({ page }) => {
  await mockModelTts(page);
  const question = {
    schemaVersion: 1, id: "celebration-question", templateId: "k.rf.celebration", templateVersion: 1, standardIds: ["K.RF.1.d"], responseType: "singleChoice",
    prompt: { text: "Which letter is L?", audioText: "Which letter is L?", instructions: "Choose one answer." },
    interaction: { choices: [{ id: "l", label: "l" }, { id: "x", label: "x" }] }, explanation: "Yes, that is L!",
    accessibility: { spokenPrompt: "Which letter is L?", textAlternative: "Which letter is L?" }
  };
  const nextQuestion = { ...question, id: "next-question", prompt: { ...question.prompt, text: "Which letter is M?", audioText: "Which letter is M?" } };
  const firstSession = { sessionId: "celebration-session", position: 0, length: 2, question };
  const nextSession = { sessionId: "celebration-session", position: 1, length: 2, question: nextQuestion };
  await page.route("**/api/curriculum/learning/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/answers")) { await route.fulfill({ json: { correct: true, explanation: question.explanation, masteryState: "learning", complete: false } }); return; }
    if (path.endsWith("/next")) { await route.fulfill({ json: { session: nextSession } }); return; }
    if (path.endsWith("/lesson-plans")) { await route.fulfill({ json: [] }); return; }
    await route.fulfill({ json: firstSession });
  });
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));

  await page.goto("/learning");
  await page.getByRole("button", { name: "START PRACTICE" }).click();
  await page.getByRole("button", { name: "l", exact: true }).click();
  await page.getByRole("button", { name: "CHECK ANSWER" }).click();

  await expect(page.locator(".learning-confetti-piece")).toHaveCount(28);
  const continueButton = page.getByRole("button", { name: "Continue to the next activity" });
  await expect(continueButton).toContainText("CONTINUE");
  await expect(continueButton).toContainText("→");
  await expect(continueButton).toHaveAttribute("data-auto-advance", "true");
  await expect.poll(() => continueButton.evaluate((button) => getComputedStyle(button, "::before").animationName)).toBe("learning-continue-fill");
  await expect(page.getByRole("heading", { name: nextQuestion.prompt.text })).toBeVisible({ timeout: 5_000 });
});

test("Take a break saves a diagnostic and resumes the exact activity after reload", async ({ page }) => {
  await mockModelTts(page);
  const question = {
    schemaVersion: 1, id: "saved-diagnostic-question", templateId: "k.rf.saved", templateVersion: 1, standardIds: ["K.RF.1.d"], responseType: "singleChoice",
    prompt: { text: "Which letter makes the l sound?", audioText: "Which letter makes the l sound?", instructions: "Choose one answer." },
    interaction: { choices: [{ id: "l", label: "l" }, { id: "x", label: "x" }] }, explanation: "The letter l makes the l sound.",
    accessibility: { spokenPrompt: "Which letter makes the l sound?", textAlternative: "Which letter makes the l sound?" }
  };
  const diagnostic = { sessionId: "saved-diagnostic", position: 4, length: 30, assessmentStage: { grade: "K", number: 1, total: 3 }, question };
  await page.route("**/api/curriculum/learning/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/lesson-plans")) { await route.fulfill({ json: [] }); return; }
    await route.fulfill({ json: diagnostic });
  });
  await page.addInitScript(() => localStorage.setItem("mollys-learning-academy.student-session", JSON.stringify({ token: "test-token", student: { id: "test-student", username: "Test Student", grade: "K", subjects: ["ELA", "MATH"] } })));

  await page.goto("/learning");
  await page.getByRole("button", { name: "START DIAGNOSTIC" }).click();
  await expect(page.getByText("KINDERGARTEN LEARNING CHECK · ACTIVITY 5")).toBeVisible();
  await page.getByRole("button", { name: "TAKE A BREAK" }).click();
  await expect(page.getByRole("button", { name: "RESUME DIAGNOSTIC" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "RESUME DIAGNOSTIC" }).click();
  await expect(page.getByRole("heading", { name: question.prompt.text })).toBeVisible();
  await expect(page.getByText("KINDERGARTEN LEARNING CHECK · ACTIVITY 5")).toBeVisible();
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
      await route.fulfill({ json: { attempts: [
        { sessionId: "old-diagnostic", primaryStandardId: "OLD.DIAGNOSTIC", correct: false, usedHint: false, independent: true, purpose: "diagnostic", submittedAnswer: "x" },
        { sessionId: "old-practice", primaryStandardId: "K.RF.1.d", correct: false, usedHint: false, independent: true, purpose: "practice", submittedAnswer: "x" },
        { sessionId: "diagnostic-session", primaryStandardId: "K.RF.1.d", correct: true, usedHint: false, independent: true, purpose: "diagnostic", submittedAnswer: "l" }
      ], mastery: [{ standardId: "K.RF.1.d", state: "notStarted", nextReviewAt: null }], latestDiagnosticPlacement: placement, latestAssessmentSessionId: "diagnostic-session" } });
      return;
    }
    if (path.endsWith("/lesson-plans")) {
      await route.fulfill({ json: [] });
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
  await expect(page.getByText("LATEST DIAGNOSTIC", { exact: true })).toBeVisible();
  const latestDiagnostic = page.getByRole("region", { name: "Latest diagnostic skills" });
  await expect(latestDiagnostic.getByText("Diagnostic checked")).toBeVisible();
  await expect(latestDiagnostic).toContainText("1 checked answer · 100% correct");
  await expect(latestDiagnostic).not.toContainText("OLD.DIAGNOSTIC");
  await expect(page.getByRole("heading", { name: "Ongoing practice progress" })).toBeVisible();
  await expect(page.getByText("notStarted")).toHaveCount(0);
});
