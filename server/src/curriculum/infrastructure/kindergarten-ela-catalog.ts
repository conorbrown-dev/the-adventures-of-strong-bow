import type { DecodableScope } from "../domain/decodable-scope";
import type { ActivityPurpose, ElaSkillDefinition, EvidenceMode, SkillMasteryPolicy } from "../domain/ela-skill";
import type { LearningActivityDefinition, LessonChoice, LessonPresentation, LessonRecipeDefinition, LessonRecipeId, MisconceptionTag } from "../domain/learning-activity";

const REVIEW = {
  status: "validated" as const,
  reviewer: "Stage 3 internal vertical-slice validation",
  reviewedAt: "2026-08-25",
  notes: "Internal/test content pending qualified curriculum and phoneme-audio review before production rollout.",
};

const PURPOSES: readonly ActivityPurpose[] = [
  "INSTRUCTION",
  "MODELED_EXAMPLE",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "REVIEW",
];

export const KINDERGARTEN_SESSION_ACTIVITY_LIMIT = 10;
export const KINDERGARTEN_ACTIVITY_EXCLUSION_WINDOW = 20;

export const KINDERGARTEN_LESSON_RECIPES: readonly LessonRecipeDefinition[] = [
  { id: "ela.auditory-contrast.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD"], supportedPurposes: PURPOSES },
  { id: "ela.symbol-sound.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD"], supportedPurposes: PURPOSES },
  { id: "ela.phoneme-sequence.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD", "CARD_WORKSPACE"], supportedPurposes: PURPOSES },
  { id: "ela.word-mapping.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD", "CARD_WORKSPACE"], supportedPurposes: PURPOSES },
  { id: "ela.print-feature.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD"], supportedPurposes: PURPOSES },
  { id: "ela.controlled-sentence.v1", version: 1, supportedPresentationKinds: ["TUTOR_MESSAGE", "CHOICE_BOARD", "CONTROLLED_TEXT"], supportedPurposes: PURPOSES },
];

export const SHORT_A_SCOPE: DecodableScope = {
  id: "ela.scope.k.short-a.initial-set",
  allowedGraphemes: ["m", "s", "t", "p", "n", "c", "a"],
  regularWords: ["am", "at", "sat", "mat", "map", "tap", "pat", "pan", "man", "can", "cat", "nap"],
  textOnlyWords: ["sam"],
  prohibitedPatterns: ["ai", "ay", "igh", "silent-e", "ch", "sh", "th", "ee", "oa", "ar"],
};

export const KINDERGARTEN_MASTERY_POLICY: SkillMasteryPolicy = {
  id: "ela.mastery.k-foundations.v1",
  guidedSuccessfulExamples: 2,
  independentSuccessfulExamples: 2,
  masterySuccessfulExamples: 2,
  maximumMasteryAttempts: 3,
  masteryPermittedEvidenceModes: ["SPOKEN_ONLY", "LISTENING", "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", "INDEPENDENT_READING"],
};

function mappings(oklahoma: string, commonCore: string) {
  return [
    { standardId: oklahoma, framework: "OKLAHOMA" as const, relationship: "PRIMARY" as const },
    { standardId: commonCore, framework: "COMMON_CORE" as const, relationship: "SUPPORTING" as const },
  ];
}

function skill(
  id: string,
  name: string,
  domain: string,
  competency: string,
  prerequisites: readonly string[],
  sequenceRank: number,
  importance: ElaSkillDefinition["importance"],
  standards: ReturnType<typeof mappings>,
  delivery: ElaSkillDefinition["delivery"],
  contentScopeId?: string,
): ElaSkillDefinition {
  return {
    id,
    version: 1,
    name,
    domain,
    competency,
    prerequisiteSkillIds: prerequisites,
    sequenceRank,
    importance,
    standardMappings: standards,
    masteryPolicyId: KINDERGARTEN_MASTERY_POLICY.id,
    contentScopeId,
    allowedPurposes: PURPOSES,
    delivery,
    review: REVIEW,
  };
}

const SPOKEN = { independentReading: "NONE" as const, audio: "REQUIRED" as const };
const VISUAL = { independentReading: "NONE" as const, audio: "REQUIRED" as const };
const READING = { independentReading: "REQUIRED" as const, audio: "SUPPORTED" as const };

