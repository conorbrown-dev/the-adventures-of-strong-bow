import { describe, expect, it } from "vitest";

import { applyRaceDamage, isKnockedOut, PLAYER_HIT_LIMIT, RIVAL_HIT_LIMIT } from "./raceDamage";

describe("race damage", () => {
  it("keeps the player racing for fourteen hits and knocks them out on the fifteenth", () => {
    let remainingHits = PLAYER_HIT_LIMIT;
    for (let hit = 1; hit <= 14; hit += 1) {
      remainingHits = applyRaceDamage(remainingHits);
      expect(isKnockedOut(remainingHits)).toBe(false);
    }

    expect(remainingHits).toBe(1);
    remainingHits = applyRaceDamage(remainingHits);

    expect(remainingHits).toBe(0);
    expect(isKnockedOut(remainingHits)).toBe(true);
  });

  it("does not reduce health below zero", () => {
    expect(applyRaceDamage(0)).toBe(0);
  });

  it("knocks a rival out on the second hit", () => {
    expect(applyRaceDamage(RIVAL_HIT_LIMIT)).toBe(1);
    expect(isKnockedOut(applyRaceDamage(applyRaceDamage(RIVAL_HIT_LIMIT)))).toBe(true);
  });
});
