import { cvcWords } from "../data/cvcWords";
import {
  CVC_DIG_SITE_COUNT,
  CVC_SITE_PICKUP_COUNT
} from "../utils/constants";

const STORAGE_KEY = "molly-learning-game-parental-settings";
const MIN_DIGGABLE_AREAS = 1;
const MAX_DIGGABLE_AREAS = 3;
const MIN_FOSSILS_PER_AREA = 1;
const MAX_FOSSILS_PER_AREA = Math.min(6, cvcWords.length);
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;
const DEFAULT_BGM_VOLUME = 0.78;
const DEFAULT_SFX_VOLUME = 1;

export interface ParentalSettings {
  cvcDiggableAreaCount: number;
  cvcFossilsPerArea: number;
  bgmVolume: number;
  sfxVolume: number;
}

export function getDefaultParentalSettings(): ParentalSettings {
  return {
    cvcDiggableAreaCount: CVC_DIG_SITE_COUNT,
    cvcFossilsPerArea: CVC_SITE_PICKUP_COUNT,
    bgmVolume: DEFAULT_BGM_VOLUME,
    sfxVolume: DEFAULT_SFX_VOLUME
  };
}

export function sanitizeParentalSettings(
  partial: Partial<ParentalSettings> = {}
): ParentalSettings {
  const defaults = getDefaultParentalSettings();

  return {
    cvcDiggableAreaCount: clampSetting(
      partial.cvcDiggableAreaCount ?? defaults.cvcDiggableAreaCount,
      MIN_DIGGABLE_AREAS,
      MAX_DIGGABLE_AREAS
    ),
    cvcFossilsPerArea: clampSetting(
      partial.cvcFossilsPerArea ?? defaults.cvcFossilsPerArea,
      MIN_FOSSILS_PER_AREA,
      MAX_FOSSILS_PER_AREA
    ),
    bgmVolume: clampVolumeSetting(
      partial.bgmVolume ?? defaults.bgmVolume
    ),
    sfxVolume: clampVolumeSetting(
      partial.sfxVolume ?? defaults.sfxVolume
    )
  };
}

export function loadParentalSettings(): ParentalSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return getDefaultParentalSettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getDefaultParentalSettings();
    }

    return sanitizeParentalSettings(
      JSON.parse(raw) as Partial<ParentalSettings>
    );
  } catch {
    return getDefaultParentalSettings();
  }
}

export function saveParentalSettings(
  settings: Partial<ParentalSettings>
): ParentalSettings {
  const sanitized = sanitizeParentalSettings(settings);

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }

  return sanitized;
}

export function getCvcConfiguredTargetCount(
  availableWordCount: number,
  settings = loadParentalSettings()
): number {
  if (settings.cvcDiggableAreaCount === 1) {
    return Math.min(settings.cvcFossilsPerArea, availableWordCount);
  }

  return Math.min(settings.cvcDiggableAreaCount, availableWordCount);
}

export function getConfiguredBgmVolume(
  settings = loadParentalSettings()
): number {
  return settings.bgmVolume;
}

export function getConfiguredSfxVolume(
  settings = loadParentalSettings()
): number {
  return settings.sfxVolume;
}

function clampSetting(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampVolumeSetting(value: number): number {
  return Math.round(Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, value)) * 100) / 100;
}
