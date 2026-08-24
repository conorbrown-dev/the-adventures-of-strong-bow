import { LearningFacadeService } from "./learning-facade.service";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";

describe("LearningFacadeService", () => {
  it("serves only approved K content, hides answers, records one immutable attempt, and restores a session", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository);
    const started = await service.start("learner", "practice", 42);
    expect(started.question.templateId).toMatch(/^k\./);
    expect(started.question).not.toHaveProperty("canonicalAnswer");
    expect(service.get(started.sessionId)).toEqual(started);
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    const answer = sessions.get(started.sessionId)!.instance.canonicalAnswer;
    await service.submit(started.sessionId, answer);
    await service.submit(started.sessionId, answer);
    expect(repository.attempts).toHaveLength(1);
    const next = service.next(started.sessionId);
    expect(next?.question.id).not.toBe(started.question.id);
    expect(next?.question.templateId).not.toBe(started.question.templateId);
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
      if (!result.complete) service.next(started.sessionId);
    }
    expect(result).toMatchObject({ complete: true, masteryState: "mastered" });
  });

  it("serves the reviewed Grade 1 starter curriculum", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    const started = await service.start("grade-one", "practice", 42, undefined, "1");
    expect(started.question.templateId).toMatch(/^1\./);
  });

  it("serves Grade 2 mathematics and records Grade 2 diagnostic probes", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("grade-two", "diagnostic", 42, undefined, "2", "MATH");
    expect(started.question.templateId).toMatch(/^2\./);
    const sessions = (service as unknown as { sessions: Map<string, { instance: { canonicalAnswer: unknown } }> }).sessions;
    const current = sessions.get(started.sessionId)!;
    await service.submit(started.sessionId, current.instance.canonicalAnswer);
    const stored = (service as unknown as { sessions: Map<string, { diagnosticProbes: Array<{ grade: string }> }> }).sessions.get(started.sessionId)!;
    expect(stored.diagnosticProbes[0].grade).toBe("2");
  });

  it("starts Grade 2 adult-scored ELA activities only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    const started = await service.start("grade-two", "adultScored", 42, "adult-code", "2", "ELA");
    expect(started.question.templateId).toMatch(/^2\./);
    expect(started.question.responseType).toBe("constructedResponse");
  });

  it("starts Kindergarten adult-scored ELA activities only with an adult code", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), "adult-code");
    await expect(service.start("kindergarten", "adultScored", 42, "wrong-code", "K", "ELA")).rejects.toThrow("verification code");
    const started = await service.start("kindergarten", "adultScored", 42, "adult-code", "K", "ELA");
    expect(started.question.templateId).toMatch(/^k\./);
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

  it("records an adult-scored Grade 1 ELA observation before confirming mastery", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository, "adult-code");
    const started = await service.start("grade-one", "adultScored", 42, "adult-code", "1");
    expect(started.question.responseType).toBe("constructedResponse");
    const result = await service.scoreAdult(started.sessionId, true);
    expect(result).toMatchObject({ correct: true, masteryState: "mastered", complete: true });
    expect(repository.attempts).toHaveLength(1);
    expect(repository.attempts[0]).toMatchObject({ independent: false, purpose: "adultScored", correct: true });
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
});