export const KINDERGARTEN_ELA_SKILLS: readonly ElaSkillDefinition[] = [
  skill("ela.pa.word-awareness", "Hear words in a sentence", "Sound awareness", "Spoken word awareness", [], 10, "FOUNDATIONAL", mappings("K.2.PA.1", "K.RF.2"), SPOKEN),
  skill("ela.listen.literal.short-a", "Understand a sentence you hear", "Listening comprehension", "Literal listening", ["ela.pa.word-awareness"], 15, "CORE", mappings("K.2.R.1", "K.SL.2"), SPOKEN),
  skill("ela.pa.isolate.initial.set-1", "Hear the first sound", "Sound awareness", "Phoneme isolation", ["ela.pa.word-awareness"], 20, "FOUNDATIONAL", mappings("K.2.PA.3", "K.RF.2.d"), SPOKEN),
  skill("ela.pa.isolate.final.set-1", "Hear the last sound", "Sound awareness", "Phoneme isolation", ["ela.pa.isolate.initial.set-1"], 25, "FOUNDATIONAL", mappings("K.2.PA.3", "K.RF.2.d"), SPOKEN),
  skill("ela.pa.phoneme-blend.three", "Blend three sounds", "Sound awareness", "Phoneme blending", ["ela.pa.isolate.final.set-1"], 30, "FOUNDATIONAL", mappings("K.2.PA.6", "K.RF.2.b"), SPOKEN),
  skill("ela.pa.phoneme-segment.three", "Stretch a word into three sounds", "Sound awareness", "Phoneme segmentation", ["ela.pa.phoneme-blend.three"], 40, "FOUNDATIONAL", mappings("K.2.PA.7", "K.RF.2.d"), SPOKEN),
  skill("ela.alphabet.letter-vs-symbol", "Tell letters from other symbols", "Alphabet knowledge", "Letter identity", [], 50, "FOUNDATIONAL", mappings("K.2.PC.4", "K.RF.1.d"), VISUAL),
  skill("ela.alphabet.lowercase.set-1", "Know lowercase m, s, t, p, n, c, a", "Alphabet knowledge", "Letter identity", ["ela.alphabet.letter-vs-symbol"], 60, "FOUNDATIONAL", mappings("K.2.PWS.1", "K.RF.1.d"), VISUAL),
  skill("ela.alphabet.case-match.set-1", "Match capital and lowercase letters", "Alphabet knowledge", "Letter case", ["ela.alphabet.lowercase.set-1"], 70, "FOUNDATIONAL", mappings("K.2.PWS.1", "K.RF.1.d"), VISUAL),
  skill("ela.phonics.consonant-sounds.set-1", "Connect consonants to sounds", "Phonics", "Letter-sound correspondence", ["ela.alphabet.case-match.set-1"], 80, "FOUNDATIONAL", mappings("K.2.PWS.3", "K.RF.3.a"), VISUAL),
  skill("ela.phonics.vowel.identity", "Know that a is a vowel", "Phonics", "Vowel identity", ["ela.alphabet.lowercase.set-1"], 90, "FOUNDATIONAL", mappings("K.2.PWS.3", "K.RF.3.b"), VISUAL),
  skill("ela.phonics.vowel.short-a", "Hear short a", "Phonics", "Short-vowel sound", ["ela.phonics.vowel.identity"], 100, "FOUNDATIONAL", mappings("K.2.PWS.3", "K.RF.3.b"), SPOKEN),
  skill("ela.pa.isolate.medial.short-a", "Hear short a in the middle", "Sound awareness", "Medial phoneme isolation", ["ela.phonics.vowel.short-a", "ela.pa.isolate.initial.set-1"], 110, "FOUNDATIONAL", mappings("K.2.PA.3", "K.RF.2.d"), SPOKEN),
  skill("ela.phonics.cvc.decode.short-a", "Read short-a words", "Phonics", "CVC decoding", ["ela.alphabet.lowercase.set-1", "ela.phonics.consonant-sounds.set-1", "ela.phonics.vowel.short-a", "ela.pa.phoneme-blend.three"], 120, "FOUNDATIONAL", mappings("K.2.PWS.4", "K.RF.3.a"), READING, SHORT_A_SCOPE.id),
  skill("ela.encoding.cvc.short-a", "Build short-a words", "Encoding", "CVC encoding", ["ela.phonics.consonant-sounds.set-1", "ela.phonics.vowel.short-a", "ela.pa.phoneme-segment.three"], 130, "CORE", mappings("K.2.SE.2", "K.L.2.d"), VISUAL, SHORT_A_SCOPE.id),
  skill("ela.print.direction.left-to-right", "Follow print from left to right", "Print concepts", "Directionality", [], 140, "SUPPORTING", mappings("K.2.PC.3", "K.RF.1.a"), VISUAL),
  skill("ela.print.word-boundaries-spacing", "Notice spaces between words", "Print concepts", "Word boundaries", ["ela.print.direction.left-to-right"], 150, "CORE", mappings("K.2.PC.4", "K.RF.1.c"), VISUAL),
  skill("ela.print.sentence-features", "Notice a capital and an end mark", "Print concepts", "Sentence features", ["ela.print.word-boundaries-spacing"], 160, "CORE", mappings("K.2.PC.5", "K.RF.1.b"), VISUAL),
  skill("ela.text.sentence.short-a", "Read a short-a sentence", "Decodable text", "Controlled sentence reading", ["ela.phonics.cvc.decode.short-a", "ela.print.direction.left-to-right", "ela.print.word-boundaries-spacing", "ela.print.sentence-features"], 170, "FOUNDATIONAL", mappings("K.2.F.1", "K.RF.4"), READING, SHORT_A_SCOPE.id),
  skill("ela.read.literal.short-a", "Understand a sentence you read", "Reading comprehension", "Literal reading", ["ela.text.sentence.short-a"], 180, "CORE", mappings("K.2.R.1", "K.RL.1"), READING, SHORT_A_SCOPE.id),
];

interface ExampleSpec {
  id: string;
  prompt: string;
  narration: string;
  presentation: LessonPresentation;
  answer: unknown;
  explanation: string;
  conceptDomain?: string;
}

interface SkillContentSpec {
  skillId: string;
  recipeId: LessonRecipeId;
  instruction: { prompt: string; narration: string; tutorMessage: string; displayTokens?: readonly string[] };
  model: { prompt: string; narration: string; tutorMessage: string; modelText: string; displayTokens?: readonly string[]; audioCueIds?: readonly string[] };
  guided: readonly ExampleSpec[];
  independent: readonly ExampleSpec[];
  mastery: readonly ExampleSpec[];
  evidenceMode: EvidenceMode;
  independentEvidenceMode?: EvidenceMode;
}

function choice(id: string, label: string, conceptDomain: string, visual?: string, audioText?: string, misconception?: MisconceptionTag): LessonChoice {
  return { id, label, conceptDomain, ...(visual ? { visual } : {}), ...(audioText ? { audioText } : {}), ...(misconception ? { misconception } : {}) };
}

function choose(id: string, prompt: string, narration: string, answer: string, choices: readonly LessonChoice[], explanation: string, conceptDomain: string, audioCueIds?: readonly string[]): ExampleSpec {
  const taggedChoices = choices.map((option) => option.id === answer || option.misconception ? option : { ...option, misconception: "UNCLASSIFIED" as const });
  return { id, prompt, narration, answer, explanation, conceptDomain, presentation: { kind: "CHOICE_BOARD", choices: taggedChoices, ...(audioCueIds ? { audioCueIds } : {}) } };
}

function cards(id: string, prompt: string, narration: string, word: string, shuffled: readonly string[]): ExampleSpec {
  return { id, prompt, narration, answer: [...word], explanation: `You put the sounds in order to build ${word}.`, conceptDomain: "short-a-word", presentation: { kind: "CARD_WORKSPACE", cards: shuffled, slots: word.length, wordAudioText: word } };
}

function controlled(id: string, prompt: string, narration: string, answer: string, choices: readonly LessonChoice[]): ExampleSpec {
  const literalChoices = choices.map((option) => ({ ...option, conceptDomain: "literal-sentence" }));
  return { id, prompt, narration, answer, explanation: "You used the words in the sentence to find the matching idea.", conceptDomain: "literal-sentence", presentation: { kind: "CONTROLLED_TEXT", text: "Sam sat.", choices: literalChoices, helpNarration: "Sam sat." } };
}

function simpleChoice(id: string, prompt: string, answer: string, labels: readonly string[], domain: string, visuals: readonly string[] = [], narration = prompt): ExampleSpec {
  const choices = labels.map((label, index) => choice(label, label, domain, visuals[index], label, label === answer ? undefined : "UNCLASSIFIED"));
  return choose(id, prompt, narration, answer, choices, `The answer is ${answer}.`, domain);
}

const numberChoices = [choice("one", "1", "word-count"), choice("two", "2", "word-count"), choice("three", "3", "word-count")];
const soundCountChoices = [choice("two", "2", "sound-count"), choice("three", "3", "sound-count"), choice("four", "4", "sound-count")];
const satPictures = [choice("sat", "Sam is sitting", "sentence-picture", "🧒🪑", "Sam is sitting"), choice("ran", "Sam is running", "sentence-picture", "🏃", "Sam is running", "LITERAL_DETAIL_CONFUSION"), choice("nap", "Sam is napping", "sentence-picture", "🛏️", "Sam is napping", "LITERAL_DETAIL_CONFUSION")];

