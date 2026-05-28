const STORAGE_KEY = "molly-learning-game-cat-catch-settings";
export const MIN_YARN_FALL_SPEED = 6;
export const MAX_YARN_FALL_SPEED = 105;
export const MIN_CATCH_GOAL = 1;
export const MAX_CATCH_GOAL = 20;
const DEFAULT_MIN_YARN_FALL_SPEED = 24;
const DEFAULT_MAX_YARN_FALL_SPEED = 36;
const DEFAULT_CATCH_GOAL = 10;

export interface CatCatchSettings {
  minYarnFallSpeed: number;
  maxYarnFallSpeed: number;
  catchGoal: number;
}

export function getDefaultCatCatchSettings(): CatCatchSettings {
  return {
    minYarnFallSpeed: DEFAULT_MIN_YARN_FALL_SPEED,
    maxYarnFallSpeed: DEFAULT_MAX_YARN_FALL_SPEED,
    catchGoal: DEFAULT_CATCH_GOAL
  };
}

export function sanitizeCatCatchSettings(
  partial: Partial<CatCatchSettings> = {}
): CatCatchSettings {
  const defaults = getDefaultCatCatchSettings();
  const minYarnFallSpeed = clampSpeed(
    partial.minYarnFallSpeed ?? defaults.minYarnFallSpeed
  );
  const maxYarnFallSpeed = clampSpeed(
    partial.maxYarnFallSpeed ?? defaults.maxYarnFallSpeed
  );
  const catchGoal = clampCatchGoal(partial.catchGoal ?? defaults.catchGoal);

  return {
    minYarnFallSpeed: Math.min(minYarnFallSpeed, maxYarnFallSpeed),
    maxYarnFallSpeed: Math.max(minYarnFallSpeed, maxYarnFallSpeed),
    catchGoal
  };
}

export function loadCatCatchSettings(): CatCatchSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return getDefaultCatCatchSettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getDefaultCatCatchSettings();
    }

    return sanitizeCatCatchSettings(JSON.parse(raw) as Partial<CatCatchSettings>);
  } catch {
    return getDefaultCatCatchSettings();
  }
}

export function saveCatCatchSettings(
  settings: Partial<CatCatchSettings>
): CatCatchSettings {
  const sanitized = sanitizeCatCatchSettings(settings);

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }

  return sanitized;
}

function clampSpeed(value: number): number {
  return Math.max(
    MIN_YARN_FALL_SPEED,
    Math.min(MAX_YARN_FALL_SPEED, Math.round(value))
  );
}

function clampCatchGoal(value: number): number {
  return Math.max(
    MIN_CATCH_GOAL,
    Math.min(MAX_CATCH_GOAL, Math.round(value))
  );
}
