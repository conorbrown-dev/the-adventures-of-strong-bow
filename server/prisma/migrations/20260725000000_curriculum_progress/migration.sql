CREATE TABLE "CurriculumAttemptEvent" (
  "id" TEXT NOT NULL, "learnerId" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "questionInstanceId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL, "templateVersion" INTEGER NOT NULL, "primaryStandardId" TEXT NOT NULL,
  "supportingStandardIds" JSONB NOT NULL DEFAULT '[]', "submittedAnswer" JSONB NOT NULL, "correct" BOOLEAN NOT NULL,
  "usedHint" BOOLEAN NOT NULL, "independent" BOOLEAN NOT NULL, "purpose" TEXT NOT NULL, "deliveryContext" TEXT,
  "responseDurationMs" INTEGER, "responseType" TEXT NOT NULL, "attemptedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumAttemptEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CurriculumAttemptEvent_learnerId_primaryStandardId_attemptedAt_idx" ON "CurriculumAttemptEvent"("learnerId", "primaryStandardId", "attemptedAt");
CREATE TABLE "CurriculumMasteryRecord" ("learnerId" TEXT NOT NULL, "standardId" TEXT NOT NULL, "state" TEXT NOT NULL, "scoredAttemptCount" INTEGER NOT NULL, "masteryAchievedAt" TIMESTAMP(3), "reviewStage" INTEGER, "nextReviewAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CurriculumMasteryRecord_pkey" PRIMARY KEY ("learnerId", "standardId"));
CREATE INDEX "CurriculumMasteryRecord_learnerId_state_nextReviewAt_idx" ON "CurriculumMasteryRecord"("learnerId", "state", "nextReviewAt");
CREATE TABLE "CurriculumLearningTarget" ("learnerId" TEXT NOT NULL, "standardId" TEXT NOT NULL, "active" BOOLEAN NOT NULL, CONSTRAINT "CurriculumLearningTarget_pkey" PRIMARY KEY ("learnerId", "standardId"));
CREATE TABLE "CurriculumPrerequisiteLink" ("standardId" TEXT NOT NULL, "prerequisiteStandardId" TEXT NOT NULL, "source" TEXT NOT NULL, "reviewed" BOOLEAN NOT NULL, CONSTRAINT "CurriculumPrerequisiteLink_pkey" PRIMARY KEY ("standardId", "prerequisiteStandardId"));
CREATE TABLE "CurriculumDiagnosticPlacement" ("id" TEXT NOT NULL, "learnerId" TEXT NOT NULL, "grouping" TEXT NOT NULL, "grade" TEXT NOT NULL, "learningTargetIds" JSONB NOT NULL DEFAULT '[]', "completedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CurriculumDiagnosticPlacement_pkey" PRIMARY KEY ("id"));
CREATE INDEX "CurriculumDiagnosticPlacement_learnerId_grouping_completedAt_idx" ON "CurriculumDiagnosticPlacement"("learnerId", "grouping", "completedAt");
