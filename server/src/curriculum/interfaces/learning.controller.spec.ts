import type { LearningFacadeService } from "../application/learning-facade.service";
import { LearningController } from "./learning.controller";

describe("LearningController", () => {
  it("returns an explicit JSON envelope when a session is complete", () => {
    const learning = { next: jest.fn().mockReturnValue(null) } as unknown as LearningFacadeService;
    const controller = new LearningController(learning);

    expect(controller.next("completed-session")).toEqual({ session: null });
    expect(learning.next).toHaveBeenCalledWith("completed-session");
  });
});
