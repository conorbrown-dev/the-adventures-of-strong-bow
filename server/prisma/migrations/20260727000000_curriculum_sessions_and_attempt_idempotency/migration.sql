CREATE TABLE "CurriculumLearningSession" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "length" INTEGER NOT NULL,
  "state" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CurriculumLearningSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CurriculumLearningSession_learnerId_status_updatedAt_idx" ON "CurriculumLearningSession"("learnerId", "status", "updatedAt");
CREATE UNIQUE INDEX "CurriculumAttemptEvent_learnerId_sessionId_questionInstanceId_purpose_key" ON "CurriculumAttemptEvent"("learnerId", "sessionId", "questionInstanceId", "purpose");
