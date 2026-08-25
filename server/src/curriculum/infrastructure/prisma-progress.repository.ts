import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AttemptEvent, DiagnosticPlacement, LearningSessionRecord, LearningTarget, MasteryRecord, PrerequisiteLink } from "../domain/progress";
import type { ProgressRepository } from "../domain/progress.repository";

@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}
  async addAttempt(attempt: AttemptEvent) { try { await this.prisma.curriculumAttemptEvent.create({ data: { ...attempt, supportingStandardIds: attempt.supportingStandardIds, submittedAnswer: attempt.submittedAnswer as Prisma.InputJsonValue } }); } catch (error) { if ((error as { code?: string }).code !== "P2002") throw error; } }
  async listAttempts(learnerId: string, standardId?: string): Promise<AttemptEvent[]> { return (await this.prisma.curriculumAttemptEvent.findMany({ where: { learnerId, ...(standardId ? { primaryStandardId: standardId } : {}) }, orderBy: { attemptedAt: "asc" } })).map((row) => ({ ...row, supportingStandardIds: row.supportingStandardIds as string[], submittedAnswer: row.submittedAnswer, purpose: row.purpose as AttemptEvent["purpose"], responseType: row.responseType as AttemptEvent["responseType"] })); }
  async saveMastery(record: MasteryRecord) { await this.prisma.curriculumMasteryRecord.upsert({ where: { learnerId_standardId: { learnerId: record.learnerId, standardId: record.standardId } }, create: record, update: record }); }
  async getMastery(learnerId: string, standardId: string): Promise<MasteryRecord | null> { const row = await this.prisma.curriculumMasteryRecord.findUnique({ where: { learnerId_standardId: { learnerId, standardId } } }); return row ? { ...row, state: row.state as MasteryRecord["state"] } : null; }
  async listMastery(learnerId: string): Promise<MasteryRecord[]> { return (await this.prisma.curriculumMasteryRecord.findMany({ where: { learnerId } })).map((row) => ({ ...row, state: row.state as MasteryRecord["state"] })); }
  async saveLearningTarget(target: LearningTarget) { await this.prisma.curriculumLearningTarget.upsert({ where: { learnerId_standardId: target }, create: target, update: target }); }
  async listLearningTargets(learnerId: string): Promise<LearningTarget[]> { return this.prisma.curriculumLearningTarget.findMany({ where: { learnerId } }); }
  async listPrerequisites(standardId: string): Promise<PrerequisiteLink[]> { return this.prisma.curriculumPrerequisiteLink.findMany({ where: { standardId } }).then((rows) => rows.map((row) => ({ ...row, source: row.source as PrerequisiteLink["source"] }))); }
  async saveDiagnosticPlacement(placement: DiagnosticPlacement) { await this.prisma.curriculumDiagnosticPlacement.create({ data: { ...placement, learningTargetIds: placement.learningTargetIds, report: placement.report as Prisma.InputJsonValue } }); }
  async listDiagnosticPlacements(learnerId: string): Promise<DiagnosticPlacement[]> { return (await this.prisma.curriculumDiagnosticPlacement.findMany({ where: { learnerId }, orderBy: { completedAt: "desc" } })).map((row) => ({ ...row, learningTargetIds: row.learningTargetIds as string[], report: row.report as Record<string, unknown> })); }
  async saveLearningSession(session: LearningSessionRecord) { await this.prisma.curriculumLearningSession.upsert({ where: { id: session.id }, create: { ...session, state: session.state as Prisma.InputJsonValue }, update: { learnerId: session.learnerId, purpose: session.purpose, seed: session.seed, position: session.position, length: session.length, state: session.state as Prisma.InputJsonValue, status: session.status, completedAt: session.completedAt } }); }
  async findLearningSession(sessionId: string): Promise<LearningSessionRecord | null> { const row = await this.prisma.curriculumLearningSession.findUnique({ where: { id: sessionId } }); return row ? { ...row, purpose: row.purpose as LearningSessionRecord["purpose"], state: row.state as Record<string, unknown>, status: row.status as LearningSessionRecord["status"] } : null; }
}
