import { describe, expect, it } from "vitest";

import { PHONICS_CHALLENGES } from "./phonicsChallenges";

describe("PHONICS_CHALLENGES", () => {
  it("provides playable three-choice questions across the target phonics patterns", () => {
    expect(PHONICS_CHALLENGES.length).toBeGreaterThanOrEqual(10);
    PHONICS_CHALLENGES.forEach((challenge) => {
      expect(challenge.choices).toHaveLength(3);
      expect(challenge.choices[challenge.correctChoice]).toBeTruthy();
    });
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("silent e"))).toBe(true);
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("vowel team"))).toBe(true);
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("digraph"))).toBe(true);
  });
});
