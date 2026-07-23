import { sightWords, type SightWord } from "../data/sightWords";

const SETTINGS_KEY = "molly-learning-sight-word-settings";
const STATS_KEY = "molly-learning-sight-word-stats";
export const RESPONSE_THRESHOLD_MS = 3500;
export const MASTERY_FAST_RESPONSES = 3;

export interface SightWordSettings { selectedWords: SightWord[]; }
export interface SightWordStats {
  testedCount: number;
  totalResponseMs: number;
  fastestResponseMs?: number;
  quickCorrectCount: number;
  mastered: boolean;
}
export type SightWordStatsMap = Partial<Record<SightWord, SightWordStats>>;

const defaultSettings: SightWordSettings = { selectedWords: ["the", "and", "said", "was", "can"] };

export function loadSightWordSettings(): SightWordSettings {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<SightWordSettings>;
    const selectedWords = (parsed.selectedWords ?? defaultSettings.selectedWords).filter((word): word is SightWord => sightWords.includes(word as typeof sightWords[number]));
    return { selectedWords: selectedWords.length ? selectedWords : [...defaultSettings.selectedWords] };
  } catch { return { ...defaultSettings }; }
}

export function saveSightWordSettings(settings: SightWordSettings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSightWordStats(): SightWordStatsMap {
  try { return JSON.parse(window.localStorage.getItem(STATS_KEY) ?? "{}") as SightWordStatsMap; }
  catch { return {}; }
}

export function recordSightWordAttempt(word: SightWord, responseMs: number, correct: boolean): SightWordStats {
  const stats = loadSightWordStats();
  const previous = stats[word] ?? { testedCount: 0, totalResponseMs: 0, quickCorrectCount: 0, mastered: false };
  const quickCorrectCount = correct && responseMs <= RESPONSE_THRESHOLD_MS
    ? previous.quickCorrectCount + 1
    : 0;
  const next: SightWordStats = {
    testedCount: previous.testedCount + 1,
    totalResponseMs: previous.totalResponseMs + responseMs,
    fastestResponseMs: previous.fastestResponseMs === undefined ? responseMs : Math.min(previous.fastestResponseMs, responseMs),
    quickCorrectCount,
    mastered: previous.mastered || quickCorrectCount >= MASTERY_FAST_RESPONSES
  };
  stats[word] = next;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return next;
}