const SPECS: readonly SkillContentSpec[] = [
  {
    skillId: "ela.pa.word-awareness", recipeId: "ela.auditory-contrast.v1", evidenceMode: "SPOKEN_ONLY",
    instruction: { prompt: "Words are the little parts we say in a sentence.", narration: "Words are the little parts we say in a sentence. Listen. Sam sat. I said two words.", tutorMessage: "We can listen for each word." },
    model: { prompt: "Listen as I count: Sam … sat.", narration: "Sam. Sat. One, two. The sentence has two words.", tutorMessage: "I pause once for each word.", modelText: "Sam   sat", displayTokens: ["Sam", "sat"] },
    guided: [
      choose("sam-sat", "How many words do you hear? Sam sat.", "How many words do you hear? Sam sat.", "two", numberChoices, "Sam sat has two spoken words.", "word-count"),
      choose("cats-nap", "How many words do you hear? Cats nap.", "How many words do you hear? Cats nap.", "two", numberChoices, "Cats nap has two spoken words.", "word-count"),
    ],
    independent: [
      choose("dogs-run", "How many words do you hear? Dogs run.", "How many words do you hear? Dogs run.", "two", numberChoices, "Dogs run has two spoken words.", "word-count"),
      choose("molly-can-hop", "How many words do you hear? Molly can hop.", "How many words do you hear? Molly can hop.", "three", numberChoices, "Molly can hop has three spoken words.", "word-count"),
      choose("birds-fly", "How many words do you hear? Birds fly.", "How many words do you hear? Birds fly.", "two", numberChoices, "Birds fly has two spoken words.", "word-count"),
    ],
    mastery: [
      choose("fish-swim", "How many words do you hear? Fish swim.", "How many words do you hear? Fish swim.", "two", numberChoices, "Fish swim has two spoken words.", "word-count"),
      choose("a-cat-naps", "How many words do you hear? A cat naps.", "How many words do you hear? A cat naps.", "three", numberChoices, "A cat naps has three spoken words.", "word-count"),
      choose("kids-play", "How many words do you hear? Kids play.", "How many words do you hear? Kids play.", "two", numberChoices, "Kids play has two spoken words.", "word-count"),
    ],
  },
  {
    skillId: "ela.listen.literal.short-a", recipeId: "ela.controlled-sentence.v1", evidenceMode: "LISTENING",
    instruction: { prompt: "When we listen, the words tell us what happened.", narration: "When we listen, the words tell us what happened. You do not need to read this activity.", tutorMessage: "Listen for one important detail." },
    model: { prompt: "Listen: Sam sat. The sentence tells me Sam is sitting.", narration: "Sam sat. I heard the word sat, so I choose the sitting picture.", tutorMessage: "I use the words I hear.", modelText: "Listen only", displayTokens: ["👂", "🧒🪑"] },
    guided: [choose("listen-sat-1", "Listen, then choose the matching picture.", "Sam sat. Choose the matching picture.", "sat", satPictures, "The sentence says Sam sat.", "sentence-picture"), choose("listen-sat-2", "What did Sam do?", "Sam sat. What did Sam do?", "sat", satPictures, "Sam sat down.", "sentence-picture")],
    independent: [choose("listen-sat-3", "Choose what happened.", "Sam sat. Choose what happened.", "sat", satPictures, "Sam sat.", "sentence-picture"), choose("listen-sat-4", "Which picture matches the sentence?", "Sam sat. Which picture matches the sentence?", "sat", satPictures, "The sitting picture matches.", "sentence-picture"), choose("listen-sat-5", "Listen for the action.", "Sam sat. Choose Sam's action.", "sat", satPictures, "Sat is the action.", "sentence-picture")],
    mastery: [choose("listen-sat-6", "Choose the matching action.", "Sam sat. Choose the matching action.", "sat", satPictures, "Sam is sitting.", "sentence-picture"), choose("listen-sat-7", "What happened in the sentence?", "Sam sat. What happened?", "sat", satPictures, "Sam sat.", "sentence-picture"), choose("listen-sat-8", "Choose the detail you heard.", "Sam sat. Choose the detail you heard.", "sat", satPictures, "You heard that Sam sat.", "sentence-picture")],
  },
  {
    skillId: "ela.pa.isolate.initial.set-1", recipeId: "ela.auditory-contrast.v1", evidenceMode: "SPOKEN_ONLY",
    instruction: { prompt: "The first sound is the sound at the start of a word.", narration: "The first sound is the sound at the start of a word. Listen to the start of map: mmmmap.", tutorMessage: "Stretch the start of the word." },
    model: { prompt: "Map and man begin the same way.", narration: "Map. Man. Both begin with the same first sound.", tutorMessage: "I listen before I look at letters.", modelText: "map · man", displayTokens: ["🗺️", "👨"] },
    guided: [choose("map-match", "Which word begins like map?", "Listen. Map. Which word begins like map? Man. Sat.", "man", [choice("man", "man", "initial-m", "👨", "man"), choice("sat", "sat", "initial-m", "🪑", "sat", "CONSONANT_CONTRAST_CONFUSION")], "Map and man have the same first sound.", "initial-m"), choose("sat-match", "Which word begins like sat?", "Listen. Sat. Which word begins like sat? Sam. Map.", "sam", [choice("sam", "Sam", "initial-s", "🧒", "Sam"), choice("map", "map", "initial-s", "🗺️", "map", "CONSONANT_CONTRAST_CONFUSION")], "Sat and Sam have the same first sound.", "initial-s")],
    independent: [choose("tap-match", "Which word begins like tap?", "Tap. Choose the word that begins like tap. Top. Map.", "top", [choice("top", "top", "initial-t", "🔝", "top"), choice("map", "map", "initial-t", "🗺️", "map", "CONSONANT_CONTRAST_CONFUSION")], "Tap and top begin alike.", "initial-t"), choose("nap-match", "Which word begins like nap?", "Nap. Choose the word that begins like nap. Net. Cat.", "net", [choice("net", "net", "initial-n", "🥅", "net"), choice("cat", "cat", "initial-n", "🐈", "cat", "CONSONANT_CONTRAST_CONFUSION")], "Nap and net begin alike.", "initial-n"), choose("cat-match", "Which word begins like cat?", "Cat. Choose the word that begins like cat. Cup. Pan.", "cup", [choice("cup", "cup", "initial-c", "🥤", "cup"), choice("pan", "pan", "initial-c", "🍳", "pan", "CONSONANT_CONTRAST_CONFUSION")], "Cat and cup begin alike.", "initial-c")],
    mastery: [choose("man-match", "Which word begins like man?", "Man. Moon. Sat. Which begins like man?", "moon", [choice("moon", "moon", "initial-m", "🌙", "moon"), choice("sat", "sat", "initial-m", "🪑", "sat", "CONSONANT_CONTRAST_CONFUSION")], "Man and moon begin alike.", "initial-m"), choose("pan-match", "Which word begins like pan?", "Pan. Pig. Cat. Which begins like pan?", "pig", [choice("pig", "pig", "initial-p", "🐖", "pig"), choice("cat", "cat", "initial-p", "🐈", "cat", "CONSONANT_CONTRAST_CONFUSION")], "Pan and pig begin alike.", "initial-p"), choose("sun-match", "Which word begins like sun?", "Sun. Sock. Map. Which begins like sun?", "sock", [choice("sock", "sock", "initial-s", "🧦", "sock"), choice("map", "map", "initial-s", "🗺️", "map", "CONSONANT_CONTRAST_CONFUSION")], "Sun and sock begin alike.", "initial-s")],
  },
  finalSoundSpec(),
  phonemeBlendSpec(),
  phonemeSegmentSpec(),
  letterVsSymbolSpec(),
  lowercaseSpec(),
  caseMatchSpec(),
  consonantSoundSpec(),
  vowelIdentitySpec(),
  shortASpec(),
  medialShortASpec(),
  decodeSpec(),
  encodeSpec(),
  printDirectionSpec(),
  wordSpacingSpec(),
  sentenceFeaturesSpec(),
  controlledSentenceSpec(),
  literalReadingSpec(),
];

