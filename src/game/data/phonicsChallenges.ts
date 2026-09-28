export interface PhonicsChallenge {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctChoice: number;
  readonly teachingNote: string;
}

export const PHONICS_CHALLENGES: readonly PhonicsChallenge[] = [
  { prompt: "Which word has a long o because silent e changes the vowel?", choices: ["tot", "tote", "top"], correctChoice: 1, teachingNote: "The silent e makes the o in tote say its name." },
  { prompt: "Which word has a short a sound?", choices: ["cap", "cape", "rain"], correctChoice: 0, teachingNote: "Cap has the short a sound." },
  { prompt: "Which word has a long a vowel team?", choices: ["cat", "rain", "cake"], correctChoice: 1, teachingNote: "The ai in rain is a vowel team that says long a." },
  { prompt: "Which digraph makes the first sound in ship?", choices: ["sh", "si", "sp"], correctChoice: 0, teachingNote: "Sh is a consonant digraph: two letters make one sound." },
  { prompt: "Which word has a long i because of silent e?", choices: ["kit", "kite", "kick"], correctChoice: 1, teachingNote: "The silent e makes the i in kite say its name." },
  { prompt: "Which word has a short o sound?", choices: ["rope", "boat", "hop"], correctChoice: 2, teachingNote: "Hop has the short o sound." },
  { prompt: "Which word has the vowel team ee?", choices: ["seed", "sled", "said"], correctChoice: 0, teachingNote: "The ee in seed works together to say long e." },
  { prompt: "Which digraph makes the first sound in chop?", choices: ["ch", "co", "cp"], correctChoice: 0, teachingNote: "Ch is a consonant digraph: two letters make one sound." },
  { prompt: "Which word has a long u because of silent e?", choices: ["tub", "tube", "tug"], correctChoice: 1, teachingNote: "The silent e makes the u in tube say its name." },
  { prompt: "Which word has the vowel team oa?", choices: ["coat", "cot", "cute"], correctChoice: 0, teachingNote: "The oa in coat works together to say long o." },
  { prompt: "Which word has a short e sound?", choices: ["hen", "these", "team"], correctChoice: 0, teachingNote: "Hen has the short e sound." },
  { prompt: "Which digraph makes the first sound in thin?", choices: ["th", "ti", "tn"], correctChoice: 0, teachingNote: "Th is a consonant digraph: two letters make one sound." }
];
