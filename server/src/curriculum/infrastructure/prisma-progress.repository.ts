import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AttemptEvent, DiagnosticPlacement, LearningTarget, MasteryRecord, PrerequisiteLink } from "../domain/progress";
import type { ProgressRepository } from "../domain/progress.repository";

@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}
  async addAttempt(attempt: AttemptEvent) { await this.prisma.curriculumAttemptEvent.create({ data: { ...attempt, supportingStandardIds: attempt.supportingStandardIds, submittedAnswer: attempt.submittedAnswer as Prisma.InputJsonValue } }); }
  async listAttempts(learnerId: string, standardId?: string): Promise<AttemptEvent[]> { return (await this.prisma.curriculumAttemptEvent.findMany({ where: { learnerId, ...(standardId ? { primaryStandardId: standardId } : {}) }, orderBy: { attemptedAt: "asc" } })).map((row) => ({ ...row, supportingStandardIds: row.supportingStandardIds as string[], submittedAnswer: row.submittedAnswer, purpose: row.purpose as AttemptEvent["purpose"], responseType: row.responseType as AttemptEvent["responseType"] })); }
  async saveMastery(record: MasteryRecord) { await this.prisma.curriculumMasteryRecord.upsert({ where: { learnerId_standardId: { learnerId: record.learnerId, standardId: record.standardId } }, create: record, update: record }); }
  async getMastery(learnerId: string, standardId: string): Promise<MasteryRecord | null> { const row = await this.prisma.curriculumMasteryRecord.findUnique({ where: { learnerId_standardId: { learnerId, standardId } } }); return row ? { ...row, state: row.state as MasteryRecord["state"] } : null; }
  async listMastery(learnerId: string): Promise<MasteryRecord[]> { return (await this.prisma.curriculumMasteryRecord.findMany({ where: { learnerId } })).map((row) => ({ ...row, state: row.state as MasteryRecord["state"] })); }
  async saveLearningTarget(target: LearningTarget) { await this.prisma.curriculumLearningTarget.upsert({ where: { learnerId_standardId: target }, create: target, update: target }); }
  async listLearningTargets(learnerId: string): Promise<LearningTarget[]> { return this.prisma.curriculumLearningTarget.findMany({ where: { learnerId } }); }
  async listPrerequisites(standardId: string): Promise<PrerequisiteLink[]> { return this.prisma.curriculumPrerequisiteLink.findMany({ where: { standardId } }).then((rows) => rows.map((row) => ({ ...row, source: row.source as PrerequisiteLink["source"] }))); }
  async saveDiagnosticPlacement(placement: DiagnosticPlacement) { await this.prisma.curriculumDiagnosticPlacement.create({ data: { ...placement, learningTargetIds: placement.learningTargetIds } }); }
}
