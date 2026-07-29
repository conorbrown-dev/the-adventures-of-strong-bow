import { evaluateDiagnostic } from "./diagnostic-placement";
import { ProgressService } from "./progress-service";
import { planSession } from "./session-planner";
import { selectNextQuestion } from "./question-selection";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";
import type { AttemptEvent, Clock, MasteryRecord } from "../domain/progress";
import type { QuestionTemplate } from "../domain/question-template";
import type { Standard } from "../domain/standard";

class FakeClock implements Clock { constructor(private value: Date) {} now() { return this.value; } advance(days: number) { this.value = new Date(this.value.getTime() + days * 86_400_000); } }
const attempt = (index: number, overrides: Partial<AttemptEvent> = {}): AttemptEvent => ({ id: `attempt-${index}`, learnerId: "learner", sessionId: `session-${index % 3}`, questionInstanceId: `question-${index}`, templateId: `template-${index % 2}`, templateVersion: 1, primaryStandardId: "K.CC.A.1", supportingStandardIds: [], submittedAnswer: 1, correct: true, usedHint: false, independent: true, purpose: "practice", deliveryContext: null, responseDurationMs: null, attemptedAt: new Date(2026, 0, 1, 0, index), responseType: "singleChoice", ...overrides });
const standard = (id: string, active = true): Standard => ({ schemaVersion: 1, officialId: id, canonicalId: id, subject: "math", grade: "K", gradeName: "Kindergarten", domainCode: "CC", domain: "Counting", strand: null, clusterCode: null, parentId: null, sourceItem: null, statement: "Count.", childFriendlyDescription: null, isLeaf: true, instructionalStatus: "assessable", prerequisiteIds: [], tags: [], source: { publisher: "x", package: "x", reference: "x", recoverySourceUrl: "x", recoveryRevision: "x", officialReferencePdf: "x", verification: "x" }, license: { name: "x", notice: "x" }, active });
const template = (id: string, standardId: string): QuestionTemplate => ({ schemaVersion: 1, id, version: 1, primaryStandardId: standardId, supportingStandardIds: [], subject: "math", grade: "K", responseType: "singleChoice", prompt: { text: "Question", audioText: "Question" }, generator: { kind: "nextNumber", parameters: {} }, difficulty: { band: 1 }, gameModes: ["fossilDigging"], modalities: { requiresReading: false, audioSupported: true, visualSupported: true }, provenance: { origin: "original", license: "Project" }, review: { status: "reviewed", reviewer: "adult", reviewedAt: "2026-01-01T00:00:00.000Z" } });

describe("curriculum progress", () => {
  it("calculates mastery at the threshold and rejects duplicate, hint, session, and template-only evidence", async () => {
    const clock = new FakeClock(new Date("2026-01-10T00:00:00Z")); const repo = new InMemoryProgressRepository(); const service = new ProgressService(repo, clock);
    for (let index = 0; index < 8; index += 1) await service.recordAttempt(attempt(index));
    expect((await repo.getMastery("learner", "K.CC.A.1"))?.state).toBe("practicing");
    await service.recordAttempt(attempt(9, { questionInstanceId: "question-0", correct: false }));
    expect((await repo.getMastery("learner", "K.CC.A.1"))?.scoredAttemptCount).toBe(8);
    const onlyHints = new InMemoryProgressRepository(); const hintService = new ProgressService(onlyHints, clock); for (let index = 0; index < 8; index += 1) await hintService.recordAttempt(attempt(index, { usedHint: true }));
    expect((await onlyHints.getMastery("learner", "K.CC.A.1"))?.state).not.toBe("mastered");
  });

  it("schedules due reviews and preserves mastery history after a failed review", async () => {
    const clock = new FakeClock(new Date("2026-01-10T00:00:00Z")); const repo = new InMemoryProgressRepository(); const service = new ProgressService(repo, clock); await service.verifyProctoredMastery("learner", "K.CC.A.1");
    clock.advance(1); expect((await service.markDue("learner")).length).toBe(1);
    await service.recordAttempt(attempt(9, { purpose: "review", correct: false })); const record = await repo.getMastery("learner", "K.CC.A.1"); expect(record?.state).toBe("practicing"); expect(record?.masteryAchievedAt).not.toBeNull();
  });

  it("advances the configured review interval after a successful review", async () => {
    const clock = new FakeClock(new Date("2026-01-10T00:00:00Z")); const repo = new InMemoryProgressRepository(); const service = new ProgressService(repo, clock); await service.verifyProctoredMastery("learner", "K.CC.A.1");
    clock.advance(1); await service.markDue("learner"); const reviewed = await service.recordAttempt(attempt(10, { purpose: "review" }));
    expect(reviewed.reviewStage).toBe(1); expect(reviewed.nextReviewAt?.getTime()).toBe(clock.now().getTime() + 3 * 86_400_000);
  });

  it("places diagnostic results separately by grouping and handles tiebreaks", () => {
    const phonics = evaluateDiagnostic("Reading foundational skills", [0, 1, 2, 3].map((index) => ({ standardId: `rf-${index}`, grade: "K", correct: index < 3, independent: true })));
    const operations = evaluateDiagnostic("Operations", [0, 1, 2, 3, 4, 5].map((index) => ({ standardId: `oa-${index}`, grade: "K", correct: index === 0 || index >= 4, independent: true })));
    expect(phonics.placedGrade).toBe("K"); expect(operations.learningTargetIds.length).toBeGreaterThan(0);
  });

  it("prioritizes reviews, then reviewed prerequisite gaps, and respects content constraints", () => {
    const templates = [template("review", "K.CC.A.1"), template("gap", "K.CC.A.2")]; const base = { seed: "same", standards: [standard("K.CC.A.1"), standard("K.CC.A.2")], templates, targets: [{ learnerId: "learner", standardId: "K.CC.A.1", active: true }], prerequisites: [{ standardId: "K.CC.A.1", prerequisiteStandardId: "K.CC.A.2", source: "explicitlyAuthored" as const, reviewed: true }], allowedGameModes: ["fossilDigging"], allowedResponseTypes: ["singleChoice"], audioRequired: true };
    expect(selectNextQuestion({ ...base, mastery: [{ learnerId: "learner", standardId: "K.CC.A.1", state: "reviewDue", scoredAttemptCount: 8, masteryAchievedAt: new Date(), reviewStage: 0, nextReviewAt: new Date(), updatedAt: new Date() }] }).reason).toContain("overdueReview");
    const result = selectNextQuestion({ ...base, mastery: [] }); expect(result.template?.id).toBe("gap"); expect(selectNextQuestion({ ...base, mastery: [] })).toEqual(result);
    expect(selectNextQuestion({ ...base, standards: [standard("K.CC.A.1", false), standard("K.CC.A.2", false)], mastery: [] }).template).toBeNull();
    expect(selectNextQuestion({ ...base, templates: [{ ...templates[0], review: { status: "draft" } }], mastery: [] }).template).toBeNull();
    expect(planSession({ ...base, mastery: [] }, 3).questions.length).toBeGreaterThan(0);
  });
});
