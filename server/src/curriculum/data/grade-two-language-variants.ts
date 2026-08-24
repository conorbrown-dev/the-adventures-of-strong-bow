type GradeTwoLanguageVariant = { question: string; answer: string; choices: string[]; explanation: string };

/** Additional original prompts for Grade 2 language, vocabulary, and word-reading practice. */
export const gradeTwoLanguageVariants: Record<string, GradeTwoLanguageVariant[]> = {
  "2.L.1.a": [{ question: "Which word names a group of animals?", answer: "herd", choices: ["herd", "cow", "run"], explanation: "A herd is a group of animals." }],
  "2.L.1.b": [{ question: "Which word means more than one child?", answer: "children", choices: ["children", "childs", "child"], explanation: "Children is the irregular plural of child." }],
  "2.L.1.c": [{ question: "Which word completes the sentence? Jay washed ___ before lunch.", answer: "himself", choices: ["himself", "him", "his"], explanation: "Himself is a reflexive pronoun that refers back to Jay." }],
  "2.L.1.d": [{ question: "Which sentence uses the correct past-tense word?", answer: "Last night, I ate soup.", choices: ["Last night, I ate soup.", "Last night, I eated soup.", "Last night, I eat soup."], explanation: "Ate is the irregular past tense of eat." }],
  "2.L.1.e": [{ question: "Which word tells how the turtle moved?", answer: "slowly", choices: ["slowly", "turtle", "green"], explanation: "Slowly is an adverb that tells how the turtle moved." }],
  "2.L.1.f": [{ question: "Which is a complete sentence?", answer: "The tiny bird sang in the tree.", choices: ["The tiny bird sang in the tree.", "Tiny bird in.", "Sang the tree."], explanation: "The complete sentence tells who did something and what happened." }],
  "2.L.2.a": [{ question: "Which words need capital letters in this sentence? we visited oklahoma in july.", answer: "Oklahoma and July", choices: ["Oklahoma and July", "only we", "no words"], explanation: "Oklahoma is a place name and July is the name of a month." }],
  "2.L.2.b": [{ question: "Which closing in a letter uses a comma correctly?", answer: "Your friend,", choices: ["Your friend,", "Your, friend", "Your friend"], explanation: "A friendly letter closing ends with a comma." }],
  "2.L.2.c": [{ question: "Which word shows that the bicycle belongs to Dad?", answer: "Dad's", choices: ["Dad's", "Dads", "Dad"], explanation: "An apostrophe and s can show that something belongs to one person." }],
  "2.L.2.d": [{ question: "Which word has the same spelling pattern as moon?", answer: "spoon", choices: ["spoon", "soon", "son"], explanation: "Moon and spoon both use oo for the long u sound." }],
  "2.L.3.a": [{ question: "Which is the best formal way to greet a principal?", answer: "Good morning, Dr. Lee.", choices: ["Good morning, Dr. Lee.", "Hey you!", "What up?"], explanation: "Formal language is polite and appropriate for school." }],
  "2.L.4.a": [{ question: "The path was narrow, so only one person could walk on it at a time. What does narrow mean?", answer: "not wide", choices: ["not wide", "very loud", "full of snow"], explanation: "Only one person fitting at a time is a clue that narrow means not wide." }],
  "2.L.4.b": [{ question: "What does the prefix pre- mean in preview?", answer: "before", choices: ["before", "again", "not"], explanation: "Pre- means before." }],
  "2.L.4.c": [{ question: "Knowing the word paint can help you understand painter. What does painter mean?", answer: "a person who paints", choices: ["a person who paints", "a place to sleep", "a kind of weather"], explanation: "The root word paint gives a clue to painter." }],
  "2.L.4.d": [{ question: "What is toothpaste?", answer: "a paste for cleaning teeth", choices: ["a paste for cleaning teeth", "a tooth that is a paste", "a book about teeth"], explanation: "Toothpaste joins tooth and paste to name something used for teeth." }],
  "2.L.5.a": [{ question: "Which animal could be described as enormous?", answer: "an elephant", choices: ["an elephant", "an ant", "a ladybug"], explanation: "Enormous means very large, like an elephant." }],
  "2.L.5.b": [{ question: "Which word means to look carefully?", answer: "examine", choices: ["examine", "peek", "glance"], explanation: "Examine means to look very carefully." }],
  "2.L.6": [{ question: "Which sentence uses a precise word for moving quickly?", answer: "The rabbit sprinted home.", choices: ["The rabbit sprinted home.", "The rabbit did a thing.", "Rabbit home very."], explanation: "Sprinted is a precise word for moving quickly." }],
  "2.RF.3.a": [{ question: "Which word has the short a sound?", answer: "crab", choices: ["crab", "cake", "rain"], explanation: "Crab has the short a sound." }],
  "2.RF.3.b": [{ question: "Which word has the vowel team oa?", answer: "float", choices: ["float", "flat", "flit"], explanation: "Float has the vowel team oa." }],
  "2.RF.3.c": [{ question: "Which two-syllable word has a long vowel sound?", answer: "robot", choices: ["robot", "basket", "kitten"], explanation: "Robot has a long o sound in its first syllable." }],
  "2.RF.3.d": [{ question: "What does the word careless mean?", answer: "not careful", choices: ["not careful", "careful again", "full of care"], explanation: "The suffix -less means without or not having." }],
  "2.RF.3.e": [{ question: "Which word has an irregular spelling to remember?", answer: "does", choices: ["does", "dog", "map"], explanation: "Does does not sound exactly the way its letters usually spell." }],
  "2.RF.3.f": [{ question: "Which is a Grade 2 word that readers often learn by memory?", answer: "beautiful", choices: ["beautiful", "sun", "cat"], explanation: "Beautiful has a spelling that readers learn to recognize and remember." }]
};
