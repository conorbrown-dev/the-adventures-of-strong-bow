import type { LearningFacadeService } from "../application/learning-facade.service";
import { LearningController } from "./learning.controller";

describe("LearningController", () => {
  it("returns an explicit JSON envelope when a session is complete", () => {
    const learning = { next: jest.fn().mockReturnValue(null) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    expect(controller.next("completed-session")).toEqual({ session: null });
    expect(learning.next).toHaveBeenCalledWith("completed-session");
  });

  it("forwards hint use as a boolean when an answer is submitted", () => {
    const learning = { submit: jest.fn().mockReturnValue({ correct: true }) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    controller.submit("session", { answer: "A", usedHint: true });
    expect(learning.submit).toHaveBeenCalledWith("session", "A", true);
  });
});
