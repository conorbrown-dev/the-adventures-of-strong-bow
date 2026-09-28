import { describe, expect, it } from "vitest";

import { buildFossilDigContent } from "./FossilDigContent";

describe("Fossil Dig phonics modules", () => {
  it.each([
    "cvc",
    "short-vowels",
    "silent-e",
    "vowel-teams",
    "consonant-digraphs"
  ] as const)("provides target words and distractors for %s", (moduleId) => {
    const content = buildFossilDigContent(moduleId);

    expect(content.pickups.length).toBeGreaterThan(2);
    expect(content.distractors.length).toBeGreaterThan(1);
    expect(content.pickups.some((target) =>
      content.distractors.some((distractor) => distractor.label !== target.label)
    )).toBe(true);
  });
});
