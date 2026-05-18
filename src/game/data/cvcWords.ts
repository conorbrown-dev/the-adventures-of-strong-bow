export interface CvcWordData {
  word: string;
  displayText: string;
  difficulty: number;
  phonicsFocus?: string;
  voiceAssetKey: string;
}

export const cvcWords: CvcWordData[] = [
  {
    word: "cat",
    displayText: "cat",
    difficulty: 1,
    phonicsFocus: "short-a",
    voiceAssetKey: "voice-cvc-cat"
  },
  {
    word: "hop",
    displayText: "hop",
    difficulty: 1,
    phonicsFocus: "short-o",
    voiceAssetKey: "voice-cvc-hop"
  },
  {
    word: "tap",
    displayText: "tap",
    difficulty: 1,
    phonicsFocus: "short-a",
    voiceAssetKey: "voice-cvc-tap"
  },
  {
    word: "sun",
    displayText: "sun",
    difficulty: 1,
    phonicsFocus: "short-u",
    voiceAssetKey: "voice-cvc-sun"
  },
  {
    word: "dog",
    displayText: "dog",
    difficulty: 1,
    phonicsFocus: "short-o",
    voiceAssetKey: "voice-cvc-dog"
  },
  {
    word: "bug",
    displayText: "bug",
    difficulty: 1,
    phonicsFocus: "short-u",
    voiceAssetKey: "voice-cvc-bug"
  }
];

const cvcWordVoiceKeyMap = new Map(
  cvcWords.flatMap((item) => [
    [item.word.toLowerCase(), item.voiceAssetKey],
    [item.displayText.toLowerCase(), item.voiceAssetKey]
  ])
);

export function getCvcVoiceAssetKey(word: string): string | undefined {
  return cvcWordVoiceKeyMap.get(word.toLowerCase());
}
