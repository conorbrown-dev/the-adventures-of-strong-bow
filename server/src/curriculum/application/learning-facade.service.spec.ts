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
});
