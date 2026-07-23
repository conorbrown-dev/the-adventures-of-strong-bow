import { cvcWords } from "./cvcWords";

// Use the repository's existing, audio-backed word catalog rather than a
// separate hand-maintained list. This keeps sight-word practice aligned with
// the CVC content already used by the learning modes.
export const sightWords = [...new Set(cvcWords.map((word) => word.word))].sort();

export type SightWord = string;