function finalSoundSpec(): SkillContentSpec {
  const item = (id: string, target: string, answer: string, other: string, answerVisual: string, otherVisual: string) => choose(
    id,
    `Which word ends like ${target}?`,
    `Listen to the end of ${target}. Which word ends the same way? ${answer}. ${other}.`,
    answer,
    [choice(answer, answer, "final-sound", answerVisual, answer), choice(other, other, "final-sound", otherVisual, other, "CONSONANT_CONTRAST_CONFUSION")],
    `${target} and ${answer} have the same last sound.`,
    "final-sound",
  );
  return {
    skillId: "ela.pa.isolate.final.set-1", recipeId: "ela.auditory-contrast.v1", evidenceMode: "SPOKEN_ONLY",
    instruction: { prompt: "The last sound is the sound at the end of a word.", narration: "The last sound is the sound at the end of a word. Listen all the way to the end.", tutorMessage: "Hold on to the final sound." },
    model: { prompt: "Map and tap end the same way.", narration: "Map. Tap. Both words end with the same last sound.", tutorMessage: "The beginning can change while the ending stays the same.", modelText: "map · tap", displayTokens: ["🗺️", "🚰"] },
    guided: [item("final-map-g1", "map", "tap", "mat", "🚰", "🧶"), item("final-sat-g2", "sat", "mat", "sap", "🧶", "🌳")],
    independent: [item("final-cat-i1", "cat", "mat", "can", "🧶", "🥫"), item("final-nap-i2", "nap", "tap", "man", "🚰", "👨"), item("final-can-i3", "can", "man", "cat", "👨", "🐈")],
    mastery: [item("final-pat-m1", "pat", "mat", "pan", "🧶", "🍳"), item("final-man-m2", "man", "can", "map", "🥫", "🗺️"), item("final-tap-m3", "tap", "nap", "tan", "😴", "🟫")],
  };
}

function phonemeBlendSpec(): SkillContentSpec {
  const blend = (id: string, word: string, cues: readonly string[], other: string, visual: string, otherVisual: string) => choose(id, `Slide the three sound cards together. Which word do they make?`, "Touch each reviewed sound button from left to right, then choose the word.", word, [choice(word, word, "three-sound-blend", visual, word), choice(other, other, "three-sound-blend", otherVisual, other, "ORDER_REVERSAL")], `The sounds blend to make ${word}.`, "three-sound-blend", cues);
  return {
    skillId: "ela.pa.phoneme-blend.three", recipeId: "ela.phoneme-sequence.v1", evidenceMode: "SPOKEN_ONLY",
    instruction: { prompt: "Blending means sliding sounds together to make a word.", narration: "Blending means sliding sounds together to make a word. We keep every sound in order.", tutorMessage: "Touch each sound, then slide." },
    model: { prompt: "Watch the sound cards slide together: m, a, p — map.", narration: "Ask an adult to check each isolated sound. Then listen to the whole word: map.", tutorMessage: "The order stays m, a, p.", modelText: "m  a  p  →  map", displayTokens: ["m", "a", "p"], audioCueIds: ["phoneme.m.continuous", "phoneme.a.short", "phoneme.p.stop"] },
    guided: [blend("blend-map-g1", "map", ["phoneme.m.continuous", "phoneme.a.short", "phoneme.p.stop"], "mat", "🗺️", "🧶"), blend("blend-sat-g2", "sat", ["phoneme.s.continuous", "phoneme.a.short", "phoneme.t.stop"], "sap", "🪑", "🌳")],
    independent: [blend("blend-mat-i1", "mat", ["phoneme.m.continuous", "phoneme.a.short", "phoneme.t.stop"], "map", "🧶", "🗺️"), blend("blend-pan-i2", "pan", ["phoneme.p.stop", "phoneme.a.short", "phoneme.n.continuous"], "pat", "🍳", "✋"), blend("blend-cat-i3", "cat", ["phoneme.k.stop", "phoneme.a.short", "phoneme.t.stop"], "can", "🐈", "🥫")],
    mastery: [blend("blend-tap-m1", "tap", ["phoneme.t.stop", "phoneme.a.short", "phoneme.p.stop"], "tan", "🚰", "🟫"), blend("blend-nap-m2", "nap", ["phoneme.n.continuous", "phoneme.a.short", "phoneme.p.stop"], "map", "😴", "🗺️"), blend("blend-can-m3", "can", ["phoneme.k.stop", "phoneme.a.short", "phoneme.n.continuous"], "cat", "🥫", "🐈")],
  };
}

function phonemeSegmentSpec(): SkillContentSpec {
  const segment = (id: string, word: string) => choose(id, `How many sounds are in ${word}?`, `Listen to ${word}. Stretch it slowly, then count each sound.`, "three", soundCountChoices, `${word} has three sounds.`, "sound-count");
  return {
    skillId: "ela.pa.phoneme-segment.three", recipeId: "ela.phoneme-sequence.v1", evidenceMode: "SPOKEN_ONLY",
    instruction: { prompt: "Segmenting means stretching a word into each sound.", narration: "Segmenting means stretching a word into each sound. Put one counter down for every sound you hear.", tutorMessage: "One sound gets one place." },
    model: { prompt: "Map stretches into three sound places.", narration: "Ask an adult to check the isolated sounds in map. I place one counter for each of the three sounds.", tutorMessage: "I do not add or skip a sound.", modelText: "●  ●  ●", displayTokens: ["1", "2", "3"], audioCueIds: ["phoneme.m.continuous", "phoneme.a.short", "phoneme.p.stop"] },
    guided: [segment("segment-map-g1", "map"), segment("segment-sat-g2", "sat")],
    independent: [segment("segment-pan-i1", "pan"), segment("segment-cat-i2", "cat"), segment("segment-nap-i3", "nap")],
    mastery: [segment("segment-mat-m1", "mat"), segment("segment-tap-m2", "tap"), segment("segment-can-m3", "can")],
  };
}

