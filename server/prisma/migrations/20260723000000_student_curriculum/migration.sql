-- Initial schema for a fresh PostgreSQL database.
CREATE TYPE "WordAttemptStatus" AS ENUM ('NotAttempted', 'InProgress', 'Mastered');
CREATE TYPE "GradeLevel" AS ENUM ('K', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5');
CREATE TYPE "CurriculumSubject" AS ENUM ('ELA', 'MATH');

CREATE TABLE "GameMode" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "GameMode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameMode_slug_key" ON "GameMode"("slug");

CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "pin" TEXT NOT NULL,
  "grade" "GradeLevel" NOT NULL DEFAULT 'K',
  "assignedSubjects" "CurriculumSubject"[] NOT NULL DEFAULT ARRAY[]::"CurriculumSubject"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Student_username_key" ON "Student"("username");

CREATE TABLE "WordAttempt" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL,
  "status" "WordAttemptStatus" NOT NULL DEFAULT 'NotAttempted',
  "wordText" TEXT NOT NULL,
  "averageAttemptInMs" INTEGER NOT NULL,
  CONSTRAINT "WordAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WordAttempt_studentId_wordText_key" ON "WordAttempt"("studentId", "wordText");
ALTER TABLE "WordAttempt" ADD CONSTRAINT "WordAttempt_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
