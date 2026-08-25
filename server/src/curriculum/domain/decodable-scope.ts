export interface DecodableScope {
  id: string;
  allowedGraphemes: readonly string[];
  regularWords: readonly string[];
  textOnlyWords: readonly string[];
  prohibitedPatterns: readonly string[];
}

export interface DecodabilityResult {
  valid: boolean;
  invalidWords: string[];
  prohibitedPatterns: string[];
}

function wordsIn(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

export function validateDecodableText(text: string, scope: DecodableScope): DecodabilityResult {
  const words = wordsIn(text);
  const allowedWords = new Set([...scope.regularWords, ...scope.textOnlyWords]);
  const invalidWords = [...new Set(words.filter((word) => !allowedWords.has(word)))];
  const normalized = text.toLowerCase();
  const prohibitedPatterns = scope.prohibitedPatterns.filter((pattern) => normalized.includes(pattern));
  return { valid: invalidWords.length === 0 && prohibitedPatterns.length === 0, invalidWords, prohibitedPatterns };
}

export function assertDecodableText(text: string, scope: DecodableScope): void {
  const result = validateDecodableText(text, scope);
  if (!result.valid) {
    const details = [...result.invalidWords.map((word) => `word:${word}`), ...result.prohibitedPatterns.map((pattern) => `pattern:${pattern}`)];
    throw new Error(`Text is outside ${scope.id}: ${details.join(", ")}.`);
  }
}
