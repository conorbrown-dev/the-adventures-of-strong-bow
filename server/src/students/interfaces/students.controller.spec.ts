import { ForbiddenException } from "@nestjs/common";
import type { StudentsService } from "../application/students.service";
import { StudentsController } from "./students.controller";

describe("StudentsController", () => {
  const student = { studentId: "student-1", username: "molly" };

  it("reads progress only for the authenticated student", () => {
    const students = { getProgress: jest.fn().mockReturnValue({ summary: {} }) } as unknown as StudentsService;
    const controller = new StudentsController(students);

    controller.getProgress(student, "student-1");
    expect(students.getProgress).toHaveBeenCalledWith("student-1");
    expect(() => controller.getProgress(student, "student-2")).toThrow(ForbiddenException);
  });

  it("does not record quiz progress under another student ID", () => {
    const students = { recordQuizAttempt: jest.fn() } as unknown as StudentsService;
    const controller = new StudentsController(students);
    const attempt = { subject: "MATH", grade: "K", standardCode: "K.CC.A.1", quizId: "quiz", correctAnswers: 1, questionCount: 1, durationMs: 1000 };

    expect(() => controller.recordQuizAttempt(student, "student-2", attempt as never)).toThrow("belongs to the signed-in student");
    expect(students.recordQuizAttempt).not.toHaveBeenCalled();
  });
});
