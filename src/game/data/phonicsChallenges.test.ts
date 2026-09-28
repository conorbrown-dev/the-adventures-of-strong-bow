import { describe, expect, it } from "vitest";

import { PHONICS_CHALLENGES, PHONICS_MODULES } from "./phonicsChallenges";

describe("PHONICS_CHALLENGES", () => {
  it("provides playable three-choice questions across the target phonics patterns", () => {
    expect(PHONICS_CHALLENGES.length).toBeGreaterThanOrEqual(30);
    PHONICS_CHALLENGES.forEach((challenge) => {
      expect(challenge.choices).toHaveLength(3);
      expect(challenge.choices[challenge.correctChoice]).toBeTruthy();
    });
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("silent e"))).toBe(true);
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("vowel team"))).toBe(true);
    expect(PHONICS_CHALLENGES.some((challenge) => challenge.prompt.includes("digraph"))).toBe(true);
  });

  it("keeps every race round within one selected phonics module", () => {
    expect(PHONICS_MODULES.map((module) => module.id)).toEqual([
      "short-vowels",
      "silent-e",
      "vowel-teams",
      "consonant-digraphs",
    ]);
    PHONICS_MODULES.forEach((module) => {
      expect(module.challenges.length).toBeGreaterThanOrEqual(5);
      expect(module.challenges.every((challenge) => PHONICS_CHALLENGES.includes(challenge))).toBe(true);
    });
  });
});
