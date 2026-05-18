export const GAME_WIDTH = 1366;
export const GAME_HEIGHT = 768;

export const HUD_HEIGHT = 84;
export const UNDERGROUND_TOP = GAME_HEIGHT;
export const DIG_CELL_SIZE = 96;
export const DIG_WORLD_COLS = 18;
export const DIG_WORLD_ROWS = 7;
export const CVC_DIG_SITE_WIDTH_BLOCKS = 12;
export const DIG_PROTECTED_FLOOR_ROWS = 2;
export const DIG_LAVA_ROWS = 1;
export const CVC_DIG_SITE_COUNT = 1;
export const CVC_CORRECT_FOSSIL_COUNT = 1;
export const CVC_SITE_PICKUP_COUNT = 1;

export const DIG_PLAYER_SPEED = 260;
export const DIG_TILE_DURATION_MS = 1500;
export const DIG_JUMP_HEIGHT_BLOCKS = 1.5;
export const DIG_JUMP_DISTANCE_BLOCKS = 1.5;
export const DIG_JUMP_DURATION_MS = 420;
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
