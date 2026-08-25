import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { evaluateAnswer } from "../domain/answer-evaluator";
import type { AttemptEvent, DiagnosticPlacement } from "../domain/progress";
import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";
import { ProgressService } from "./progress-service";
import { generateQuestion } from "./question-generator";
import { PrismaProgressRepository } from "../infrastructure/prisma-progress.repository";
import type { ProgressRepository } from "../domain/progress.repository";
import { catalogTemplateToQuestionTemplate } from "../infrastructure/k2-review-packet";
import { loadK2ContentCatalog } from "../infrastructure/k2-content-catalog";
import { validateK2ContentCatalog } from "../infrastructure/k2-content-catalog";
import { diagnosticPlacement, evaluateDiagnostic, type DiagnosticProbe } from "./diagnostic-placement";
import { selectNextLearningTemplates } from "./curriculum-sequence";
import { loadProductionLessonPlans } from "../infrastructure/lesson-plan-catalog";

type SessionPurpose = "practice" | "review" | "diagnostic" | "placement" | "proctored" | "adultScored";
type LearningSubject = "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY";
type StoredSession = { id: string; learnerId: string; purpose: SessionPurpose; grade: string; diagnosticGrouping: string; seed: number; position: number; length: number; templates: QuestionTemplate[]; instance: QuestionInstance; submittedInstanceIds: Set<string>; diagnosticProbes: DiagnosticProbe[]; proctoredCorrect: number; assessmentResult?: DiagnosticPlacement; retryTemplateId?: string; placement?: { subject: LearningSubject; grades: string[]; gradeIndex: number; templatesByGrade: QuestionTemplate[][]; correct: number; result: string | null } };
export const CURRICULUM_PROCTOR_CODE = Symbol("CURRICULUM_PROCTOR_CODE");
const seedAt = (seed: number, position: number) => Math.abs(Math.imul(seed ^ (position + 1), 2654435761)) >>> 0;
const subjectName = (subject: LearningSubject | undefined) => subject === "ELA" ? "Reading & Language" : subject === "MATH" ? "Math" : subject?.split("_").map((word) => `${word[0]}${word.slice(1).toLowerCase()}`).join(" ") ?? "Learning";
@Injectable()
export class LearningFacadeService {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly progress: ProgressService;
  constructor(@Inject(PrismaProgressRepository) private readonly repository: ProgressRepository, @Inject(CURRICULUM_PROCTOR_CODE) private readonly proctorCode: string | undefined = process.env.CURRICULUM_PROCTOR_CODE) { this.progress = new ProgressService(repository, { now: () => new Date() }); }
  async start(learnerId: string, purpose: SessionPurpose, seed = Math.floor(Math.random() * 2_147_483_647), submittedProctorCode?: string, grade = "K", subject?: LearningSubject) {
    if ((purpose === "proctored" || purpose === "adultScored" || purpose === "placement") && (!this.proctorCode || submittedProctorCode !== this.proctorCode)) throw new ForbiddenException("A parent or teacher verification code is required to start a proctored assessment.");
    if (purpose === "placement" && !subject) throw new ForbiddenException("Choose one subject before starting a placement check.");
    await validateK2ContentCatalog(); const catalog = await loadK2ContentCatalog(); const subjectFilter = subject === "SOCIAL_STUDIES" ? "socialStudies" : subject === "PHYSICAL_EDUCATION" ? "physicalEducation" : subject === "FINE_ARTS" ? "fineArts" : subject === "COMPUTER_SCIENCE" ? "computerScience" : subject === "INFORMATION_LITERACY" ? "informationLiteracy" : subject?.toLowerCase(); const templates = catalog.templates.filter((template) => template.grade === grade && template.review.status === "reviewed" && (!subjectFilter || template.subject === subjectFilter) && (purpose === "adultScored" ? template.generatorKind.endsWith("Adult") : !template.generatorKind.endsWith("Adult"))).map(catalogTemplateToQuestionTemplate);
    const placementGrades = ["K", "1", "2"]; const placementStages = purpose === "placement" ? placementGrades.map((item) => ({ grade: item, templates: catalog.templates.filter((template) => template.grade === item && template.subject === subjectFilter && template.review.status === "reviewed" && !template.generatorKind.endsWith("Adult")).map(catalogTemplateToQuestionTemplate) })).filter((stage) => stage.templates.length > 0) : [];
    const placementTemplatesByGrade = placementStages.map((stage) => stage.templates);
    const availableTemplates = purpose === "placement" ? placementTemplatesByGrade[0] ?? [] : templates;
    if (!availableTemplates.length) throw new Error(`No approved ${subject ?? ""} Grade ${grade === "K" ? "Kindergarten" : grade} content is available.`);
    await this.progress.markDue(learnerId); const mastery = await this.repository.listMastery(learnerId);
    const activeTemplates = purpose === "placement" ? availableTemplates : purpose === "practice" ? selectNextLearningTemplates(templates, mastery) : purpose === "adultScored" ? selectNextLearningTemplates(templates, mastery, 1) : templates;
    if (!activeTemplates.length) throw new Error("All skills are mastered for now. Return when a scheduled review is due.");
    const selected = activeTemplates[seedAt(seed, 0) % activeTemplates.length]; const sessionTemplates = purpose === "proctored" ? templates.filter((template) => template.primaryStandardId === selected.primaryStandardId) : activeTemplates;
    const sessionPurpose: SessionPurpose = purpose === "practice" && mastery.some((record) => record.standardId === selected.primaryStandardId && record.state === "reviewDue") ? "review" : purpose;
    const instance = generateQuestion(selected, seedAt(seed, 0)); const session = { id: randomUUID(), learnerId, purpose: sessionPurpose, grade: selected.grade, diagnosticGrouping: subjectName(subject), seed, position: 0, length: purpose === "placement" ? 5 : purpose === "adultScored" ? 1 : purpose === "proctored" ? 5 : purpose === "diagnostic" ? 4 : 10, templates: sessionTemplates, instance, submittedInstanceIds: new Set<string>(), diagnosticProbes: [], proctoredCorrect: 0, placement: purpose === "placement" ? { subject: subject!, grades: placementStages.map((stage) => stage.grade), gradeIndex: 0, templatesByGrade: placementTemplatesByGrade, correct: 0, result: null } : undefined }; this.sessions.set(session.id, session); return this.view(session);
  }
  async submit(sessionId: string, answer: unknown, usedHint = false) {
    const session = this.requireSession(sessionId);
    const evaluation = evaluateAnswer(session.instance, answer);
    if (session.submittedInstanceIds.has(session.instance.id)) return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: "unchanged", complete: session.position + 1 >= session.length, placement: this.placementView(session.assessmentResult) };
    const attempt: AttemptEvent = { id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId, templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1), submittedAnswer: answer, correct: evaluation.correct, usedHint, independent: !evaluation.requiresHumanReview, purpose: session.purpose, deliveryContext: "standaloneLearning", responseDurationMs: null, attemptedAt: new Date(), responseType: session.instance.responseType };
    session.submittedInstanceIds.add(session.instance.id);
    const retry = !evaluation.correct && (session.purpose === "practice" || session.purpose === "review");
    if (retry) session.retryTemplateId = session.instance.templateId;
    if (session.purpose === "placement" && session.placement) {
      session.placement.correct += Number(evaluation.correct);
      const stageComplete = session.position + 1 >= session.length;
      const mastery = await this.progress.recordAttempt(attempt);
      if (!stageComplete) return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete: false };
      const passed = session.placement.correct / session.length >= 0.8;
      const hasNext = passed && session.placement.gradeIndex + 1 < session.placement.grades.length;
      if (!hasNext) {
        const grade = passed ? session.placement.grades[session.placement.gradeIndex] : session.placement.grades[Math.max(0, session.placement.gradeIndex - 1)];
        session.placement.result = grade;
        session.assessmentResult = { learnerId: session.learnerId, grouping: subjectName(session.placement.subject), grade, learningTargetIds: [], completedAt: new Date() };
        await this.repository.saveDiagnosticPlacement(session.assessmentResult);
      }
      return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete: !hasNext, placement: this.placementView(session.assessmentResult) };
    }
    if (session.purpose === "diagnostic") {
      session.diagnosticProbes.push({ standardId: attempt.primaryStandardId, grade: session.grade, correct: evaluation.correct, independent: attempt.independent });
      if (session.position === 3 && session.diagnosticProbes.filter((probe) => probe.correct).length === 2) session.length = 6;
    }
    if (session.purpose === "proctored" && evaluation.correct) session.proctoredCorrect += 1;
    const complete = session.position + 1 >= session.length;
    const mastery = complete && session.purpose === "proctored" && session.proctoredCorrect >= 4 ? await this.progress.verifyProctoredMastery(session.learnerId, attempt.primaryStandardId) : await this.progress.recordAttempt(attempt);
    if (complete && session.purpose === "diagnostic") {
      session.assessmentResult = diagnosticPlacement(session.learnerId, evaluateDiagnostic(session.diagnosticGrouping, session.diagnosticProbes), { now: () => new Date() });
      await this.repository.saveDiagnosticPlacement(session.assessmentResult);
    }
    return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete, retry, placement: this.placementView(session.assessmentResult) };
  }
  async scoreAdult(sessionId: string, demonstrated: boolean, evidenceNote?: string) {
    const session = this.requireSession(sessionId); if (session.purpose !== "adultScored") throw new ForbiddenException("This activity requires automatic scoring."); if (session.submittedInstanceIds.has(session.instance.id)) return { correct: demonstrated, explanation: session.instance.explanation, masteryState: "unchanged", complete: true };
    const adultEvidence = evidenceNote?.trim().slice(0, 1000);
    const attempt: AttemptEvent = { id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId, templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1), submittedAnswer: { adultScore: demonstrated ? "demonstrated" : "notYet", ...(adultEvidence ? { adultEvidence } : {}) }, correct: demonstrated, usedHint: false, independent: false, purpose: "adultScored", deliveryContext: "adultProctored", responseDurationMs: null, attemptedAt: new Date(), responseType: session.instance.responseType };
    session.submittedInstanceIds.add(session.instance.id);
    const recorded = await this.progress.recordAttempt(attempt);
    const successfulObservations = (await this.repository.listAttempts(session.learnerId, attempt.primaryStandardId)).filter((item) => item.purpose === "adultScored" && item.correct).length;
    const hasEnoughObservations = demonstrated && successfulObservations >= 2;
    const mastery = hasEnoughObservations ? await this.progress.verifyProctoredMastery(session.learnerId, attempt.primaryStandardId) : recorded;
    return {
      correct: demonstrated,
      explanation: !demonstrated ? "Keep practicing this skill with an adult." : hasEnoughObservations ? "The adult confirmed this skill twice. It is ready for review later." : "The adult recorded one successful observation. Complete it successfully with an adult once more to confirm the skill.",
      masteryState: hasEnoughObservations ? mastery.state : demonstrated ? "observedOnce" : mastery.state,
      complete: true
    };
  }
  next(sessionId: string) { const session = this.requireSession(sessionId); if (session.position + 1 >= session.length) { if (!session.placement || session.placement.result) return null; session.placement.gradeIndex += 1; session.placement.correct = 0; session.templates = session.placement.templatesByGrade[session.placement.gradeIndex]; session.grade = session.templates[0].grade; session.position = 0; session.instance = generateQuestion(session.templates[seedAt(session.seed, 0) % session.templates.length], seedAt(session.seed, 0)); return this.view(session); } session.position += 1; const retryTemplate = session.retryTemplateId ? session.templates.find((template) => template.id === session.retryTemplateId) : undefined; session.retryTemplateId = undefined; const candidates = retryTemplate ? [retryTemplate] : session.templates.filter((template) => template.id !== session.instance.templateId); const template = candidates[seedAt(session.seed, session.position) % candidates.length] ?? session.templates[0]; session.grade = template.grade; session.instance = generateQuestion(template, seedAt(session.seed, session.position)); return this.view(session); }
  async progressFor(learnerId: string) {
    const [attempts, mastery, placements] = await Promise.all([this.repository.listAttempts(learnerId), this.repository.listMastery(learnerId), this.repository.listDiagnosticPlacements(learnerId)]);
    const latestAssessment = attempts.filter((attempt) => attempt.purpose === "diagnostic" || attempt.purpose === "placement").sort((left, right) => right.attemptedAt.getTime() - left.attemptedAt.getTime())[0];
    return { attempts, mastery, latestDiagnosticPlacement: placements[0] ?? null, latestAssessmentSessionId: latestAssessment?.sessionId ?? null };
  }
  async lessonPlans() { return loadProductionLessonPlans(); }
  get(sessionId: string) { return this.view(this.requireSession(sessionId)); }
  submitForLearner(sessionId: string, learnerId: string, answer: unknown, usedHint = false) { this.requireOwnedSession(sessionId, learnerId); return this.submit(sessionId, answer, usedHint); }
  scoreAdultForLearner(sessionId: string, learnerId: string, demonstrated: boolean, evidenceNote?: string) { this.requireOwnedSession(sessionId, learnerId); return this.scoreAdult(sessionId, demonstrated, evidenceNote); }
  nextForLearner(sessionId: string, learnerId: string) { this.requireOwnedSession(sessionId, learnerId); return this.next(sessionId); }
  getForLearner(sessionId: string, learnerId: string) { return this.view(this.requireOwnedSession(sessionId, learnerId)); }
  private requireSession(id: string) { const session = this.sessions.get(id); if (!session) throw new Error("Learning session is unavailable. Start a new session."); return session; }
  private requireOwnedSession(id: string, learnerId: string) { const session = this.requireSession(id); if (session.learnerId !== learnerId) throw new ForbiddenException("This learning session belongs to another student."); return session; }
  private placementView(placement: DiagnosticPlacement | undefined) { return placement ? { grouping: placement.grouping, grade: placement.grade, learningTargetIds: placement.learningTargetIds } : undefined; }
  private view(session: StoredSession) { const { canonicalAnswer: _answer, ...instance } = session.instance; return { sessionId: session.id, position: session.position, length: session.length, question: instance }; }
}
