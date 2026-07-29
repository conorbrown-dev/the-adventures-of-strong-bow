import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { evaluateAnswer } from "../domain/answer-evaluator";
import type { AttemptEvent } from "../domain/progress";
import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";
import { ProgressService } from "./progress-service";
import { generateQuestion } from "./question-generator";
import { PrismaProgressRepository } from "../infrastructure/prisma-progress.repository";
import type { ProgressRepository } from "../domain/progress.repository";
import { catalogTemplateToQuestionTemplate } from "../infrastructure/k2-review-packet";
import { loadK2ContentCatalog } from "../infrastructure/k2-content-catalog";
import { validateK2ContentCatalog } from "../infrastructure/k2-content-catalog";
import { diagnosticPlacement, evaluateDiagnostic, type DiagnosticProbe } from "./diagnostic-placement";

type SessionPurpose = "practice" | "review" | "diagnostic" | "proctored";
type StoredSession = { id: string; learnerId: string; purpose: SessionPurpose; seed: number; position: number; length: number; templates: QuestionTemplate[]; instance: QuestionInstance; submittedInstanceIds: Set<string>; diagnosticProbes: DiagnosticProbe[]; proctoredCorrect: number };
const seedAt = (seed: number, position: number) => Math.abs(Math.imul(seed ^ (position + 1), 2654435761)) >>> 0;
@Injectable()
export class LearningFacadeService {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly progress: ProgressService;
  constructor(@Inject(PrismaProgressRepository) private readonly repository: ProgressRepository, private readonly proctorCode = process.env.CURRICULUM_PROCTOR_CODE) { this.progress = new ProgressService(repository, { now: () => new Date() }); }
  async start(learnerId: string, purpose: SessionPurpose, seed = Math.floor(Math.random() * 2_147_483_647), submittedProctorCode?: string, grade = "K") {
    if (purpose === "proctored" && (!this.proctorCode || submittedProctorCode !== this.proctorCode)) throw new ForbiddenException("A parent or teacher verification code is required to start a proctored assessment.");
    await validateK2ContentCatalog(); const catalog = await loadK2ContentCatalog(); const templates = catalog.templates.filter((template) => template.grade === grade && template.review.status === "reviewed").map(catalogTemplateToQuestionTemplate);
    if (!templates.length) throw new Error(`No approved Grade ${grade === "K" ? "Kindergarten" : grade} content is available.`);
    await this.progress.markDue(learnerId); const mastery = await this.repository.listMastery(learnerId); const activeTemplates = purpose === "practice" ? this.templatesForPractice(templates, mastery) : templates;
    if (!activeTemplates.length) throw new Error("All skills are mastered for now. Return when a scheduled review is due.");
    const selected = activeTemplates[seedAt(seed, 0) % activeTemplates.length]; const sessionTemplates = purpose === "proctored" ? templates.filter((template) => template.primaryStandardId === selected.primaryStandardId) : activeTemplates;
    const sessionPurpose: SessionPurpose = purpose === "practice" && mastery.some((record) => record.standardId === selected.primaryStandardId && record.state === "reviewDue") ? "review" : purpose;
    const instance = generateQuestion(selected, seedAt(seed, 0)); const session = { id: randomUUID(), learnerId, purpose: sessionPurpose, seed, position: 0, length: purpose === "proctored" ? 5 : purpose === "diagnostic" ? 4 : 10, templates: sessionTemplates, instance, submittedInstanceIds: new Set<string>(), diagnosticProbes: [], proctoredCorrect: 0 }; this.sessions.set(session.id, session); return this.view(session);
  }
  async submit(sessionId: string, answer: unknown) {
    const session = this.requireSession(sessionId); const evaluation = evaluateAnswer(session.instance, answer); if (session.submittedInstanceIds.has(session.instance.id)) return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: "unchanged", complete: session.position + 1 >= session.length }; const attempt: AttemptEvent = { id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId, templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1), submittedAnswer: answer, correct: evaluation.correct, usedHint: false, independent: !evaluation.requiresHumanReview, purpose: session.purpose, deliveryContext: "standaloneLearning", responseDurationMs: null, attemptedAt: new Date(), responseType: session.instance.responseType };
    session.submittedInstanceIds.add(session.instance.id); if (session.purpose === "diagnostic") { session.diagnosticProbes.push({ standardId: attempt.primaryStandardId, grade: "K", correct: evaluation.correct, independent: attempt.independent }); if (session.position === 3 && session.diagnosticProbes.filter((probe) => probe.correct).length === 2) session.length = 6; } if (session.purpose === "proctored" && evaluation.correct) session.proctoredCorrect += 1; const complete = session.position + 1 >= session.length; const mastery = complete && session.purpose === "proctored" && session.proctoredCorrect >= 4 ? await this.progress.verifyProctoredMastery(session.learnerId, attempt.primaryStandardId) : await this.progress.recordAttempt(attempt); if (complete && session.purpose === "diagnostic") await this.repository.saveDiagnosticPlacement(diagnosticPlacement(session.learnerId, evaluateDiagnostic("Kindergarten", session.diagnosticProbes), { now: () => new Date() })); return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete };
  }
  next(sessionId: string) { const session = this.requireSession(sessionId); if (session.position + 1 >= session.length) return null; session.position += 1; const candidates = session.templates.filter((template) => template.id !== session.instance.templateId); const template = candidates[seedAt(session.seed, session.position) % candidates.length] ?? session.templates[0]; session.instance = generateQuestion(template, seedAt(session.seed, session.position)); return this.view(session); }
  async progressFor(learnerId: string) { const [attempts, mastery, placements] = await Promise.all([this.repository.listAttempts(learnerId), this.repository.listMastery(learnerId), this.repository.listDiagnosticPlacements(learnerId)]); return { attempts, mastery, latestDiagnosticPlacement: placements[0] ?? null }; }
  get(sessionId: string) { return this.view(this.requireSession(sessionId)); }
  private templatesForPractice(templates: QuestionTemplate[], mastery: Awaited<ReturnType<ProgressRepository["listMastery"]>>) { const mastered = new Set(mastery.filter((record) => record.state === "mastered").map((record) => record.standardId)); return templates.filter((template) => !mastered.has(template.primaryStandardId)); }
  private requireSession(id: string) { const session = this.sessions.get(id); if (!session) throw new Error("Learning session is unavailable. Start a new session."); return session; }
  private view(session: StoredSession) { const { canonicalAnswer: _answer, ...instance } = session.instance; return { sessionId: session.id, position: session.position, length: session.length, question: instance }; }
}
