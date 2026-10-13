import { getFossilDigModuleDefinition, type FossilDigModuleId } from "../modes/fossil-dig/FossilDigContent";
import type { PhonicsModule } from "../data/phonicsChallenges";

const STORAGE_KEY = "molly-learning-game-learning-modes";
export const FOSSIL_DIG_MODE_OPTIONS: readonly { id: FossilDigModuleId; label: string }[] = [
  { id: "cvc", label: "CVC Words" },
  { id: "short-vowels", label: "Short Vowels" },
  { id: "silent-e", label: "Silent E" },
  { id: "vowel-teams", label: "Vowel Teams" },
  { id: "consonant-digraphs", label: "Consonant Digraphs" },
];

export interface LearningModeSettings {
  isCvcEnabled: boolean;
  disabledFossilDigModes: FossilDigModuleId[];
}

export function sanitizeLearningModeSettings(value: unknown): LearningModeSettings {
  const candidate = value && typeof value === "object" ? value as Partial<LearningModeSettings> : {};
  const disabled = Array.isArray(candidate.disabledFossilDigModes) ? candidate.disabledFossilDigModes : [];
  return {
    isCvcEnabled: candidate.isCvcEnabled !== false,
    disabledFossilDigModes: FOSSIL_DIG_MODE_OPTIONS.filter(({ id }) => disabled.includes(id)).map(({ id }) => id),
  };
}

export function loadLearningModeSettings(): LearningModeSettings {
  try {
    return sanitizeLearningModeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return sanitizeLearningModeSettings(null);
  }
}

export function saveLearningModeSettings(settings: LearningModeSettings): LearningModeSettings {
  const sanitized = sanitizeLearningModeSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

function isCvcWord(word: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(word);
}

export function isFossilDigModeEnabled(moduleId: FossilDigModuleId, settings = loadLearningModeSettings()): boolean {
  if (settings.disabledFossilDigModes.includes(moduleId)) return false;
  return settings.isCvcEnabled || getFossilDigModuleDefinition(moduleId).targetWords.some((word) => !isCvcWord(word));
}

export function isPhonicsModuleEnabled(module: PhonicsModule, settings = loadLearningModeSettings()): boolean {
  return settings.isCvcEnabled || module.challenges.some((challenge) => !isCvcWord(challenge.choices[challenge.correctChoice]!));
}
