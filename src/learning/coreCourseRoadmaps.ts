type CoreSubject = "ELA" | "MATH";
type LearningGrade = "K" | "1" | "2";

export type CoreCourseRoadmap = {
  title: string;
  introduction: string;
  units: Array<{ title: string; focus: string }>;
};

const roadmaps: Record<CoreSubject, Record<LearningGrade, CoreCourseRoadmap>> = {
  MATH: {
    K: {
      title: "Kindergarten Math Roadmap",
      introduction: "Count, compare, build number sense, and use real objects to solve everyday problems.",
      units: [
        { title: "Counting and quantities", focus: "Say, read, write, count, compare, and order numbers through 20." },
        { title: "Putting together and taking apart", focus: "Use objects, drawings, and number stories to add, subtract, and make 10." },
        { title: "Shapes, space, and measurement", focus: "Name shapes, describe position, compare measurable attributes, and use time words." },
        { title: "Patterns and data", focus: "Extend patterns, sort objects, make simple graphs, and explain what the data shows." }
      ]
    },
    "1": {
      title: "Grade 1 Math Roadmap",
      introduction: "Build fluency and explain mathematical thinking with drawings, equations, and everyday problem solving.",
      units: [
        { title: "Addition and subtraction", focus: "Solve word problems, find unknowns, use equal signs, and become fluent within 20." },
        { title: "Place value and counting", focus: "Count to 120, build tens and ones, compare numbers, and add or subtract within 100." },
        { title: "Measurement, time, and data", focus: "Measure lengths, tell time to the half hour, and reason with charts and graphs." },
        { title: "Geometry and equal shares", focus: "Describe shapes, compose new shapes, and recognize halves and fourths." }
      ]
    },
    "2": {
      title: "Grade 2 Math Roadmap",
      introduction: "Use place value and strategies to solve larger problems, explain solutions, and connect math to daily life.",
      units: [
        { title: "Operations and early multiplication ideas", focus: "Solve addition and subtraction problems, build fluency within 20, and use rows and columns." },
        { title: "Place value through 1,000", focus: "Read, compare, and represent three-digit numbers; add and subtract using place-value strategies." },
        { title: "Measurement, time, money, and data", focus: "Measure, estimate, use number lines, tell time to five minutes, count money, and read graphs." },
        { title: "Shapes and equal shares", focus: "Describe attributes, partition rectangles and circles, and name halves, thirds, and fourths." }
      ]
    }
  },
  ELA: {
    K: {
      title: "Kindergarten Reading and Language Roadmap",
      introduction: "Build confidence with sounds, letters, books, oral language, drawing, and beginning writing.",
      units: [
        { title: "Print and letter knowledge", focus: "Use books correctly, recognize letters, and understand how print works." },
        { title: "Hearing and using sounds", focus: "Rhyme, blend and segment sounds, and read simple consonant-vowel-consonant words." },
        { title: "Understanding books and texts", focus: "Ask and answer questions, retell events, and use pictures and words together." },
        { title: "Language, writing, and sharing", focus: "Build sentences, use new words, draw and write ideas, and take turns in conversation." }
      ]
    },
    "1": {
      title: "Grade 1 Reading and Language Roadmap",
      introduction: "Strengthen phonics and fluency while reading for meaning, writing complete ideas, and speaking clearly.",
      units: [
        { title: "Phonics and fluent reading", focus: "Blend sounds, decode common spelling patterns, read high-frequency words, and read smoothly." },
        { title: "Words and sentences", focus: "Use grammar, capitalization, punctuation, word parts, context clues, and precise vocabulary." },
        { title: "Reading literature and information", focus: "Find details, identify main topics and lessons, compare texts, and explain words and pictures." },
        { title: "Writing, speaking, and research", focus: "Create narrative, informational, and opinion writing; discuss ideas; and gather simple facts." }
      ]
    },
    "2": {
      title: "Grade 2 Reading and Language Roadmap",
      introduction: "Read longer texts with meaning, write organized paragraphs, and explain ideas with growing independence.",
      units: [
        { title: "Word study and fluency", focus: "Decode longer words, use syllables and word parts, build automaticity, and read with expression." },
        { title: "Language and vocabulary", focus: "Use grammar and conventions, context clues, reference tools, and precise word choices." },
        { title: "Reading literature and information", focus: "Find evidence, determine main ideas and lessons, compare texts, and use text features and illustrations." },
        { title: "Paragraphs, discussion, and research", focus: "Write narratives, information, and opinions; participate in discussion; and organize research." }
      ]
    }
  }
};

export function coreCourseRoadmap(subject: string, grade: LearningGrade): CoreCourseRoadmap | null {
  return subject === "MATH" || subject === "ELA" ? roadmaps[subject][grade] : null;
}
