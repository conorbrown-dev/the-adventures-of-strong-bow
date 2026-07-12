const STORAGE_KEY = "molly-learning-game-barn-door-vowels-settings";
const DEFAULT_VOWEL_GOAL = 10;
const WORD_FRAGMENTS = ['ga', 'be', 'i', 'mo', 'bu'];
const MAX_DEFAULT_VOWEL_GOAL = 20;

export interface BarnDoorVowelsSettings {
    wordFragments: string[]
    vowelGoal: number;
}

export function getDefaultBarnDoorVowelsSettings(): BarnDoorVowelsSettings {
    return {
        vowelGoal: DEFAULT_VOWEL_GOAL,
        wordFragments: WORD_FRAGMENTS
    };
}

export function sanitizeBarnDoorVowelsSettings(
    partial: Partial<BarnDoorVowelsSettings> = {}
): BarnDoorVowelsSettings {
    const defaults = getDefaultBarnDoorVowelsSettings();
    const vowelGoal = clampCatchGoal(partial.vowelGoal ?? defaults.vowelGoal);
    const wordFragments = defaults.wordFragments

    return {
        vowelGoal,
        wordFragments: wordFragments
    };
}

export function loadBarnDoorVowels(): BarnDoorVowelsSettings {
    if (typeof window === "undefined" || !window.localStorage) {
        return getDefaultBarnDoorVowelsSettings();
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return getDefaultBarnDoorVowelsSettings();
        }

        return sanitizeBarnDoorVowelsSettings(JSON.parse(raw) as Partial<BarnDoorVowelsSettings>);
    } catch {
        return getDefaultBarnDoorVowelsSettings();
    }
}

export function saveBarnDoorVowelsSettings(
    settings: Partial<BarnDoorVowelsSettings>
): BarnDoorVowelsSettings {
    const sanitized = sanitizeBarnDoorVowelsSettings(settings);

    if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
}

function clampCatchGoal(value: number): number {
    return Math.max(
        DEFAULT_VOWEL_GOAL,
        Math.min(MAX_DEFAULT_VOWEL_GOAL, Math.round(value))
    );
}
