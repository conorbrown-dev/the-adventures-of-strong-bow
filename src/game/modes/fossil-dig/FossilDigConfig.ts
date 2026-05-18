import {
  CVC_DIG_SITE_WIDTH_BLOCKS,
  DIG_CELL_SIZE,
  DIG_WORLD_COLS,
  DIG_WORLD_ROWS,
  UNDERGROUND_TOP
} from "../../utils/constants";
import { loadParentalSettings } from "../../settings/parentalSettings";

export type FossilDigVariant = "cvc" | "letters";

export interface FossilDigModeConfig {
  variant: FossilDigVariant;
  title: string;
  cellSize: number;
  undergroundTop: number;
  worldCols: number;
  worldRows: number;
  cvcSiteCount?: number;
  cvcPickupsPerSite?: number;
}

export function getFossilDigModeConfig(
  variant: FossilDigVariant
): FossilDigModeConfig {
  if (variant === "cvc") {
    const settings = loadParentalSettings();

    return {
      variant: "cvc",
      title: "Fossil Dig: CVC Words",
      cellSize: DIG_CELL_SIZE,
      undergroundTop: UNDERGROUND_TOP,
      worldCols: CVC_DIG_SITE_WIDTH_BLOCKS * settings.cvcDiggableAreaCount,
      worldRows: DIG_WORLD_ROWS,
      cvcSiteCount: settings.cvcDiggableAreaCount,
      cvcPickupsPerSite: settings.cvcFossilsPerArea
    };
  }

  return {
    variant: "letters",
    title: "Fossil Dig: Vowels & Consonants",
    cellSize: DIG_CELL_SIZE,
    undergroundTop: UNDERGROUND_TOP,
    worldCols: DIG_WORLD_COLS,
    worldRows: DIG_WORLD_ROWS
  };
}
