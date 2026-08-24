import type { Page } from "@playwright/test";

export async function mockModelTts(page: Page): Promise<void> {
  await page.route("**/api/tts", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ message: "TTS is disabled during browser tests." })
  }));
}
