import { describe, expect, it } from "vitest";

import { PHONICS_CHALLENGES, PHONICS_MODULES, shufflePhonicsChoices } from "./phonicsChallenges";

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

  it("contrasts silent e words with words that contain e away from the end", () => {
    const silentEModule = PHONICS_MODULES.find((module) => module.id === "silent-e");

    expect(silentEModule?.challenges.some((challenge) => {
      const correctAnswer = challenge.choices[challenge.correctChoice];
      return challenge.prompt.includes("not at the end") && correctAnswer?.includes("e") && !correctAnswer.endsWith("e");
    })).toBe(true);
  });

  it("uses conceptually distinct distractors in the other phonics modules", () => {
    const shortVowels = PHONICS_MODULES.find((module) => module.id === "short-vowels");
    const vowelTeams = PHONICS_MODULES.find((module) => module.id === "vowel-teams");

    expect(shortVowels?.challenges).toContainEqual(expect.objectContaining({
      prompt: "Which word has a short i sound?",
      choices: ["pig", "pine", "team"],
    }));
    expect(vowelTeams?.challenges).toContainEqual(expect.objectContaining({
      prompt: "Which word has the vowel team ee?",
      choices: ["seed", "sled", "seal"],
    }));
    expect(vowelTeams?.challenges).toContainEqual(expect.objectContaining({
      prompt: "Which word has the vowel team ow?",
      choices: ["snow", "sun", "snore"],
    }));
  });

  it("shuffles the displayed choices while preserving the correct answer", () => {
    const challenge = { prompt: "Choose the answer.", choices: ["first", "correct", "last"], correctChoice: 1, teachingNote: "Correct." };
    const presented = shufflePhonicsChoices(challenge, () => 0);

    expect(presented.choices).toEqual(["correct", "last", "first"]);
    expect(presented.choices[presented.correctChoice]).toBe("correct");
  });
});
