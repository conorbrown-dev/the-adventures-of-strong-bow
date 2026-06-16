import {
  CVC_DIG_SITE_WIDTH_BLOCKS,
  DIG_CELL_SIZE,
  DIG_WORLD_ROWS,
  UNDERGROUND_TOP
} from "../../utils/constants";
import { loadParentalSettings } from "../../settings/parentalSettings";

export interface FossilDigModeConfig {
  title: string;
  cellSize: number;
  undergroundTop: number;
  worldCols: number;
  worldRows: number;
  cvcSiteCount?: number;
  cvcPickupsPerSite?: number;
}

export function getFossilDigModeConfig(
): FossilDigModeConfig {
  const settings = loadParentalSettings();

  return {
    title: "Fossil Dig: CVC Words",
    cellSize: DIG_CELL_SIZE,
    undergroundTop: UNDERGROUND_TOP,
    worldCols: CVC_DIG_SITE_WIDTH_BLOCKS * settings.cvcDiggableAreaCount,
    worldRows: DIG_WORLD_ROWS,
    cvcSiteCount: settings.cvcDiggableAreaCount,
    cvcPickupsPerSite: settings.cvcFossilsPerArea
  };
}

