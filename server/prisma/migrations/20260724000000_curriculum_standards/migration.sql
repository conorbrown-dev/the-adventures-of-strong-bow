CREATE TABLE "CurriculumStandard" (
  "officialId" TEXT NOT NULL,
  "canonicalId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "gradeName" TEXT NOT NULL,
  "domainCode" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "strand" TEXT,
  "clusterCode" TEXT,
  "parentId" TEXT,
  "sourceItem" TEXT,
  "statement" TEXT NOT NULL,
  "childFriendlyDescription" TEXT,
  "isLeaf" BOOLEAN NOT NULL,
  "instructionalStatus" TEXT NOT NULL,
  "prerequisiteIds" JSONB NOT NULL DEFAULT '[]',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "source" JSONB NOT NULL,
  "license" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumStandard_pkey" PRIMARY KEY ("officialId")
);

CREATE UNIQUE INDEX "CurriculumStandard_canonicalId_key" ON "CurriculumStandard"("canonicalId");
CREATE INDEX "CurriculumStandard_subject_grade_domainCode_idx" ON "CurriculumStandard"("subject", "grade", "domainCode");
CREATE INDEX "CurriculumStandard_active_instructionalStatus_idx" ON "CurriculumStandard"("active", "instructionalStatus");
