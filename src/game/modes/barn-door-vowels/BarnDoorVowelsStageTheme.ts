import { getVowelById, getRandomVowel, type VowelId } from "../../data/letters";

export interface BarnDoorVowelsStageTheme {

  vowelId: VowelId;
}

export function createRandomBarnDoorVowelsStageTheme(): BarnDoorVowelsStageTheme {
  return {
    vowelId: getRandomVowel().id,
  };
}

export function resolveBarnDoorVowelsStageTheme(theme: BarnDoorVowelsStageTheme): {
  vowelName: string;
} {
  return {
    vowelName: getVowelById(theme.vowelId).name
  };
}
