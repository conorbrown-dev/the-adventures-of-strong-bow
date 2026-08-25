import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { evaluateAnswer } from "../domain/answer-evaluator";
import type { AttemptEvent, DiagnosticPlacement, LearningSessionRecord } from "../domain/progress";
import type { ProgressRepository } from "../domain/progress.repository";
import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";
import { PrismaProgressRepository } from "../infrastructure/prisma-progress.repository";
import { catalogTemplateToQuestionTemplate } from "../infrastructure/k2-review-packet";
import { loadK2ContentCatalog, validateK2ContentCatalog } from "../infrastructure/k2-content-catalog";
import { loadProductionLessonPlans } from "../infrastructure/lesson-plan-catalog";
import { selectNextLearningTemplates } from "./curriculum-sequence";
import {
  advanceDiagnostic,
  buildDiagnosticReport,
  createDiagnosticBlueprint,
  evidenceForSkill,
  markDiagnosticSkillUnavailable,
  recordDiagnosticProbe,
  selectNextDiagnosticSkill,
  startDiagnostic,
  type DiagnosticReport,
  type DiagnosticState
} from "./diagnostic-assessment";
import { diagnosticQuestionFingerprint } from "./diagnostic-question-fingerprint";
import { ProgressService } from "./progress-service";
import { generateQuestion } from "./question-generator";

type SessionPurpose = "practice" | "review" | "diagnostic" | "placement" | "proctored" | "adultScored";
type LearningSubject = "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY";
type StoredSession = {
  id: string; learnerId: string; purpose: SessionPurpose; grade: string; diagnosticGrouping: string; seed: number; position: number; length: number;
  templates: QuestionTemplate[]; instance: QuestionInstance; submittedInstanceIds: Set<string>; diagnosticQuestionFingerprints: Set<string>; proctoredCorrect: number;
  assessmentResult?: DiagnosticPlacement; retryTemplateId?: string; diagnostic?: DiagnosticState; createdAt: Date; status: "active" | "completed";
};
type PersistedSessionState = {
  grade: string; diagnosticGrouping: string; templateIds: string[]; instance: QuestionInstance; submittedInstanceIds: string[]; diagnosticQuestionFingerprints?: string[]; proctoredCorrect: number;
  assessmentResult?: Omit<DiagnosticPlacement, "completedAt"> & { completedAt: string }; retryTemplateId?: string; diagnostic?: DiagnosticState;
};

export const CURRICULUM_PROCTOR_CODE = Symbol("CURRICULUM_PROCTOR_CODE");
const seedAt = (seed: number, position: number) => Math.abs(Math.imul(seed ^ (position + 1), 2654435761)) >>> 0;
const subjectName = (subject: LearningSubject | undefined) => subject === "ELA" ? "Reading & Language" : subject === "MATH" ? "Math" : subject?.split("_").map((word) => `${word[0]}${word.slice(1).toLowerCase()}`).join(" ") ?? "Learning";
const catalogSubject = (subject: LearningSubject | undefined) => subject === "SOCIAL_STUDIES" ? "socialStudies" : subject === "PHYSICAL_EDUCATION" ? "physicalEducation" : subject === "FINE_ARTS" ? "fineArts" : subject === "COMPUTER_SCIENCE" ? "computerScience" : subject === "INFORMATION_LITERACY" ? "informationLiteracy" : subject?.toLowerCase();
const isAdaptiveAssessment = (purpose: SessionPurpose) => purpose === "diagnostic" || purpose === "placement";

@Injectable()
export class LearningFacadeService {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly progress: ProgressService;

  constructor(
    @Inject(PrismaProgressRepository) private readonly repository: ProgressRepository,
    @Inject(CURRICULUM_PROCTOR_CODE) private readonly proctorCode: string | undefined = process.env.CURRICULUM_PROCTOR_CODE
  ) { this.progress = new ProgressService(repository, { now: () => new Date() }); }

