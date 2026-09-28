export interface PhonicsChallenge {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctChoice: number;
  readonly teachingNote: string;
}

export interface PhonicsModule {
  readonly id: "short-vowels" | "silent-e" | "vowel-teams" | "consonant-digraphs";
  readonly title: string;
  readonly description: string;
  readonly challenges: readonly PhonicsChallenge[];
}

const SHORT_VOWEL_CHALLENGES: readonly PhonicsChallenge[] = [
  { prompt: "Which word has a short a sound?", choices: ["cap", "cape", "rain"], correctChoice: 0, teachingNote: "Cap has the short a sound." },
  { prompt: "Which word has a short o sound?", choices: ["rope", "boat", "hop"], correctChoice: 2, teachingNote: "Hop has the short o sound." },
  { prompt: "Which word has a short e sound?", choices: ["hen", "these", "team"], correctChoice: 0, teachingNote: "Hen has the short e sound." },
  { prompt: "Which word has a short a sound?", choices: ["map", "make", "mail"], correctChoice: 0, teachingNote: "Map has the short a sound." },
  { prompt: "Which word has a short e sound?", choices: ["bed", "bead", "beet"], correctChoice: 0, teachingNote: "Bed has the short e sound." },
  { prompt: "Which word has a short i sound?", choices: ["pig", "pie", "pine"], correctChoice: 0, teachingNote: "Pig has the short i sound." },
  { prompt: "Which word has a short o sound?", choices: ["dog", "doe", "boat"], correctChoice: 0, teachingNote: "Dog has the short o sound." },
  { prompt: "Which word has a short u sound?", choices: ["sun", "tune", "blue"], correctChoice: 0, teachingNote: "Sun has the short u sound." },
];

const SILENT_E_CHALLENGES: readonly PhonicsChallenge[] = [
  { prompt: "Which word has a long o because silent e changes the vowel?", choices: ["tot", "tote", "top"], correctChoice: 1, teachingNote: "The silent e makes the o in tote say its name." },
  { prompt: "Which word has a long i because of silent e?", choices: ["kit", "kite", "kick"], correctChoice: 1, teachingNote: "The silent e makes the i in kite say its name." },
  { prompt: "Which word has a long u because of silent e?", choices: ["tub", "tube", "tug"], correctChoice: 1, teachingNote: "The silent e makes the u in tube say its name." },
  { prompt: "Which word has a long a because silent e changes the vowel?", choices: ["cap", "cape", "camp"], correctChoice: 1, teachingNote: "The silent e makes the a in cape say its name." },
  { prompt: "Which word has a long e because of silent e?", choices: ["pet", "Pete", "pen"], correctChoice: 1, teachingNote: "The silent e makes the e in Pete say its name." },
  { prompt: "Which word has a long i because silent e changes the vowel?", choices: ["fin", "fine", "fit"], correctChoice: 1, teachingNote: "The silent e makes the i in fine say its name." },
  { prompt: "Which word has a long o because of silent e?", choices: ["hop", "hope", "hot"], correctChoice: 1, teachingNote: "The silent e makes the o in hope say its name." },
  { prompt: "Which word has a long u because silent e changes the vowel?", choices: ["cub", "cube", "cup"], correctChoice: 1, teachingNote: "The silent e makes the u in cube say its name." },
];

