type KindergartenLanguageVariant = { question: string; answer: string; choices: string[]; explanation: string };

/** Additional original prompts for Kindergarten language and foundational-reading practice. */
export const kindergartenLanguageVariants: Record<string, KindergartenLanguageVariant[]> = {
  "K.L.1.b": [{ question: "Which word names a person?", answer: "teacher", choices: ["teacher", "run", "yellow"], explanation: "Teacher names a person, so it is a noun." }],
  "K.L.1.c": [{ question: "Which word means more than one dog?", answer: "dogs", choices: ["dogs", "dog", "dogged"], explanation: "Dogs means more than one dog." }],
  "K.L.1.d": [{ question: "The cat is ___ the chair. Which word tells where?", answer: "beside", choices: ["beside", "green", "jump"], explanation: "Beside tells where the cat is." }],
  "K.L.1.e": [{ question: "Which question word asks about a person?", answer: "Who", choices: ["Who", "Where", "When"], explanation: "Who asks about a person." }],
  "K.L.2.a": [{ question: "Which sentence starts the right way?", answer: "I see a frog.", choices: ["I see a frog.", "i look at a frog.", "we play outside."], explanation: "A sentence starts with a capital letter." }],
  "K.L.2.b": [{ question: "Which mark belongs at the end? Can you hop___", answer: "?", choices: ["?", ".", ","], explanation: "A question ends with a question mark." }],
  "K.L.2.c": [{ question: "Which letters spell the word you hear: map?", answer: "map", choices: ["map", "mop", "pam"], explanation: "The sounds /m/ /a/ /p/ spell map." }],
  "K.L.2.d": [{ question: "Which word is spelled correctly?", answer: "sun", choices: ["sun", "sunn", "san"], explanation: "Sun uses the letters s, u, and n in that order." }],
  "K.L.4.a": [{ question: "The towel is dry, not wet. What does dry mean?", answer: "not wet", choices: ["not wet", "very loud", "full of snow"], explanation: "The sentence tells that dry means not wet." }],
  "K.L.4.b": [{ question: "What does the beginning re- mean in redo?", answer: "again", choices: ["again", "not", "very"], explanation: "Re- can mean again." }],
  "K.L.5.a": [{ question: "Which two things belong in the same group?", answer: "bus and car", choices: ["bus and car", "bus and apple", "car and sock"], explanation: "A bus and car are both vehicles." }],
  "K.L.5.b": [{ question: "Which word tells about a flower?", answer: "yellow", choices: ["yellow", "because", "under"], explanation: "Yellow is an attribute that can describe a flower." }],
  "K.L.5.c": [{ question: "What is the opposite of fast?", answer: "slow", choices: ["slow", "tall", "blue"], explanation: "Slow means the opposite of fast." }],
  "K.L.5.d": [{ question: "Which item would you use to eat soup?", answer: "a spoon", choices: ["a spoon", "a shoe", "a crayon"], explanation: "A spoon is used to eat soup." }],
  "K.L.6": [{ question: "Which word names a color?", answer: "orange", choices: ["orange", "skip", "above"], explanation: "Orange can name a color." }],
  "K.RF.1.a": [{ question: "Which part of a book shows its name?", answer: "the cover", choices: ["the cover", "the table", "the shoe"], explanation: "A book's cover shows its title or name." }],
  "K.RF.1.b": [{ question: "When we read English, which way do our eyes move across a line?", answer: "from left to right", choices: ["from left to right", "from right to left", "from bottom to top"], explanation: "English print moves from left to right." }],
  "K.RF.1.c": [{ question: "Which is a group of words that makes a complete thought?", answer: "The bird can fly.", choices: ["The bird can fly.", "bird the fly", "can bird the"], explanation: "The sentence makes a complete thought." }],
  "K.RF.2.b": [{ question: "Which word starts with the same sound as moon?", answer: "map", choices: ["map", "sun", "top"], explanation: "Moon and map both begin with /m/." }],
  "K.RF.2.c": [{ question: "Blend these sounds: /s/ /u/ /n/. What word do they make?", answer: "sun", choices: ["sun", "sin", "sat"], explanation: "The sounds blend to make sun." }],
  "K.RF.2.e": [{ question: "Change the first sound in pig from /p/ to /d/. What word do you make?", answer: "dig", choices: ["dig", "dog", "pig"], explanation: "Changing /p/ to /d/ makes dig." }],
  "K.RF.3.a": [{ question: "What sound does the letter s make?", answer: "/s/", choices: ["/s/", "/m/", "/t/"], explanation: "The letter s usually spells the /s/ sound." }],
  "K.RF.3.b": [{ question: "Which letter makes the first sound in moon?", answer: "m", choices: ["m", "s", "t"], explanation: "Moon begins with /m/." }],
  "K.RF.3.c": [{ question: "Which word can you sound out: /p/ /i/ /g/?", answer: "pig", choices: ["pig", "peg", "pin"], explanation: "The sounds /p/ /i/ /g/ make pig." }],
  "K.RF.3.d": [{ question: "Which is a common word to know by heart?", answer: "is", choices: ["is", "xylophone", "triceratops"], explanation: "Is is a very common word readers learn to recognize." }]
};
