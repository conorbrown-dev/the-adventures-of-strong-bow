import { getDinoById, getRandomDino, type DinoId } from "../../data/dinos";
import { getJewelById, getRandomJewel, type JewelId } from "../../data/jewels";

export interface FossilDigStageTheme {
  dinoId: DinoId;
  jewelId: JewelId;
}

export function createRandomFossilDigStageTheme(): FossilDigStageTheme {
  return {
    dinoId: getRandomDino().id,
    jewelId: getRandomJewel().id
  };
}

export function resolveFossilDigStageTheme(theme: FossilDigStageTheme): {
  bossDinoName: string;
  jewelName: string;
} {
  return {
    bossDinoName: getDinoById(theme.dinoId).name,
    jewelName: getJewelById(theme.jewelId).name
  };
}
