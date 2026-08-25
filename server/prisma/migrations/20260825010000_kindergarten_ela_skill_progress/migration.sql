ALTER TABLE "CurriculumAttemptEvent"
ADD COLUMN "activityId" TEXT,
ADD COLUMN "activityVersion" INTEGER,
ADD COLUMN "primarySkillId" TEXT,
ADD COLUMN "supportingSkillIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "evidenceMode" TEXT,
ADD COLUMN "supportEvents" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "CurriculumSkillProgress" (
  "learnerId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "skillVersion" INTEGER NOT NULL,
  "state" TEXT NOT NULL,
  "highestCompletedPhase" TEXT,
  "independentAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "masteryAchievedAt" TIMESTAMP(3),
  "reviewStage" INTEGER,
  "nextReviewAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSkillProgress_pkey" PRIMARY KEY ("learnerId", "skillId", "skillVersion")
);

CREATE INDEX "CurriculumSkillProgress_learnerId_state_nextReviewAt_idx"
ON "CurriculumSkillProgress"("learnerId", "state", "nextReviewAt");

CREATE TABLE "CurriculumSkillEvidenceEvent" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "activityInstanceId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "activityVersion" INTEGER NOT NULL,
  "primarySkillId" TEXT NOT NULL,
  "supportingSkillIds" JSONB NOT NULL DEFAULT '[]',
  "purpose" TEXT NOT NULL,
  "evidenceMode" TEXT NOT NULL,
  "supportEvents" JSONB NOT NULL DEFAULT '[]',
  "successful" BOOLEAN NOT NULL,
  "response" JSONB NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSkillEvidenceEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CurriculumSkillEvidenceEvent_learnerId_primarySkillId_attemptedAt_idx"
ON "CurriculumSkillEvidenceEvent"("learnerId", "primarySkillId", "attemptedAt");

CREATE UNIQUE INDEX "CurriculumSkillEvidenceEvent_learnerId_sessionId_activityInstanceId_purpose_key"
ON "CurriculumSkillEvidenceEvent"("learnerId", "sessionId", "activityInstanceId", "purpose");