  async start(learnerId: string, purpose: SessionPurpose, seed = Math.floor(Math.random() * 2_147_483_647), submittedProctorCode?: string, grade = "K", subject?: LearningSubject) {
    if ((purpose === "proctored" || purpose === "adultScored" || purpose === "placement") && (!this.proctorCode || submittedProctorCode !== this.proctorCode)) throw new ForbiddenException("A parent or teacher verification code is required to start a proctored assessment.");
    if (isAdaptiveAssessment(purpose) && subject !== "ELA" && subject !== "MATH") throw new ForbiddenException("Choose Reading & Language or Math before starting a diagnostic or placement check.");
    await validateK2ContentCatalog();
    const allTemplates = (await loadK2ContentCatalog()).templates.map(catalogTemplateToQuestionTemplate);
    const subjectFilter = catalogSubject(subject);
    const approved = allTemplates.filter((template) => template.review.status === "reviewed" && (!subjectFilter || template.subject === subjectFilter));
    const templates = approved.filter((template) => template.grade === grade && (purpose === "adultScored" ? template.generator.kind.endsWith("Adult") : !template.generator.kind.endsWith("Adult")));
    const diagnosticTemplates = isAdaptiveAssessment(purpose) ? approved.filter((template) => template.diagnosticEligible && !template.generator.kind.endsWith("Adult")) : [];
    const availableTemplates = isAdaptiveAssessment(purpose) ? diagnosticTemplates : templates;
    if (!availableTemplates.length) throw new Error(`No approved ${subject ?? ""} Grade ${grade === "K" ? "Kindergarten" : grade} content is available.`);
    await this.progress.markDue(learnerId);
    const mastery = await this.repository.listMastery(learnerId);
    const activeTemplates = isAdaptiveAssessment(purpose) ? availableTemplates : purpose === "practice" ? selectNextLearningTemplates(templates, mastery) : purpose === "adultScored" ? selectNextLearningTemplates(templates, mastery, 1) : templates;
    if (!activeTemplates.length) throw new Error("All skills are mastered for now. Return when a scheduled review is due.");
    const diagnostic = isAdaptiveAssessment(purpose) ? startDiagnostic(createDiagnosticBlueprint(activeTemplates, subject as "ELA" | "MATH", subjectName(subject), seed)) : undefined;
    const selected = diagnostic ? this.requireDiagnosticTemplate(diagnostic, activeTemplates) : activeTemplates[seedAt(seed, 0) % activeTemplates.length];
    const sessionPurpose: SessionPurpose = purpose === "practice" && mastery.some((record) => record.standardId === selected.primaryStandardId && record.state === "reviewDue") ? "review" : purpose;
    const sessionTemplates = purpose === "proctored" ? templates.filter((template) => template.primaryStandardId === selected.primaryStandardId) : activeTemplates;
    const now = new Date();
    const instance = generateQuestion(selected, seedAt(seed, 0));
    const session: StoredSession = {
      id: randomUUID(), learnerId, purpose: sessionPurpose, grade: selected.grade, diagnosticGrouping: subjectName(subject), seed, position: 0,
      length: diagnostic ? diagnostic.blueprint.grades[0].maximumItems : purpose === "adultScored" ? 1 : purpose === "proctored" ? 5 : 10,
      templates: sessionTemplates, instance, submittedInstanceIds: new Set<string>(), diagnosticQuestionFingerprints: new Set(diagnostic ? [diagnosticQuestionFingerprint(instance)] : []), proctoredCorrect: 0,
      diagnostic, createdAt: now, status: "active"
    };
    this.sessions.set(session.id, session);
    await this.checkpoint(session);
    return this.view(session);
  }

