import { describe, expect, it } from "vitest";

import { LetterCatchState } from "./LetterCatchState";

describe("LetterCatchState", () => {
  it("removes one point when a distractor is caught", () => {
    const state = new LetterCatchState(5);
    state.registerCorrectCatch();
    state.registerCorrectCatch();

    state.registerIncorrectCatch();

    expect(state.correctCaught).toBe(1);
    expect(state.incorrectCaught).toBe(1);
  });

  it("does not reduce the score below zero", () => {
    const state = new LetterCatchState(5);

    state.registerIncorrectCatch();

    expect(state.correctCaught).toBe(0);
  });
});
