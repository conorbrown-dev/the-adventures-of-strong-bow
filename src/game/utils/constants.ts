export const GAME_WIDTH = 1366;
export const GAME_HEIGHT = 768;

export const HUD_HEIGHT = 128;
export const UNDERGROUND_TOP = 192;
export const DIG_CELL_SIZE = 96;
export const DIG_WORLD_COLS = 20;
export const DIG_WORLD_ROWS = 9;

export const DIG_PLAYER_SPEED = 260;
export const DIG_TILE_DURATION_MS = 1500;
export const CHASE_RUN_SPEED = 185;
export const CHASE_BOOST_SPEED = 225;
export const CHASE_JUMP_SPEED = 430;
export const CHASE_WORLD_WIDTH = 3400;
export const CHASE_FINISH_X = 3200;

export const COLORS = {
  SKY: 0xcfeeff,
  SURFACE: 0x67b449,
  DIRT: 0x8b5a2b,
  HUD_BG: 0x2b1a11,
  HUD_PANEL: 0xf6edd7,
  TEXT_DARK: "#2d1f14",
  TEXT_LIGHT: "#fff8e8",
  HIGHLIGHT: "#ffdc6b",
  GEM: 0x8b5cf6,
  BONE: 0xe8dcc3,
  ROCK: 0x6b7280
} as const;
