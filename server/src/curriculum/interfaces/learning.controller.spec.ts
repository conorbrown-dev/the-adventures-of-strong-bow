import type { LearningFacadeService } from "../application/learning-facade.service";
import { LearningController } from "./learning.controller";

describe("LearningController", () => {
  const student = { studentId: "student-1", username: "molly" };

  it("starts Learning with the authenticated student instead of a body-supplied learner ID", () => {
    const learning = { start: jest.fn().mockReturnValue({ sessionId: "session" }) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    controller.start(student, { purpose: "practice", seed: 42, learnerId: "other-student" } as never);
    expect(learning.start).toHaveBeenCalledWith("student-1", "practice", 42, undefined, undefined, undefined);
  });

  it("returns an explicit JSON envelope when a session is complete", async () => {
    const learning = { nextForLearner: jest.fn().mockReturnValue(null) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    await expect(controller.next(student, "completed-session")).resolves.toEqual({ session: null });
    expect(learning.nextForLearner).toHaveBeenCalledWith("completed-session", "student-1");
  });

  it("forwards hint use as a boolean when an answer is submitted", () => {
    const learning = { submitForLearner: jest.fn().mockReturnValue({ correct: true }) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    controller.submit(student, "session", { answer: "A", usedHint: true });
    expect(learning.submitForLearner).toHaveBeenCalledWith("session", "student-1", "A", true);
  });

  it("forwards an optional adult observation note", () => {
    const learning = { scoreAdultForLearner: jest.fn().mockReturnValue({ correct: true }) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    controller.scoreAdult(student, "session", { demonstrated: true, evidenceNote: "Explained the answer using counters." });
    expect(learning.scoreAdultForLearner).toHaveBeenCalledWith("session", "student-1", true, "Explained the answer using counters.");
  });

  it("returns only the production lesson-plan bundle", async () => {
    const plans = [{ id: "k.math.counting-and-quantities" }];
    const learning = { lessonPlans: jest.fn().mockResolvedValue(plans) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    await expect(controller.lessonPlans()).resolves.toEqual(plans);
    expect(learning.lessonPlans).toHaveBeenCalledWith();
  });
});
