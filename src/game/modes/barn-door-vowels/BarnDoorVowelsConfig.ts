import { loadBarnDoorVowels } from "../../settings/barnDoorVowelsSettings";

export interface BarnDoorVowelsModeConfig {
  title: string;
  vowels: string[]
}

export function getBarnDoorVowelsModeConfig(
): BarnDoorVowelsModeConfig {
  const settings = loadBarnDoorVowels();

  return {
    title: "Barn Door: Vowels",
    vowels: settings.vowels
  };
}

