export interface CvcWordData {
  word: string;
  displayText: string;
  difficulty: number;
  phonicsFocus?: string;
}

export const cvcWords: CvcWordData[] = [
  { word: "cat", displayText: "cat", difficulty: 1, phonicsFocus: "short-a" },
  { word: "hop", displayText: "hop", difficulty: 1, phonicsFocus: "short-o" },
  { word: "tap", displayText: "tap", difficulty: 1, phonicsFocus: "short-a" },
  { word: "sun", displayText: "sun", difficulty: 1, phonicsFocus: "short-u" },
  { word: "dog", displayText: "dog", difficulty: 1, phonicsFocus: "short-o" },
  { word: "bug", displayText: "bug", difficulty: 1, phonicsFocus: "short-u" }
];