const VOWEL_TEAM_CHALLENGES: readonly PhonicsChallenge[] = [
  { prompt: "Which word has a long a vowel team?", choices: ["cat", "rain", "cake"], correctChoice: 1, teachingNote: "The ai in rain is a vowel team that says long a." },
  { prompt: "Which word has the vowel team ee?", choices: ["seed", "sled", "said"], correctChoice: 0, teachingNote: "The ee in seed works together to say long e." },
  { prompt: "Which word has the vowel team oa?", choices: ["coat", "cot", "cute"], correctChoice: 0, teachingNote: "The oa in coat works together to say long o." },
  { prompt: "Which word has the vowel team ai?", choices: ["train", "tan", "ten"], correctChoice: 0, teachingNote: "The ai in train works together to say long a." },
  { prompt: "Which word has the vowel team ay?", choices: ["play", "pal", "pill"], correctChoice: 0, teachingNote: "The ay in play works together to say long a." },
  { prompt: "Which word has the vowel team ea?", choices: ["team", "tam", "time"], correctChoice: 0, teachingNote: "The ea in team works together to say long e." },
  { prompt: "Which word has the vowel team ee?", choices: ["green", "grain", "grin"], correctChoice: 0, teachingNote: "The ee in green works together to say long e." },
  { prompt: "Which word has the vowel team oa?", choices: ["road", "rod", "red"], correctChoice: 0, teachingNote: "The oa in road works together to say long o." },
  { prompt: "Which word has the vowel team ow?", choices: ["snow", "saw", "sun"], correctChoice: 0, teachingNote: "The ow in snow works together to say long o." },
  { prompt: "Which vowel team completes r__n to make rain?", choices: ["ai", "ee", "oa"], correctChoice: 0, teachingNote: "Add ai to r and n to make rain." },
  { prompt: "Which vowel team completes b__t to make boat?", choices: ["oa", "ai", "ee"], correctChoice: 0, teachingNote: "Add oa to b and t to make boat." },
  { prompt: "Which vowel team completes s__d to make seed?", choices: ["ee", "oa", "ai"], correctChoice: 0, teachingNote: "Add ee to s and d to make seed." },
];

const CONSONANT_DIGRAPH_CHALLENGES: readonly PhonicsChallenge[] = [
  { prompt: "Which digraph makes the first sound in ship?", choices: ["sh", "si", "sp"], correctChoice: 0, teachingNote: "Sh is a consonant digraph: two letters make one sound." },
  { prompt: "Which digraph makes the first sound in chop?", choices: ["ch", "co", "cp"], correctChoice: 0, teachingNote: "Ch is a consonant digraph: two letters make one sound." },
  { prompt: "Which digraph makes the first sound in thin?", choices: ["th", "ti", "tn"], correctChoice: 0, teachingNote: "Th is a consonant digraph: two letters make one sound." },
  { prompt: "Which digraph makes the first sound in chat?", choices: ["ch", "ca", "ct"], correctChoice: 0, teachingNote: "Ch is a consonant digraph: two letters make one sound." },
  { prompt: "Which digraph makes the first sound in whale?", choices: ["wh", "wa", "wl"], correctChoice: 0, teachingNote: "Wh is a consonant digraph: two letters make one sound." },
  { prompt: "Which digraph makes the first sound in this?", choices: ["th", "ti", "ts"], correctChoice: 0, teachingNote: "Th is a consonant digraph: two letters make one sound." },
  { prompt: "Which letters make the ending sound in duck?", choices: ["ck", "dk", "dc"], correctChoice: 0, teachingNote: "Ck works together to make the k sound at the end of duck." },
  { prompt: "Which digraph makes the first sound in phone?", choices: ["ph", "po", "pn"], correctChoice: 0, teachingNote: "Ph is a consonant digraph that can say f." },
  { prompt: "Which letters complete fi__ to make fish?", choices: ["sh", "ch", "th"], correctChoice: 0, teachingNote: "Add sh to fi to make fish." },
];

export const PHONICS_MODULES: readonly PhonicsModule[] = [
  { id: "short-vowels", title: "Short Vowels", description: "Listen for the quick vowel sound in a word.", challenges: SHORT_VOWEL_CHALLENGES },
  { id: "silent-e", title: "Silent E", description: "Find the silent e that makes a vowel say its name.", challenges: SILENT_E_CHALLENGES },
  { id: "vowel-teams", title: "Vowel Teams", description: "Spot two vowels working together to make one sound.", challenges: VOWEL_TEAM_CHALLENGES },
  { id: "consonant-digraphs", title: "Consonant Digraphs", description: "Find two consonants working together to make one sound.", challenges: CONSONANT_DIGRAPH_CHALLENGES },
];

export const PHONICS_CHALLENGES: readonly PhonicsChallenge[] = PHONICS_MODULES.flatMap((module) => module.challenges);