function letterVsSymbolSpec(): SkillContentSpec {
  const item = (id: string, letter: string, others: readonly string[]) => simpleChoice(id, "Which one is a letter?", letter, [letter, ...others], "letter-vs-symbol");
  return { skillId: "ela.alphabet.letter-vs-symbol", recipeId: "ela.symbol-sound.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "Letters are special shapes we use to write words.", narration: "Letters are special shapes we use to write words. Numbers and other symbols have different jobs.", tutorMessage: "Look for a letter shape." }, model: { prompt: "m is a letter. 3 is a number.", narration: "The shape m is a letter. The shape 3 is a number.", tutorMessage: "I compare the kind of symbol.", modelText: "m   3", displayTokens: ["m", "3"] }, guided: [item("letter-m-g1", "m", ["3", "★"]), item("letter-s-g2", "s", ["8", "?"])], independent: [item("letter-t-i1", "t", ["2", "#"]), item("letter-p-i2", "p", ["9", "+"]), item("letter-n-i3", "n", ["4", "!"])], mastery: [item("letter-c-m1", "c", ["6", "&"]), item("letter-a-m2", "a", ["1", "="]), item("letter-m-m3", "m", ["7", "%"])] };
}

function lowercaseSpec(): SkillContentSpec {
  const item = (id: string, target: string, labels: readonly string[]) => simpleChoice(id, `Choose lowercase ${target.toUpperCase()}.`, target, labels, "lowercase-letter");
  return { skillId: "ela.alphabet.lowercase.set-1", recipeId: "ela.symbol-sound.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "Letters can have capital and lowercase shapes.", narration: "Letters can have capital and lowercase shapes. We are learning the small lowercase shapes.", tutorMessage: "Notice each lowercase shape." }, model: { prompt: "This is lowercase m.", narration: "This is lowercase m.", tutorMessage: "I look at the whole shape.", modelText: "m", displayTokens: ["m"] }, guided: [item("lower-m-g1", "m", ["M", "m", "S"]), item("lower-s-g2", "s", ["s", "S", "m"])], independent: [item("lower-t-i1", "t", ["T", "p", "t"]), item("lower-p-i2", "p", ["P", "p", "n"]), item("lower-n-i3", "n", ["N", "m", "n"])], mastery: [item("lower-c-m1", "c", ["C", "c", "a"]), item("lower-a-m2", "a", ["A", "n", "a"]), item("lower-s-m3", "s", ["S", "c", "s"])] };
}

function caseMatchSpec(): SkillContentSpec {
  const item = (id: string, capital: string, answer: string, others: readonly string[]) => simpleChoice(id, `Which lowercase letter matches ${capital}?`, answer, [answer, ...others], "case-match");
  return { skillId: "ela.alphabet.case-match.set-1", recipeId: "ela.symbol-sound.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "A capital and lowercase letter can be the same letter in two shapes.", narration: "A capital and lowercase letter can be the same letter in two shapes.", tutorMessage: "Match the letter, not just the size." }, model: { prompt: "Capital M matches lowercase m.", narration: "Capital M and lowercase m are the same letter.", tutorMessage: "Their shapes are different, but their name is the same.", modelText: "M  ↔  m", displayTokens: ["M", "m"] }, guided: [item("case-m-g1", "M", "m", ["n", "s"]), item("case-s-g2", "S", "s", ["c", "m"])], independent: [item("case-t-i1", "T", "t", ["p", "n"]), item("case-p-i2", "P", "p", ["t", "c"]), item("case-n-i3", "N", "n", ["m", "a"])], mastery: [item("case-c-m1", "C", "c", ["s", "a"]), item("case-a-m2", "A", "a", ["n", "m"]), item("case-m-m3", "M", "m", ["s", "n"])] };
}

function consonantSoundSpec(): SkillContentSpec {
  const item = (id: string, word: string, answer: string, labels: readonly string[]) => simpleChoice(id, `Listen to ${word}. Which letter spells its first sound?`, answer, labels, "consonant-sound", [], `Listen to ${word}. Which letter spells the first sound?`);
  return { skillId: "ela.phonics.consonant-sounds.set-1", recipeId: "ela.symbol-sound.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "A consonant letter can show a sound in a word.", narration: "A consonant letter can show a sound in a word. Listen to the first sound, then connect it to a letter.", tutorMessage: "Listen first, then look." }, model: { prompt: "Map begins with the sound spelled by m.", narration: "Map begins with the sound spelled by the letter m.", tutorMessage: "I connect the first sound to m.", modelText: "map  →  m", displayTokens: ["🗺️", "m"] }, guided: [item("sound-map-g1", "map", "m", ["m", "s", "t"]), item("sound-sat-g2", "sat", "s", ["p", "s", "n"])], independent: [item("sound-tap-i1", "tap", "t", ["c", "t", "m"]), item("sound-pan-i2", "pan", "p", ["n", "p", "s"]), item("sound-nap-i3", "nap", "n", ["m", "c", "n"])], mastery: [item("sound-cat-m1", "cat", "c", ["t", "c", "p"]), item("sound-man-m2", "man", "m", ["s", "n", "m"]), item("sound-sat-m3", "sat", "s", ["s", "t", "p"])] };
}

function vowelIdentitySpec(): SkillContentSpec {
  const item = (id: string, labels: readonly string[]) => simpleChoice(id, "Which letter is a vowel?", "a", labels, "vowel-identity");
  return { skillId: "ela.phonics.vowel.identity", recipeId: "ela.symbol-sound.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "Vowels are a special group of letters. The first vowel we will use is a.", narration: "Vowels are a special group of letters. The first vowel we will use is a.", tutorMessage: "Today, remember that a is a vowel." }, model: { prompt: "In m, a, p, the vowel is a.", narration: "In m, a, p, the vowel is a.", tutorMessage: "I find a in the middle.", modelText: "m  a  p", displayTokens: ["m", "a", "p"] }, guided: [item("vowel-a-g1", ["m", "a", "s"]), item("vowel-a-g2", ["p", "n", "a"])], independent: [item("vowel-a-i1", ["a", "t", "c"]), item("vowel-a-i2", ["s", "a", "m"]), item("vowel-a-i3", ["n", "p", "a"])], mastery: [item("vowel-a-m1", ["c", "a", "t"]), item("vowel-a-m2", ["a", "m", "n"]), item("vowel-a-m3", ["p", "s", "a"])] };
}

function shortASpec(): SkillContentSpec {
  const item = (id: string, word: string) => simpleChoice(id, `Listen to ${word}. Which middle letter spells the short-a sound?`, "a", ["a", "m", "t"], "short-a", [], `Listen to ${word}. Which middle letter spells the middle sound?`);
  return { skillId: "ela.phonics.vowel.short-a", recipeId: "ela.auditory-contrast.v1", evidenceMode: "LISTENING", instruction: { prompt: "The vowel a can make the middle sound in map.", narration: "The vowel a can make the middle sound in map. Listen to the whole word: map.", tutorMessage: "Short a is quick and open in the middle." }, model: { prompt: "Map has short a in the middle.", narration: "Listen to map. The middle sound is spelled with a.", tutorMessage: "I listen to the middle.", modelText: "m  a  p", displayTokens: ["m", "a", "p"], audioCueIds: ["phoneme.a.short"] }, guided: [item("short-a-map-g1", "map"), item("short-a-sat-g2", "sat")], independent: [item("short-a-mat-i1", "mat"), item("short-a-pan-i2", "pan"), item("short-a-cat-i3", "cat")], mastery: [item("short-a-tap-m1", "tap"), item("short-a-nap-m2", "nap"), item("short-a-can-m3", "can")] };
}

function medialShortASpec(): SkillContentSpec {
  const item = (id: string, target: string, answer: string, other: string, visual: string, otherVisual: string) => choose(id, `Which word has the same middle sound as ${target}?`, `${target}. Which word has the same middle sound? ${answer}. ${other}.`, answer, [choice(answer, answer, "medial-short-a", visual, answer), choice(other, other, "medial-short-a", otherVisual, other, "VOWEL_CONTRAST_CONFUSION")], `${target} and ${answer} share short a in the middle.`, "medial-short-a");
  return { skillId: "ela.pa.isolate.medial.short-a", recipeId: "ela.auditory-contrast.v1", evidenceMode: "LISTENING", instruction: { prompt: "A middle sound comes after the first sound and before the last sound.", narration: "A middle sound comes after the first sound and before the last sound. Listen to map. Short a is in the middle.", tutorMessage: "Hold the middle sound in your attention." }, model: { prompt: "Map and cat share the same middle sound.", narration: "Map. Cat. Their middle sound is the same short a sound.", tutorMessage: "The first and last sounds can change.", modelText: "map  ·  cat", displayTokens: ["🗺️", "🐈"], audioCueIds: ["phoneme.a.short"] }, guided: [item("medial-map-g1", "map", "cat", "sun", "🐈", "☀️"), item("medial-sat-g2", "sat", "pan", "sit", "🍳", "🪑")], independent: [item("medial-mat-i1", "mat", "nap", "mop", "😴", "🧹"), item("medial-tap-i2", "tap", "can", "tip", "🥫", "🔺"), item("medial-man-i3", "man", "pat", "men", "✋", "👥")], mastery: [item("medial-cat-m1", "cat", "map", "cot", "🗺️", "🛏️"), item("medial-pan-m2", "pan", "sat", "pin", "🪑", "📌"), item("medial-nap-m3", "nap", "mat", "nut", "🧶", "🥜")] };
}

function pictureWord(id: string, word: string, visual: string, otherWord: string, otherVisual: string): ExampleSpec {
  return choose(id, `Read the word: ${word}. Choose the matching picture.`, "Read the word on your own. Choose the matching picture.", word, [choice(word, `${word} picture`, "short-a-picture", visual, word), choice(otherWord, `${otherWord} picture`, "short-a-picture", otherVisual, otherWord, "CONSONANT_CONTRAST_CONFUSION")], `You kept the sounds in order and read ${word}.`, "short-a-picture");
}

function decodeSpec(): SkillContentSpec {
  return { skillId: "ela.phonics.cvc.decode.short-a", recipeId: "ela.word-mapping.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", independentEvidenceMode: "INDEPENDENT_READING", instruction: { prompt: "To read a short-a word, touch each letter sound and slide the sounds together.", narration: "To read a short-a word, touch each letter sound and slide the sounds together.", tutorMessage: "Letters keep the sounds in order." }, model: { prompt: "Watch me read map.", narration: "Ask an adult to check the isolated sounds. Then listen to the whole word: map.", tutorMessage: "I touch m, a, p, then read map.", modelText: "m  a  p  →  map", displayTokens: ["m", "a", "p"], audioCueIds: ["phoneme.m.continuous", "phoneme.a.short", "phoneme.p.stop"] }, guided: [pictureWord("decode-map-g1", "map", "🗺️", "mat", "🧶"), pictureWord("decode-sat-g2", "sat", "🪑", "cat", "🐈")], independent: [pictureWord("decode-tap-i1", "tap", "🚰", "nap", "😴"), pictureWord("decode-pan-i2", "pan", "🍳", "man", "👨"), pictureWord("decode-cat-i3", "cat", "🐈", "can", "🥫")], mastery: [pictureWord("decode-nap-m1", "nap", "😴", "map", "🗺️"), pictureWord("decode-can-m2", "can", "🥫", "cat", "🐈"), pictureWord("decode-pat-m3", "pat", "✋", "pan", "🍳")] };
}

function encodeSpec(): SkillContentSpec {
  return { skillId: "ela.encoding.cvc.short-a", recipeId: "ela.word-mapping.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "To build a word, listen for each sound and choose its letter in order.", narration: "To build a word, listen for each sound and choose its letter in order.", tutorMessage: "One sound maps to one letter in these words." }, model: { prompt: "Listen to map. I build m, a, p.", narration: "Listen to the whole word: map. Ask an adult to check the isolated sounds. I build m, a, p.", tutorMessage: "I keep the sounds in order.", modelText: "map  →  m  a  p", displayTokens: ["m", "a", "p"], audioCueIds: ["phoneme.m.continuous", "phoneme.a.short", "phoneme.p.stop"] }, guided: [cards("encode-map-g1", "Listen to map. Build the word.", "Listen to map. Choose the letters in order.", "map", ["p", "m", "a"]), cards("encode-sat-g2", "Listen to sat. Build the word.", "Listen to sat. Choose the letters in order.", "sat", ["a", "t", "s"])], independent: [cards("encode-mat-i1", "Listen to mat. Build the word.", "Listen to mat. Build the word.", "mat", ["t", "a", "m"]), cards("encode-pan-i2", "Listen to pan. Build the word.", "Listen to pan. Build the word.", "pan", ["n", "p", "a"]), cards("encode-cat-i3", "Listen to cat. Build the word.", "Listen to cat. Build the word.", "cat", ["a", "c", "t"])], mastery: [cards("encode-tap-m1", "Listen to tap. Build the word.", "Listen to tap. Build the word.", "tap", ["p", "a", "t"]), cards("encode-nap-m2", "Listen to nap. Build the word.", "Listen to nap. Build the word.", "nap", ["a", "p", "n"]), cards("encode-can-m3", "Listen to can. Build the word.", "Listen to can. Build the word.", "can", ["n", "a", "c"])] };
}

function printDirectionSpec(): SkillContentSpec {
  const item = (id: string) => simpleChoice(id, "Which arrow shows the way we follow English print?", "→", ["→", "←", "↕"], "print-direction");
  return { skillId: "ela.print.direction.left-to-right", recipeId: "ela.print-feature.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "English print moves from the left side toward the right side.", narration: "English print moves from the left side toward the right side.", tutorMessage: "Start here and move this way." }, model: { prompt: "My finger starts at Sam and moves toward sat.", narration: "My finger starts at Sam on the left and moves toward sat on the right.", tutorMessage: "I return to the left for a new line.", modelText: "Sam  →  sat.", displayTokens: ["Sam", "→", "sat."] }, guided: [item("direction-g1"), item("direction-g2")], independent: [item("direction-i1"), item("direction-i2"), item("direction-i3")], mastery: [item("direction-m1"), item("direction-m2"), item("direction-m3")] };
}

function wordSpacingSpec(): SkillContentSpec {
  const item = (id: string, labels: readonly string[]) => simpleChoice(id, "Which one shows two words with a space between them?", "Sam sat.", labels, "word-spacing");
  return { skillId: "ela.print.word-boundaries-spacing", recipeId: "ela.print-feature.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "A space is the empty place between written words.", narration: "A space is the empty place between written words. The space helps us see where one word ends and the next begins.", tutorMessage: "Look for the empty place." }, model: { prompt: "Sam sat has a space between its two words.", narration: "Sam, space, sat. I see two words.", tutorMessage: "The space is not a letter.", modelText: "Sam ␠ sat.", displayTokens: ["Sam", "space", "sat."] }, guided: [item("spacing-g1", ["Samsat.", "Sam sat.", "S amsat."]), item("spacing-g2", ["Sam sat.", "Sams at.", "Samsat."])], independent: [item("spacing-i1", ["Samsat.", "Sam sat.", "Sa msat."]), item("spacing-i2", ["Sam sat.", "S am sat.", "Samsat."]), item("spacing-i3", ["Sams at.", "Samsat.", "Sam sat."])], mastery: [item("spacing-m1", ["Sam sat.", "Samsat.", "Sa msat."]), item("spacing-m2", ["Samsat.", "Sam sat.", "S amsat."]), item("spacing-m3", ["Sams at.", "Sam sat.", "Samsat."])] };
}

function sentenceFeaturesSpec(): SkillContentSpec {
  const item = (id: string, labels: readonly string[]) => simpleChoice(id, "Which sentence starts with a capital and ends with a period?", "Sam sat.", labels, "sentence-features");
  return { skillId: "ela.print.sentence-features", recipeId: "ela.print-feature.v1", evidenceMode: "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS", instruction: { prompt: "A sentence starts with a capital letter and ends with an end mark.", narration: "A sentence starts with a capital letter and ends with an end mark. We will use a period.", tutorMessage: "Check the beginning and the end." }, model: { prompt: "Sam sat. starts with capital S and ends with a period.", narration: "Sam sat. starts with capital S and ends with a period.", tutorMessage: "Both features matter.", modelText: "Sam sat.", displayTokens: ["S", "."] }, guided: [item("features-g1", ["sam sat.", "Sam sat", "Sam sat."]), item("features-g2", ["Sam sat.", "sam sat", "sam sat."])], independent: [item("features-i1", ["Sam sat", "sam sat.", "Sam sat."]), item("features-i2", ["Sam sat.", "sam sat.", "Sam sat"]), item("features-i3", ["sam sat", "Sam sat.", "Sam sat"])], mastery: [item("features-m1", ["sam sat.", "Sam sat.", "Sam sat"]), item("features-m2", ["Sam sat.", "Sam sat", "sam sat."]), item("features-m3", ["Sam sat", "sam sat", "Sam sat."])] };
}

function controlledSentenceSpec(): SkillContentSpec {
  const reader = (id: string) => controlled(id, "Read the sentence yourself. Then choose the matching picture.", "Read the sentence yourself. The sentence will stay silent unless you ask for help.", "sat", satPictures);
  return { skillId: "ela.text.sentence.short-a", recipeId: "ela.controlled-sentence.v1", evidenceMode: "SUPPORTED_READING", independentEvidenceMode: "INDEPENDENT_READING", instruction: { prompt: "A sentence puts words together to tell an idea.", narration: "A sentence puts words together to tell an idea. We read from left to right and pause at the period.", tutorMessage: "Use every word in the sentence." }, model: { prompt: "Watch me follow the words in Sam sat.", narration: "In this model only, I read the sentence: Sam sat. I start at the capital and stop at the period.", tutorMessage: "The model is not your reading evidence.", modelText: "Sam  →  sat.", displayTokens: ["Sam", "sat", "."] }, guided: [reader("sentence-g1"), reader("sentence-g2")], independent: [reader("sentence-i1"), reader("sentence-i2"), reader("sentence-i3")], mastery: [reader("sentence-m1"), reader("sentence-m2"), reader("sentence-m3")] };
}

function literalReadingSpec(): SkillContentSpec {
  const reader = (id: string) => controlled(id, "Read the sentence yourself. What did Sam do?", "Read the sentence yourself, then choose what Sam did. The sentence will stay silent unless you ask for help.", "sat", satPictures);
  return { skillId: "ela.read.literal.short-a", recipeId: "ela.controlled-sentence.v1", evidenceMode: "SUPPORTED_READING", independentEvidenceMode: "INDEPENDENT_READING", instruction: { prompt: "After we read, we can use the words to answer a question.", narration: "After we read, we can use the words to answer a question. The answer must come from the sentence.", tutorMessage: "Read first, then think about the detail." }, model: { prompt: "The sentence Sam sat tells what Sam did.", narration: "This is a model, so I can read it aloud: Sam sat. The word sat answers what Sam did.", tutorMessage: "I point back to the word that proves the answer.", modelText: "Sam sat.  →  What did Sam do?", displayTokens: ["Sam", "sat", "."] }, guided: [reader("literal-g1"), reader("literal-g2")], independent: [reader("literal-i1"), reader("literal-i2"), reader("literal-i3")], mastery: [reader("literal-m1"), reader("literal-m2"), reader("literal-m3")] };
}

function commonHintMessages() {
  return {
    L0_REPLAY: "Listen to the direction again.",
    L1_FOCUS: "Look or listen to the part the tutor points to.",
    L2_CONTRAST: "Compare just two choices.",
    L3_PARTIAL: "The tutor will complete the first part with you.",
    L4_MODEL: "Watch the complete example, then try a fresh one.",
  } as const;
}

function stageFor(purpose: ActivityPurpose): LearningActivityDefinition["stage"] {
  const stages: Record<ActivityPurpose, LearningActivityDefinition["stage"]> = {
    INSTRUCTION: "INTRODUCE",
    MODELED_EXAMPLE: "MODEL",
    GUIDED_PRACTICE: "GUIDED",
    INDEPENDENT_PRACTICE: "INDEPENDENT",
    MASTERY_CHECK: "MASTERY",
    REVIEW: "REVIEW",
  };
  return stages[purpose];
}

function definition(spec: SkillContentSpec, purpose: ActivityPurpose, example: ExampleSpec, suffix: string): LearningActivityDefinition {
  const isIndependent = purpose === "INDEPENDENT_PRACTICE" || purpose === "MASTERY_CHECK" || purpose === "REVIEW";
  const presentation = isIndependent && spec.recipeId === "ela.word-mapping.v1" && example.presentation.kind === "CHOICE_BOARD"
    ? { ...example.presentation, choices: example.presentation.choices.map(({ audioText: _audioText, ...choiceView }) => choiceView) }
    : example.presentation;
  return {
    id: `${spec.skillId}.${purpose.toLowerCase()}.${suffix}`,
    version: 1,
    primarySkillId: spec.skillId,
    supportingSkillIds: [],
    purpose,
    recipeId: spec.recipeId,
    stage: stageFor(purpose),
    contentScopeId: KINDERGARTEN_ELA_SKILLS.find((item) => item.id === spec.skillId)?.contentScopeId,
    evidenceMode: isIndependent ? spec.independentEvidenceMode ?? spec.evidenceMode : spec.evidenceMode,
    prompt: example.prompt,
    narration: example.narration,
    tutorMessage: purpose === "GUIDED_PRACTICE" ? "Let's do this one together." : purpose === "MASTERY_CHECK" ? "Show what you know on this fresh example." : purpose === "REVIEW" ? "Let's make this skill strong again." : "Try this one on your own.",
    tutorState: purpose === "GUIDED_PRACTICE" ? "POINTING" : "IDLE",
    presentation,
    canonicalAnswer: example.answer,
    explanation: example.explanation,
    hintMessages: commonHintMessages(),
    targetConceptDomain: example.conceptDomain,
    review: { status: "validated", reviewer: REVIEW.reviewer, reviewedAt: REVIEW.reviewedAt },
  };
}

function activitiesFor(spec: SkillContentSpec): LearningActivityDefinition[] {
  const instruction: LearningActivityDefinition = {
    id: `${spec.skillId}.instruction`, version: 1, primarySkillId: spec.skillId, supportingSkillIds: [], purpose: "INSTRUCTION", recipeId: spec.recipeId,
    stage: "INTRODUCE", contentScopeId: KINDERGARTEN_ELA_SKILLS.find((item) => item.id === spec.skillId)?.contentScopeId, evidenceMode: spec.evidenceMode,
    prompt: spec.instruction.prompt, narration: spec.instruction.narration, tutorMessage: spec.instruction.tutorMessage, tutorState: "SPEAKING",
    presentation: { kind: "TUTOR_MESSAGE", displayTokens: spec.instruction.displayTokens }, canonicalAnswer: null, explanation: "Instruction completed.", hintMessages: {}, review: { status: "validated", reviewer: REVIEW.reviewer, reviewedAt: REVIEW.reviewedAt },
  };
  const modeled: LearningActivityDefinition = {
    id: `${spec.skillId}.modeled`, version: 1, primarySkillId: spec.skillId, supportingSkillIds: [], purpose: "MODELED_EXAMPLE", recipeId: spec.recipeId,
    stage: "MODEL", contentScopeId: KINDERGARTEN_ELA_SKILLS.find((item) => item.id === spec.skillId)?.contentScopeId, evidenceMode: spec.evidenceMode,
    prompt: spec.model.prompt, narration: spec.model.narration, tutorMessage: spec.model.tutorMessage, tutorState: "POINTING",
    presentation: { kind: "TUTOR_MESSAGE", modelText: spec.model.modelText, displayTokens: spec.model.displayTokens, audioCueIds: spec.model.audioCueIds }, canonicalAnswer: null, explanation: "Modeled example completed.", hintMessages: {}, review: { status: "validated", reviewer: REVIEW.reviewer, reviewedAt: REVIEW.reviewedAt },
  };
  return [
    instruction,
    modeled,
    ...spec.guided.map((example) => definition(spec, "GUIDED_PRACTICE", example, example.id)),
    ...spec.independent.map((example) => definition(spec, "INDEPENDENT_PRACTICE", example, example.id)),
    ...spec.mastery.map((example) => definition(spec, "MASTERY_CHECK", example, example.id)),
    ...spec.independent.slice(0, 2).map((example) => definition(spec, "REVIEW", example, `review-${example.id}`)),
  ];
}

export const KINDERGARTEN_ELA_ACTIVITIES: readonly LearningActivityDefinition[] = SPECS.flatMap(activitiesFor);

export const KINDERGARTEN_AUDIO_CUES = ["phoneme.m.continuous", "phoneme.s.continuous", "phoneme.t.stop", "phoneme.p.stop", "phoneme.n.continuous", "phoneme.k.stop", "phoneme.a.short"] as const;
export interface KindergartenAudioCueDefinition {
  id: (typeof KINDERGARTEN_AUDIO_CUES)[number];
  version: number;
  reviewStatus: "PENDING_QUALIFIED_REVIEW" | "PROVISIONAL" | "REVIEWED";
  assetPath: string | null;
  sourcePage: string | null;
  licenseId: string | null;
  sha256: string | null;
  notes: string;
}
export const KINDERGARTEN_AUDIO_CUE_CATALOG: readonly KindergartenAudioCueDefinition[] = [
  {
    id: "phoneme.m.continuous", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/m-bilabial-nasal.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Bilabial_nasal.ogg", licenseId: "CC-BY-SA-3.0", sha256: "91092606944ea851ffc5c67d485fb26bae8ec5f4adaf86e58a1a7b4bfeb4d9be",
    notes: "Private-use IPA sample; not yet reviewed as a U.S. Kindergarten phonics recording.",
  },
  {
    id: "phoneme.s.continuous", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/s-voiceless-alveolar-sibilant.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_sibilant.ogg", licenseId: "CC-BY-SA-3.0", sha256: "8e2922dcfaa4c99bd613fbba331398f696d42ae2b774a7f7deccb9903a5ad580",
    notes: "Private-use IPA sample with vowel context; not yet reviewed as an isolated U.S. Kindergarten phonics recording.",
  },
  {
    id: "phoneme.t.stop", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/t-voiceless-alveolar-plosive.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_plosive.ogg", licenseId: "CC-BY-SA-3.0", sha256: "b67b7ae2c801ce37bc399c68473341ba6eba1e92e9a828a40583c46594f3d0c6",
    notes: "Private-use IPA sample; articulation and stop timing still need qualified review.",
  },
  {
    id: "phoneme.p.stop", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/p-voiceless-bilabial-plosive.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Voiceless_bilabial_plosive.ogg", licenseId: "CC-BY-SA-3.0", sha256: "576ae283995962f746a390fbc4461c01f6ce1e296c831d7beb9e1907acffa936",
    notes: "Private-use IPA sample; articulation and stop timing still need qualified review.",
  },
  {
    id: "phoneme.n.continuous", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/n-alveolar-nasal.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Alveolar_nasal.ogg", licenseId: "CC-BY-SA-3.0", sha256: "ada5d9e78502373e5e7108beee59d8fd74b88cb0c67798050ebd1df01b4f9c03",
    notes: "Private-use IPA sample with vowel context; not yet reviewed as an isolated U.S. Kindergarten phonics recording.",
  },
  {
    id: "phoneme.k.stop", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/k-voiceless-velar-plosive.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Voiceless_velar_plosive.ogg", licenseId: "CC-BY-SA-3.0", sha256: "5285ace1a53693315f32ad2c5faa9f87efe8690396685562877309a93dd9ecec",
    notes: "Private-use IPA sample with vowel context; articulation and stop timing still need qualified review.",
  },
  {
    id: "phoneme.a.short", version: 1, reviewStatus: "PROVISIONAL", assetPath: "src/game/assets/audio/phonemes/a-near-open-front-unrounded-vowel.ogg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Near-open_front_unrounded_vowel.ogg", licenseId: "CC-BY-SA-3.0", sha256: "f95bf6b3f9ad1daba7c056d46e5fb1920885ddccb68cb4af19eb19ca36d033d7",
    notes: "Private-use IPA /ae/ sample; accent suitability still needs qualified review.",
  },
];

export function hasProductionReadyKindergartenAudio(): boolean {
  return KINDERGARTEN_AUDIO_CUE_CATALOG.every((cue) => cue.reviewStatus === "REVIEWED" && Boolean(cue.assetPath));
}

export function hasPrivatePreviewKindergartenAudio(): boolean {
  return KINDERGARTEN_AUDIO_CUE_CATALOG.every((cue) => cue.reviewStatus !== "PENDING_QUALIFIED_REVIEW" && Boolean(cue.assetPath));
}

export function isKindergartenAudioReady(allowProvisionalAudio: boolean): boolean {
  return hasProductionReadyKindergartenAudio() || (allowProvisionalAudio && hasPrivatePreviewKindergartenAudio());
}

export function catalogSkill(skillId: string): ElaSkillDefinition {
  const found = KINDERGARTEN_ELA_SKILLS.find((item) => item.id === skillId);
  if (!found) throw new Error(`Unknown Kindergarten ELA skill ${skillId}.`);
  return found;
}
