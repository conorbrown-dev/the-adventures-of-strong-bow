-- Existing WordAttempt rows are student-specific; a single global wordText unique
-- constraint prevents multiple students from practising the same word.
CREATE TYPE "GradeLevel" AS ENUM ('K', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5');
CREATE TYPE "CurriculumSubject" AS ENUM ('ELA', 'MATH');

ALTER TABLE "Student"
  DROP CONSTRAINT IF EXISTS "Student_pin_key",
  ADD COLUMN "grade" "GradeLevel" NOT NULL DEFAULT 'K',
  ADD COLUMN "assignedSubjects" "CurriculumSubject"[] NOT NULL DEFAULT ARRAY[]::"CurriculumSubject"[],
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "WordAttempt" DROP CONSTRAINT IF EXISTS "WordAttempt_wordText_key";
CREATE UNIQUE INDEX "WordAttempt_studentId_wordText_key" ON "WordAttempt"("studentId", "wordText");

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "subject" "CurriculumSubject" NOT NULL,
  "grade" "GradeLevel" NOT NULL,
  "standardCode" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "correctAnswers" INTEGER NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizAttempt_studentId_subject_grade_idx" ON "QuizAttempt"("studentId", "subject", "grade");
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
