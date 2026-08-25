import { LearningFacadeService } from "./learning-facade.service";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";

describe("LearningFacadeService", () => {
  it("serves only approved K content, hides answers, records one immutable attempt, and restores a session", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository);
    const started = await service.start("learner", "practice", 42);
    expect(started.question.templateId).toMatch(/^k\./);
    expect(started.question).not.toHaveProperty("canonicalAnswer");
    expect(await service.get(started.sessionId)).toEqual(started);
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    const answer = sessions.get(started.sessionId)!.instance.canonicalAnswer;
    await service.submit(started.sessionId, answer);
    await service.submit(started.sessionId, answer);
    expect(repository.attempts).toHaveLength(1);
    const next = await service.next(started.sessionId);
    expect(next?.question.id).not.toBe(started.question.id);
    expect(next?.question.templateId).not.toBe(started.question.templateId);
  });

  it("does not let one signed-in learner read or change another learner's session", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository());
    const started = await service.start("learner-one", "practice", 42);

    await expect(service.getForLearner(started.sessionId, "learner-two")).rejects.toThrow("belongs to another student");
    await expect(service.nextForLearner(started.sessionId, "learner-two")).rejects.toThrow("belongs to another student");
    await expect(service.submitForLearner(started.sessionId, "learner-two", "answer")).rejects.toThrow("belongs to another student");
  });

  it("requires an adult code before starting a proctored skill check", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("learner", "proctored", 42, "wrong-code")).rejects.toThrow("verification code");
    const started = await service.start("learner", "proctored", 42, "adult-code");
    expect(started.length).toBe(5);
  });

  it("verifies mastery after a passing proctored check", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("learner", "proctored", 42, "adult-code");
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    let result: { complete: boolean; masteryState: string } | undefined;
    for (let index = 0; index < 5; index += 1) {
      const current = sessions.get(started.sessionId)!;
      result = await service.submit(started.sessionId, current.instance.canonicalAnswer);
      if (!result.complete) await service.next(started.sessionId);
    }
    expect(result).toMatchObject({ complete: true, masteryState: "mastered" });
  });

  it("serves the reviewed Grade 1 starter curriculum", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    const started = await service.start("grade-one", "practice", 42, undefined, "1");
    expect(started.question.templateId).toMatch(/^1\./);
  });

  it("starts a coverage-based diagnostic at Kindergarten", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("grade-two", "diagnostic", 42, undefined, "2", "MATH");
    expect(started).toMatchObject({ length: 30, assessmentStage: { grade: "K", number: 1, total: 3 } });
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown }; diagnostic: { probes: Array<{ grade: string }> } }> }).sessions;
    const stored = sessions.get(started.sessionId)!;
    await service.submit(started.sessionId, stored.instance.canonicalAnswer);
    expect(stored.diagnostic.probes[0].grade).toBe("K");
    expect(repository.sessions).toHaveLength(1);
  });

  it("advances a consistently strong learner through K–2 and persists a detailed placement", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("grade-two", "diagnostic", 42, undefined, "2", "MATH");
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    let result: Awaited<ReturnType<typeof service.submit>> | undefined;
    let answered = 0;
    while (!result?.complete && answered < 70) {
      result = await service.submit(started.sessionId, sessions.get(started.sessionId)!.instance.canonicalAnswer);
      if (!result.complete) await service.next(started.sessionId);
      answered += 1;
    }

    expect(answered).toBeGreaterThan(12);
    expect(result).toMatchObject({ complete: true, placement: { grouping: "Math", grade: "2", placementConfidence: "HIGH", learningTargetIds: [] } });
    expect(result?.placement?.totalItems).toBe(answered);
    expect(repository.placements).toHaveLength(1);
    await expect(service.progressFor("grade-two")).resolves.toMatchObject({ latestDiagnosticPlacement: { grouping: "Math", grade: "2" }, latestAssessmentSessionId: started.sessionId });
  });

  it("stops after covered foundational misses and returns remediation targets", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("needs-foundations", "diagnostic", 42, undefined, "2", "ELA");
    let result: Awaited<ReturnType<typeof service.submit>> | undefined;
    for (let index = 0; index < 30 && !result?.complete; index += 1) {
      result = await service.submit(started.sessionId, "definitely incorrect");
      if (!result.complete) await service.next(started.sessionId);
    }

    expect(result).toMatchObject({ complete: true, placement: { grouping: "Reading & Language", grade: "K", placementConfidence: "HIGH" } });
    expect(result?.placement?.learningTargetIds.length).toBeGreaterThan(4);
    expect(result?.placement?.criticalPrerequisiteGaps.length).toBeGreaterThan(0);
    expect(repository.placements[0]?.learningTargetIds).toEqual(result?.placement?.learningTargetIds);
  });

  it("resumes a diagnostic after a service restart with the same evidence and question", async () => {
    const repository = new InMemoryProgressRepository();
    const firstService = new LearningFacadeService(repository, "adult-code");
    const started = await firstService.start("restart-learner", "diagnostic", 42, undefined, "K", "ELA");
    const firstSessions = (firstService as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    await firstService.submit(started.sessionId, firstSessions.get(started.sessionId)!.instance.canonicalAnswer);
    const next = await firstService.next(started.sessionId);

    const restartedService = new LearningFacadeService(repository, "adult-code");
    await expect(restartedService.get(started.sessionId)).resolves.toEqual(next);
    expect(repository.attempts).toHaveLength(1);
  });

  it("counts a concurrent duplicate diagnostic submission once", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("duplicate-learner", "diagnostic", 42, undefined, "K", "ELA");
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown }; diagnostic: { probes: unknown[] } }> }).sessions;
    const answer = sessions.get(started.sessionId)!.instance.canonicalAnswer;
    await Promise.all([service.submit(started.sessionId, answer), service.submit(started.sessionId, answer)]);
    expect(repository.attempts).toHaveLength(1);
    expect(sessions.get(started.sessionId)!.diagnostic.probes).toHaveLength(1);
  });

  it("starts Grade 2 adult-scored ELA activities only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    const started = await service.start("grade-two", "adultScored", 42, "adult-code", "2", "ELA");
    expect(started.question.templateId).toMatch(/^2\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts Grade 2 hands-on Oklahoma math activities only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("grade-two-math", "adultScored", 42, "wrong-code", "2", "MATH")).rejects.toThrow("verification code");
    const started = await service.start("grade-two-math", "adultScored", 42, "adult-code", "2", "MATH");
    expect(started.question.templateId).toMatch(/^ok\.math\.2\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts Kindergarten adult-scored ELA activities only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("kindergarten", "adultScored", 42, "wrong-code", "K", "ELA")).rejects.toThrow("verification code");
    const started = await service.start("kindergarten", "adultScored", 42, "adult-code", "K", "ELA");
    expect(started.question.templateId).toMatch(/^(?:k\.|ok\.ela\.k\.)/);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 2 science investigation only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("science", "adultScored", 42, "wrong-code", "2", "SCIENCE")).rejects.toThrow("verification code");
    const started = await service.start("science", "adultScored", 42, "adult-code", "2", "SCIENCE");
    expect(started.question.standardIds[0]).toMatch(/^(2\.|K2\.)/);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 1 social studies inquiry only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("social-studies", "adultScored", 42, "wrong-code", "1", "SOCIAL_STUDIES")).rejects.toThrow("verification code");
    const started = await service.start("social-studies", "adultScored", 42, "adult-code", "1", "SOCIAL_STUDIES");
    expect(started.question.standardIds[0]).toMatch(/^1\.C\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 2 health activity only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("health", "adultScored", 42, "wrong-code", "2", "HEALTH")).rejects.toThrow("verification code");
    const started = await service.start("health", "adultScored", 42, "adult-code", "2", "HEALTH");
    expect(started.question.standardIds[0]).toMatch(/^[1-8]\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 2 movement activity only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("pe", "adultScored", 42, "wrong-code", "2", "PHYSICAL_EDUCATION")).rejects.toThrow("verification code");
    const started = await service.start("pe", "adultScored", 42, "adult-code", "2", "PHYSICAL_EDUCATION");
    expect(started.question.standardIds[0]).toMatch(/^(PLE|S[1-4])\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 2 Fine Arts activity only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("fine-arts", "adultScored", 42, "wrong-code", "2", "FINE_ARTS")).rejects.toThrow("verification code");
    const started = await service.start("fine-arts", "adultScored", 42, "adult-code", "2", "FINE_ARTS");
    expect(started.question.standardIds[0]).toMatch(/^(2\.|E\.MA\.)/);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts an Oklahoma Grade 2 computer science activity only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("computer-science", "adultScored", 42, "wrong-code", "2", "COMPUTER_SCIENCE")).rejects.toThrow("verification code");
    const started = await service.start("computer-science", "adultScored", 42, "adult-code", "2", "COMPUTER_SCIENCE");
    expect(started.question.standardIds[0]).toMatch(/^2\.(CS|NI|DA|AP|IC)\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("requires two adult-scored Grade 1 ELA observations before confirming mastery", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("grade-one", "adultScored", 42, "adult-code", "1");
    expect(started.question.responseType).toBe("constructedResponse");
    const first = await service.scoreAdult(started.sessionId, true, "Counted the shells independently and explained the total.");
    expect(first).toMatchObject({ correct: true, masteryState: "observedOnce", complete: true });
    const followUp = await service.start("grade-one", "adultScored", 43, "adult-code", "1");
    expect(followUp.question.standardIds[0]).toBe(started.question.standardIds[0]);
    const second = await service.scoreAdult(followUp.sessionId, true);
    expect(second).toMatchObject({ correct: true, masteryState: "mastered", complete: true });
    expect(repository.attempts).toHaveLength(2);
    expect(repository.attempts[0]?.submittedAnswer).toEqual({ adultScore: "demonstrated", adultEvidence: "Counted the shells independently and explained the total." });
    expect(repository.attempts.every((attempt) => attempt.independent === false && attempt.purpose === "adultScored" && attempt.correct)).toBe(true);
  });

  it("filters templates by subject (ELA) for Kindergarten", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository());
    const started = await service.start("learner", "practice", 42, undefined, "K", "ELA");
    expect(started.question.templateId).toMatch(/^k\./);
    expect((started.question.interaction as any).visual).toBeUndefined();
  });

  it("filters templates by subject (MATH) for Kindergarten", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository());
    const started = await service.start("learner", "practice", 42, undefined, "K", "MATH");
    expect(started.question.templateId).toMatch(/^k\.cc\./);
  });

  it("records when a learner used a hint before answering", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository);
    const started = await service.start("hint-user", "practice", 42, undefined, "K", "MATH");
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    await service.submit(started.sessionId, sessions.get(started.sessionId)!.instance.canonicalAnswer, true);
    expect(repository.attempts[0]?.usedHint).toBe(true);
  });

  it("gives an incorrect practice response a fresh question for the same skill", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository());
    const started = await service.start("retry-user", "practice", 42, undefined, "K", "MATH");
    const result = await service.submit(started.sessionId, "not the answer");

    expect(result).toMatchObject({ correct: false, retry: true, complete: false });
    const retry = await service.next(started.sessionId);
    expect(retry?.question.standardIds[0]).toBe(started.question.standardIds[0]);
    expect(retry?.question.id).not.toBe(started.question.id);
  });

  it("exposes only human-reviewed lesson plans to the standalone Learning UI", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository());

    await expect(service.lessonPlans()).resolves.toEqual([expect.objectContaining({
      id: "k.math.counting-and-quantities",
      review: expect.objectContaining({ status: "reviewed", reviewer: "Conor Brown" })
    })]);
  });
});
