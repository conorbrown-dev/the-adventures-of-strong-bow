import {
  hasPrivatePreviewKindergartenAudio,
  hasProductionReadyKindergartenAudio,
  isKindergartenAudioReady,
  KINDERGARTEN_AUDIO_CUE_CATALOG,
  KINDERGARTEN_AUDIO_CUES,
} from "./kindergarten-ela-catalog";

describe("Kindergarten provisional audio catalog", () => {
  it("has a licensed and checksummed private-preview asset for every required cue", () => {
    expect(KINDERGARTEN_AUDIO_CUE_CATALOG.map((cue) => cue.id)).toEqual(KINDERGARTEN_AUDIO_CUES);
    expect(KINDERGARTEN_AUDIO_CUE_CATALOG).toHaveLength(7);
    KINDERGARTEN_AUDIO_CUE_CATALOG.forEach((cue) => {
      expect(cue.reviewStatus).toBe("PROVISIONAL");
      expect(cue.assetPath).toMatch(/\.ogg$/);
      expect(cue.sourcePage).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(cue.licenseId).toBe("CC-BY-SA-3.0");
      expect(cue.sha256).toMatch(/^[a-f0-9]{64}$/);
    });
    expect(hasPrivatePreviewKindergartenAudio()).toBe(true);
    expect(isKindergartenAudioReady(true)).toBe(true);
  });

  it("does not treat provisional recordings as production reviewed", () => {
    expect(hasProductionReadyKindergartenAudio()).toBe(false);
    expect(isKindergartenAudioReady(false)).toBe(false);
  });
});