  async submit(sessionId: string, answer: unknown, usedHint = false) {
    const session = await this.requireSession(sessionId);
    const evaluation = evaluateAnswer(session.instance, answer);
    if (session.submittedInstanceIds.has(session.instance.id)) return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: "unchanged", complete: session.status === "completed", placement: this.placementView(session.assessmentResult) };
    const attempt: AttemptEvent = {
      id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId,
      templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1),
      submittedAnswer: answer, correct: evaluation.correct, usedHint, independent: !evaluation.requiresHumanReview, purpose: session.purpose,
      deliveryContext: "standaloneLearning", responseDurationMs: null, attemptedAt: new Date(), responseType: session.instance.responseType
    };
    session.submittedInstanceIds.add(session.instance.id);
    const retry = !evaluation.correct && (session.purpose === "practice" || session.purpose === "review");
    if (retry) session.retryTemplateId = session.instance.templateId;
    const mastery = await this.progress.recordAttempt(attempt);
    if (session.diagnostic) {
      const currentGrade = session.diagnostic.blueprint.grades[session.diagnostic.gradeIndex];
      const currentSkill = currentGrade.domains.flatMap((domain) => domain.skills).find((skill) => skill.standardId === attempt.primaryStandardId);
      if (!currentSkill) throw new Error(`The diagnostic blueprint does not contain ${attempt.primaryStandardId}.`);
      session.diagnostic = recordDiagnosticProbe(session.diagnostic, {
        standardId: attempt.primaryStandardId, grade: session.grade, domain: currentSkill.domain, templateId: attempt.templateId,
        questionInstanceId: attempt.questionInstanceId, difficultyBand: session.templates.find((template) => template.id === attempt.templateId)?.difficulty.band ?? 1,
        correct: evaluation.correct, independent: attempt.independent
      });
      session.diagnostic = advanceDiagnostic(session.diagnostic);
      if (session.diagnostic.isComplete) await this.completeDiagnostic(session);
      await this.checkpoint(session);
      return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete: session.status === "completed", placement: this.placementView(session.assessmentResult) };
    }
    if (session.purpose === "proctored" && evaluation.correct) session.proctoredCorrect += 1;
    const complete = session.position + 1 >= session.length;
    const finalMastery = complete && session.purpose === "proctored" && session.proctoredCorrect >= 4 ? await this.progress.verifyProctoredMastery(session.learnerId, attempt.primaryStandardId) : mastery;
    if (complete) session.status = "completed";
    await this.checkpoint(session);
    return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: finalMastery.state, complete, retry, placement: this.placementView(session.assessmentResult) };
  }

  async scoreAdult(sessionId: string, demonstrated: boolean, evidenceNote?: string) {
    const session = await this.requireSession(sessionId);
    if (session.purpose !== "adultScored") throw new ForbiddenException("This activity requires automatic scoring.");
    if (session.submittedInstanceIds.has(session.instance.id)) return { correct: demonstrated, explanation: session.instance.explanation, masteryState: "unchanged", complete: true };
    const adultEvidence = evidenceNote?.trim().slice(0, 1000);
    const attempt: AttemptEvent = {
      id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId,
      templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1),
      submittedAnswer: { adultScore: demonstrated ? "demonstrated" : "notYet", ...(adultEvidence ? { adultEvidence } : {}) }, correct: demonstrated,
      usedHint: false, independent: false, purpose: "adultScored", deliveryContext: "adultProctored", responseDurationMs: null,
      attemptedAt: new Date(), responseType: session.instance.responseType
    };
    session.submittedInstanceIds.add(session.instance.id);
    const recorded = await this.progress.recordAttempt(attempt);
    const successfulObservations = (await this.repository.listAttempts(session.learnerId, attempt.primaryStandardId)).filter((item) => item.purpose === "adultScored" && item.correct).length;
    const hasEnoughObservations = demonstrated && successfulObservations >= 2;
    const mastery = hasEnoughObservations ? await this.progress.verifyProctoredMastery(session.learnerId, attempt.primaryStandardId) : recorded;
    session.status = "completed";
    await this.checkpoint(session);
    return {
      correct: demonstrated,
      explanation: !demonstrated ? "Keep practicing this skill with an adult." : hasEnoughObservations ? "The adult confirmed this skill twice. It is ready for review later." : "The adult recorded one successful observation. Complete it successfully with an adult once more to confirm the skill.",
      masteryState: hasEnoughObservations ? mastery.state : demonstrated ? "observedOnce" : mastery.state,
      complete: true
    };
  }

  async next(sessionId: string) {
    const session = await this.requireSession(sessionId);
    if (session.status === "completed") return null;
    if (session.diagnostic) {
      while (!session.diagnostic.isComplete) {
        const skill = selectNextDiagnosticSkill(session.diagnostic);
        if (!skill) {
          session.diagnostic = advanceDiagnostic(session.diagnostic);
          continue;
        }
        const previousGrade = session.grade;
        const question = this.generateUniqueDiagnosticQuestion(session, skill.templateIds);
        if (!question) {
          session.diagnostic = markDiagnosticSkillUnavailable(session.diagnostic, skill.standardId);
          continue;
        }
        session.grade = session.templates.find((template) => template.id === question.templateId)?.grade ?? previousGrade;
        session.position = previousGrade === session.grade ? session.position + 1 : 0;
        session.length = session.diagnostic.blueprint.grades[session.diagnostic.gradeIndex].maximumItems;
        session.instance = question;
        session.diagnosticQuestionFingerprints.add(diagnosticQuestionFingerprint(question));
        await this.checkpoint(session);
        return this.view(session);
      }
      await this.completeDiagnostic(session);
      await this.checkpoint(session);
      return null;
    }
    if (session.position + 1 >= session.length) return null;
    session.position += 1;
    const retryTemplate = session.retryTemplateId ? session.templates.find((template) => template.id === session.retryTemplateId) : undefined;
    session.retryTemplateId = undefined;
    const candidates = retryTemplate ? [retryTemplate] : session.templates.filter((template) => template.id !== session.instance.templateId);
    const template = candidates[seedAt(session.seed, session.position) % candidates.length] ?? session.templates[0];
    session.grade = template.grade;
    session.instance = generateQuestion(template, seedAt(session.seed, session.position));
    await this.checkpoint(session);
    return this.view(session);
  }

  async progressFor(learnerId: string) {
    const [attempts, mastery, placements] = await Promise.all([this.repository.listAttempts(learnerId), this.repository.listMastery(learnerId), this.repository.listDiagnosticPlacements(learnerId)]);
    const latestAssessment = attempts.filter((attempt) => attempt.purpose === "diagnostic" || attempt.purpose === "placement").sort((left, right) => right.attemptedAt.getTime() - left.attemptedAt.getTime())[0];
    return { attempts, mastery, latestDiagnosticPlacement: placements[0] ? this.placementView(placements[0]) : null, latestAssessmentSessionId: latestAssessment?.sessionId ?? null };
  }

  async lessonPlans() { return loadProductionLessonPlans(); }
  async get(sessionId: string) { return this.view(await this.requireSession(sessionId)); }
  async submitForLearner(sessionId: string, learnerId: string, answer: unknown, usedHint = false) { await this.requireOwnedSession(sessionId, learnerId); return this.submit(sessionId, answer, usedHint); }
  async scoreAdultForLearner(sessionId: string, learnerId: string, demonstrated: boolean, evidenceNote?: string) { await this.requireOwnedSession(sessionId, learnerId); return this.scoreAdult(sessionId, demonstrated, evidenceNote); }
  async nextForLearner(sessionId: string, learnerId: string) { await this.requireOwnedSession(sessionId, learnerId); return this.next(sessionId); }
  async getForLearner(sessionId: string, learnerId: string) { const session = await this.requireOwnedSession(sessionId, learnerId); return this.view(session); }

  private requireDiagnosticTemplate(diagnostic: DiagnosticState, templates: QuestionTemplate[]): QuestionTemplate {
    const skill = selectNextDiagnosticSkill(diagnostic);
    if (!skill) throw new Error("The diagnostic has enough evidence for this stage.");
    const evidence = evidenceForSkill(diagnostic, skill, diagnostic.blueprint.grades[diagnostic.gradeIndex].grade);
    const unseenTemplateId = skill.templateIds.find((templateId) => !evidence.templateIds.includes(templateId));
    const templateId = unseenTemplateId ?? skill.templateIds[evidence.attemptCount % skill.templateIds.length];
    const template = templates.find((item) => item.id === templateId);
    if (!template) throw new Error(`Diagnostic template ${templateId} is unavailable.`);
    return template;
  }

  private generateUniqueDiagnosticQuestion(session: StoredSession, templateIds: string[]): QuestionInstance | null {
    const templates = templateIds.map((templateId) => session.templates.find((template) => template.id === templateId)).filter((template): template is QuestionTemplate => Boolean(template));
    for (let offset = 0; offset < 100; offset += 1) {
      for (const template of templates) {
        const question = generateQuestion(template, `${session.seed}:${session.diagnostic!.gradeIndex}:${session.diagnostic!.probes.length}:${template.id}:${offset}`);
        const fingerprint = diagnosticQuestionFingerprint(question);
        if (!session.submittedInstanceIds.has(question.id) && !session.diagnosticQuestionFingerprints.has(fingerprint)) return question;
      }
    }
    return null;
  }

  private async completeDiagnostic(session: StoredSession): Promise<void> {
    const report = buildDiagnosticReport(session.diagnostic!);
    const learningTargetIds = [...new Set([...report.needsReinforcement, ...report.criticalPrerequisiteGaps, ...report.unresolvedSkills])];
    const placement: DiagnosticPlacement = {
      learnerId: session.learnerId, grouping: report.grouping, grade: report.instructionalGrade, learningTargetIds,
      report: report as unknown as Record<string, unknown>, completedAt: new Date()
    };
    await Promise.all(learningTargetIds.map((standardId) => this.repository.saveLearningTarget({ learnerId: session.learnerId, standardId, active: true })));
    await this.repository.saveDiagnosticPlacement(placement);
    session.assessmentResult = placement;
    session.status = "completed";
  }

  private async requireSession(id: string): Promise<StoredSession> {
    const cached = this.sessions.get(id);
    if (cached) return cached;
    const record = await this.repository.findLearningSession(id);
    if (!record) throw new Error("Learning session is unavailable. Start a new session.");
    const state = record.state as unknown as PersistedSessionState;
    const allTemplates = (await loadK2ContentCatalog()).templates.map(catalogTemplateToQuestionTemplate);
    const templates = state.templateIds.map((templateId) => allTemplates.find((template) => template.id === templateId)).filter((template): template is QuestionTemplate => Boolean(template));
    if (templates.length !== state.templateIds.length) throw new Error("Some content used by this learning session is no longer available.");
    const session: StoredSession = {
      id: record.id, learnerId: record.learnerId, purpose: record.purpose as SessionPurpose, grade: state.grade,
      diagnosticGrouping: state.diagnosticGrouping, seed: record.seed, position: record.position, length: record.length,
      templates, instance: state.instance, submittedInstanceIds: new Set(state.submittedInstanceIds),
      diagnosticQuestionFingerprints: new Set(state.diagnosticQuestionFingerprints ?? (state.diagnostic ? [diagnosticQuestionFingerprint(state.instance)] : [])), proctoredCorrect: state.proctoredCorrect,
      assessmentResult: state.assessmentResult ? { ...state.assessmentResult, completedAt: new Date(state.assessmentResult.completedAt) } : undefined,
      retryTemplateId: state.retryTemplateId, diagnostic: state.diagnostic, createdAt: record.createdAt, status: record.status
    };
    this.sessions.set(id, session);
    return session;
  }

  private async requireOwnedSession(id: string, learnerId: string): Promise<StoredSession> {
    const session = await this.requireSession(id);
    if (session.learnerId !== learnerId) throw new ForbiddenException("This learning session belongs to another student.");
    return session;
  }

  private async checkpoint(session: StoredSession): Promise<void> {
    const persisted: PersistedSessionState = {
      grade: session.grade, diagnosticGrouping: session.diagnosticGrouping, templateIds: session.templates.map((template) => template.id), instance: session.instance,
      submittedInstanceIds: [...session.submittedInstanceIds], diagnosticQuestionFingerprints: [...session.diagnosticQuestionFingerprints], proctoredCorrect: session.proctoredCorrect,
      assessmentResult: session.assessmentResult ? { ...session.assessmentResult, completedAt: session.assessmentResult.completedAt.toISOString() } : undefined,
      retryTemplateId: session.retryTemplateId, diagnostic: session.diagnostic
    };
    const now = new Date();
    const record: LearningSessionRecord = {
      id: session.id, learnerId: session.learnerId, purpose: session.purpose, seed: session.seed, position: session.position, length: session.length,
      state: persisted as unknown as Record<string, unknown>, status: session.status, createdAt: session.createdAt, updatedAt: now,
      completedAt: session.status === "completed" ? session.assessmentResult?.completedAt ?? now : null
    };
    await this.repository.saveLearningSession(record);
  }

  private placementView(placement: DiagnosticPlacement | undefined) {
    if (!placement) return undefined;
    const report = placement.report as unknown as DiagnosticReport;
    return { ...report, grouping: placement.grouping, grade: placement.grade, learningTargetIds: placement.learningTargetIds };
  }

  private view(session: StoredSession) {
    const { canonicalAnswer: _answer, ...instance } = session.instance;
    return {
      sessionId: session.id, position: session.position, length: session.length,
      ...(session.diagnostic ? { assessmentStage: { grade: session.grade, number: session.diagnostic.gradeIndex + 1, total: session.diagnostic.blueprint.grades.length } } : {}),
      question: instance
    };
  }
}
