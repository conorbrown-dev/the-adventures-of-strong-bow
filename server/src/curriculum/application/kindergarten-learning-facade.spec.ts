import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";
import { LearningFacadeService } from "./learning-facade.service";

type InternalSession = {
  kindergarten: { instanceId: string };
  instance: { canonicalAnswer: unknown };
};

function internalSession(service: LearningFacadeService, sessionId: string): InternalSession {
  const sessions = (service as unknown as { sessions: Map<string, InternalSession> }).sessions;
  return sessions.get(sessionId)!;
}

async function startGuidedActivity(service: LearningFacadeService, learnerId: string) {
  const started = await service.start(learnerId, "practice", 42, undefined, "K", "ELA");
  expect(started.activity?.purpose).toBe("INSTRUCTION");
  await service.completeActivityForLearner(started.sessionId, learnerId, started.activity!.instanceId);
  const modeled = await service.nextForLearner(started.sessionId, learnerId);
  expect(modeled?.activity?.purpose).toBe("MODELED_EXAMPLE");
  await service.completeActivityForLearner(started.sessionId, learnerId, modeled!.activity!.instanceId);
  const guided = await service.nextForLearner(started.sessionId, learnerId);
  expect(guided?.activity?.purpose).toBe("GUIDED_PRACTICE");
  return guided!;
}

describe("Kindergarten Learning facade", () => {
  it("keeps the slice unavailable until isolated phoneme recordings pass qualified review", async () => {
    const service = new LearningFacadeService(new InMemoryProgressRepository(), undefined, true, false);
    await expect(service.start("audio-gate", "practice", 42, undefined, "K", "ELA")).rejects.toThrow("awaiting qualified phoneme-audio review");
  });

  it("Test F: treats concurrent and later duplicate submissions as one authoritative response", async () => {
    const repository = new InMemoryProgressRepository();
    const service = new LearningFacadeService(repository, undefined, true, true);
    const guided = await startGuidedActivity(service, "duplicate-learner");
    const answer = internalSession(service, guided.sessionId).instance.canonicalAnswer;
    const competingService = new LearningFacadeService(repository, undefined, true, true);
    await competingService.getForLearner(guided.sessionId, "duplicate-learner");

    const [first, concurrent, competing] = await Promise.all([
      service.submitForLearner(guided.sessionId, "duplicate-learner", answer),
      service.submitForLearner(guided.sessionId, "duplicate-learner", answer),
      competingService.submitForLearner(guided.sessionId, "duplicate-learner", "different-answer"),
    ]);
    const laterWithDifferentPayload = await service.submitForLearner(guided.sessionId, "duplicate-learner", "different-answer");

    expect(concurrent).toEqual(first);
    expect(competing).toEqual(first);
    expect(laterWithDifferentPayload).toEqual(first);
    expect(repository.attempts.filter((attempt) => attempt.questionInstanceId === guided.activity!.instanceId)).toHaveLength(1);
    expect(repository.skillEvidence.filter((event) => event.activityInstanceId === guided.activity!.instanceId)).toHaveLength(1);
  });

  it("Test G: restores the exact activity and support state after a service restart", async () => {
    const repository = new InMemoryProgressRepository();
    const learnerId = "restart-learner";
    const firstService = new LearningFacadeService(repository, undefined, true, true);
    const guided = await startGuidedActivity(firstService, learnerId);
    const hint = await firstService.hintForLearner(guided.sessionId, learnerId, guided.activity!.instanceId, "L2_CONTRAST");
    expect(hint).toMatchObject({ highestSupport: "L2_CONTRAST" });
    const paused = await firstService.pauseForLearner(guided.sessionId, learnerId);

    const restartedService = new LearningFacadeService(repository, undefined, true, true);
    const restored = await restartedService.getForLearner(guided.sessionId, learnerId);
    expect(restored).toEqual(paused);
    expect(restored.activity).toMatchObject({ instanceId: guided.activity!.instanceId, highestSupport: "L2_CONTRAST" });

    const answer = internalSession(restartedService, guided.sessionId).instance.canonicalAnswer;
    const result = await restartedService.submitForLearner(guided.sessionId, learnerId, answer);
    expect(result).toMatchObject({ correct: true, masteryState: "INTRODUCED" });
    expect(repository.skillEvidence.find((event) => event.activityInstanceId === guided.activity!.instanceId)?.supportEvents).toEqual(["L2_CONTRAST"]);
  });
});
