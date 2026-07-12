import { loadBarnDoorVowels } from "../../settings/barnDoorVowelsSettings";

export interface BarnDoorVowelsModeConfig {
  title: string;
  wordFragments: string[];
  vowelGoal: number;
}

export function getBarnDoorVowelsModeConfig(
): BarnDoorVowelsModeConfig {
  const settings = loadBarnDoorVowels();

  return {
    title: "Barn Door: Open & Closed Vowels",
    wordFragments: settings.wordFragments,
    vowelGoal: settings.vowelGoal
  };
}

