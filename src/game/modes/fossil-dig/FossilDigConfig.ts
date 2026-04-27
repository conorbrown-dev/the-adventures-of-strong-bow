import {
  DIG_CELL_SIZE,
  DIG_WORLD_COLS,
  DIG_WORLD_ROWS,
  UNDERGROUND_TOP
} from "../../utils/constants";

export type FossilDigVariant = "cvc" | "letters";

export interface FossilDigModeConfig {
  variant: FossilDigVariant;
  title: string;
  cellSize: number;
  undergroundTop: number;
  worldCols: number;
  worldRows: number;
}

export const FOSSIL_DIG_MODE_CONFIGS: Record<
  FossilDigVariant,
  FossilDigModeConfig
> = {
  cvc: {
    variant: "cvc",
    title: "Fossil Dig: CVC Words",
    cellSize: DIG_CELL_SIZE,
    undergroundTop: UNDERGROUND_TOP,
    worldCols: DIG_WORLD_COLS,
    worldRows: DIG_WORLD_ROWS
  },
  letters: {
    variant: "letters",
    title: "Fossil Dig: Vowels & Consonants",
    cellSize: DIG_CELL_SIZE,
    undergroundTop: UNDERGROUND_TOP,
    worldCols: DIG_WORLD_COLS,
    worldRows: DIG_WORLD_ROWS
  }
};
