import { loadCatCatchSettings } from "../../settings/catCatchSettings";

export type LetterCatchVariant = "vowels" | "consonants";

export interface LetterCatchModeConfig {
  variant: LetterCatchVariant;
  title: string;
  catchGoal: number;
  playerSpeed: number;
  spawnIntervalMs: number;
  targetSpawnChance: number;
  minFallSpeed: number;
  maxFallSpeed: number;
  spawnMinX: number;
  spawnMaxX: number;
  spawnY: number;
  groundY: number;
}

export function getLetterCatchModeConfig(
  variant: LetterCatchVariant
): LetterCatchModeConfig {
  const settings = loadCatCatchSettings();

  return {
    variant,
    title:
      variant === "vowels" ? "Kitten Catch: Vowels" : "Kitten Catch: Consonants",
    catchGoal: settings.catchGoal,
    playerSpeed: 360,
    spawnIntervalMs: 1500,
    targetSpawnChance: 0.68,
    minFallSpeed: settings.minYarnFallSpeed,
    maxFallSpeed: settings.maxYarnFallSpeed,
    spawnMinX: 80,
    spawnMaxX: 1286,
    spawnY: 128,
    groundY: 738
  };
}
