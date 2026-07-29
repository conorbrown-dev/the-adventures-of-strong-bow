import { LearningFacadeService } from "./learning-facade.service";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";

describe("LearningFacadeService", () => {
  it("serves only approved K content, hides answers, records one immutable attempt, and restores a session", async () => {
    const repository = new InMemoryProgressRepository(); const service = new LearningFacadeService(repository);
    const started = await service.start("learner", "practice", 42);
    expect(started.question.templateId).toMatch(/^k\./);
    expect(started.question).not.toHaveProperty("canonicalAnswer");
    expect(service.get(started.sessionId)).toEqual(started);
    const choices = (started.question.interaction.choices as Array<{ label: string }> | undefined) ?? []; const answer = choices[0].label;
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
});
