import { afterEach, describe, expect, it, vi } from "vitest";
import { PHONICS_MODULES } from "../data/phonicsChallenges";
import { FOSSIL_DIG_MODE_OPTIONS, isFossilDigModeEnabled, isPhonicsModuleEnabled, loadLearningModeSettings, sanitizeLearningModeSettings, saveLearningModeSettings } from "./learningModeSettings";

afterEach(() => vi.unstubAllGlobals());

describe("mastered learning modes", () => {
  it("keeps all lessons available for existing browsers without settings", () => {
    const settings = sanitizeLearningModeSettings(null);
    expect(settings.isCvcEnabled).toBe(true);
    expect(FOSSIL_DIG_MODE_OPTIONS.every(({ id }) => isFossilDigModeEnabled(id, settings))).toBe(true);
  });

  it("disables selected Fossil Dig lessons independently", () => {
    const settings = sanitizeLearningModeSettings({ disabledFossilDigModes: ["silent-e", "vowel-teams"] });
    expect(isFossilDigModeEnabled("silent-e", settings)).toBe(false);
    expect(isFossilDigModeEnabled("vowel-teams", settings)).toBe(false);
    expect(isFossilDigModeEnabled("cvc", settings)).toBe(true);
    expect(isFossilDigModeEnabled("consonant-digraphs", settings)).toBe(true);
  });

  it("disables CVC targets across Fossil Dig and Racing while preserving other skills", () => {
    const settings = sanitizeLearningModeSettings({ isCvcEnabled: false });
    expect(isFossilDigModeEnabled("cvc", settings)).toBe(false);
    expect(isFossilDigModeEnabled("short-vowels", settings)).toBe(false);
    expect(isFossilDigModeEnabled("silent-e", settings)).toBe(true);
    expect(isFossilDigModeEnabled("vowel-teams", settings)).toBe(true);
    expect(isFossilDigModeEnabled("consonant-digraphs", settings)).toBe(true);
    expect(PHONICS_MODULES.filter((module) => isPhonicsModuleEnabled(module, settings)).map((module) => module.id))
      .toEqual(["silent-e", "vowel-teams", "consonant-digraphs"]);
  });

  it("permits disabling every Fossil Dig lesson", () => {
    const settings = sanitizeLearningModeSettings({ disabledFossilDigModes: FOSSIL_DIG_MODE_OPTIONS.map(({ id }) => id) });
    expect(FOSSIL_DIG_MODE_OPTIONS.filter(({ id }) => isFossilDigModeEnabled(id, settings))).toEqual([]);
  });

  it("drops invalid and duplicate mode IDs", () => {
    expect(sanitizeLearningModeSettings({ isCvcEnabled: "false", disabledFossilDigModes: ["silent-e", "unknown", "silent-e"] }))
      .toEqual({ isCvcEnabled: true, disabledFossilDigModes: ["silent-e"] });
  });

  it("persists settings across reloads", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const settings = { isCvcEnabled: false, disabledFossilDigModes: ["vowel-teams"] as const };
    saveLearningModeSettings({ ...settings, disabledFossilDigModes: [...settings.disabledFossilDigModes] });
    expect(loadLearningModeSettings()).toEqual(settings);
  });

  it("uses safe defaults when saved settings are malformed", () => {
    vi.stubGlobal("localStorage", { getItem: () => "invalid JSON" });
    expect(loadLearningModeSettings()).toEqual({ isCvcEnabled: true, disabledFossilDigModes: [] });
  });
});
