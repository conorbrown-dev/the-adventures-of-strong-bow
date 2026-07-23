export const sightWords = [
  "a", "and", "are", "come", "go", "he", "here", "is", "like", "my",
  "of", "said", "see", "she", "the", "they", "to", "was", "we", "you"
] as const;

export type SightWord = typeof sightWords[number];
