import { describe, expect, it } from "vitest";

import { applyRaceDamage, isKnockedOut, PLAYER_HIT_LIMIT, RIVAL_HIT_LIMIT } from "./raceDamage";

describe("race damage", () => {
  it("knocks the player out on the fourth hit", () => {
    let remainingHits = PLAYER_HIT_LIMIT;
    for (let hit = 0; hit < PLAYER_HIT_LIMIT; hit += 1) remainingHits = applyRaceDamage(remainingHits);

    expect(remainingHits).toBe(0);
    expect(isKnockedOut(remainingHits)).toBe(true);
  });

  it("knocks a rival out on the second hit", () => {
    expect(applyRaceDamage(RIVAL_HIT_LIMIT)).toBe(1);
    expect(isKnockedOut(applyRaceDamage(applyRaceDamage(RIVAL_HIT_LIMIT)))).toBe(true);
  });
});
