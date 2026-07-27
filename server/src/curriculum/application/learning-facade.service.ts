import { Inject, Injectable } from "@nestjs/common";
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

type StoredSession = { id: string; learnerId: string; purpose: "practice" | "diagnostic"; seed: number; position: number; length: number; templates: QuestionTemplate[]; instance: QuestionInstance; submittedInstanceIds: Set<string>; diagnosticProbes: DiagnosticProbe[] };
const seedAt = (seed: number, position: number) => Math.abs(Math.imul(seed ^ (position + 1), 2654435761)) >>> 0;
@Injectable()
export class LearningFacadeService {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly progress: ProgressService;
  constructor(@Inject(PrismaProgressRepository) private readonly repository: ProgressRepository) { this.progress = new ProgressService(repository, { now: () => new Date() }); }
  async start(learnerId: string, purpose: "practice" | "diagnostic", seed = Math.floor(Math.random() * 2_147_483_647)) {
    await validateK2ContentCatalog(); const catalog = await loadK2ContentCatalog(); const templates = catalog.templates.filter((template) => template.grade === "K" && template.review.status === "reviewed" && template.review.reviewer === "Conor Brown" && template.review.contentHash).map(catalogTemplateToQuestionTemplate);
    if (!templates.length) throw new Error("No approved Kindergarten content is available.");
    const id = randomUUID(); const selected = templates[seedAt(seed, 0) % templates.length]; const instance = generateQuestion(selected, seedAt(seed, 0)); const session = { id, learnerId, purpose, seed, position: 0, length: purpose === "diagnostic" ? 4 : 10, templates, instance, submittedInstanceIds: new Set<string>(), diagnosticProbes: [] }; this.sessions.set(id, session); return this.view(session);
  }
  async submit(sessionId: string, answer: unknown) {
    const session = this.requireSession(sessionId); const evaluation = evaluateAnswer(session.instance, answer); if (session.submittedInstanceIds.has(session.instance.id)) return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: "unchanged", complete: session.position + 1 >= session.length }; const attempt: AttemptEvent = { id: randomUUID(), learnerId: session.learnerId, sessionId, questionInstanceId: session.instance.id, templateId: session.instance.templateId, templateVersion: session.instance.templateVersion, primaryStandardId: session.instance.standardIds[0], supportingStandardIds: session.instance.standardIds.slice(1), submittedAnswer: answer, correct: evaluation.correct, usedHint: false, independent: !evaluation.requiresHumanReview, purpose: session.purpose, deliveryContext: "standaloneLearning", responseDurationMs: null, attemptedAt: new Date(), responseType: session.instance.responseType };
    session.submittedInstanceIds.add(session.instance.id); if (session.purpose === "diagnostic") { session.diagnosticProbes.push({ standardId: attempt.primaryStandardId, grade: "K", correct: evaluation.correct, independent: attempt.independent }); if (session.position === 3 && session.diagnosticProbes.filter((probe) => probe.correct).length === 2) session.length = 6; } const mastery = await this.progress.recordAttempt(attempt); const complete = session.position + 1 >= session.length; if (complete && session.purpose === "diagnostic") await this.repository.saveDiagnosticPlacement(diagnosticPlacement(session.learnerId, evaluateDiagnostic("Kindergarten", session.diagnosticProbes), { now: () => new Date() })); return { correct: evaluation.correct, explanation: session.instance.explanation, masteryState: mastery.state, complete };
  }
  next(sessionId: string) { const session = this.requireSession(sessionId); if (session.position + 1 >= session.length) return null; session.position += 1; const candidates = session.templates.filter((template) => template.id !== session.instance.templateId); const template = candidates[seedAt(session.seed, session.position) % candidates.length] ?? session.templates[0]; session.instance = generateQuestion(template, seedAt(session.seed, session.position)); return this.view(session); }
  async progressFor(learnerId: string) { const [attempts, mastery, placements] = await Promise.all([this.repository.listAttempts(learnerId), this.repository.listMastery(learnerId), this.repository.listDiagnosticPlacements(learnerId)]); return { attempts, mastery, latestDiagnosticPlacement: placements[0] ?? null }; }
  get(sessionId: string) { return this.view(this.requireSession(sessionId)); }
  private requireSession(id: string) { const session = this.sessions.get(id); if (!session) throw new Error("Learning session is unavailable. Start a new session."); return session; }
  private view(session: StoredSession) { const { canonicalAnswer: _answer, ...instance } = session.instance; return { sessionId: session.id, position: session.position, length: session.length, question: instance }; }
}
