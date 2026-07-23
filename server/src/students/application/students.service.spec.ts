import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { StudentsService } from "./students.service";

jest.mock("argon2", () => ({ hash: jest.fn(), verify: jest.fn() }));

const baseStudent = { id: "student-1", username: "molly", pin: "hashed-pin", grade: "K", assignedSubjects: ["ELA", "MATH"] };

function createPrisma() {
  return {
    student: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    quizAttempt: { create: jest.fn() }
  } as any;
}

describe("StudentsService", () => {
  it("creates a session with a hashed PIN and public student data", async () => {
    const prisma = createPrisma();
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.student.create.mockResolvedValue(baseStudent);
    jest.mocked(argon2.hash).mockResolvedValue("hashed-pin" as never);
    const result = await new StudentsService(prisma).createStudent({ username: "molly", pin: "1234", grade: "K" as never, subjects: ["ELA", "MATH"] as never });
    expect(argon2.hash).toHaveBeenCalledWith("1234");
    expect(result.student).toEqual({ id: "student-1", username: "molly", grade: "K", subjects: ["ELA", "MATH"] });
    expect(result.token).toEqual(expect.any(String));
  });

  it("rejects duplicate names and invalid credentials", async () => {
    const prisma = createPrisma();
    prisma.student.findUnique.mockResolvedValueOnce(baseStudent).mockResolvedValueOnce(null);
    const service = new StudentsService(prisma);
    await expect(service.createStudent({ username: "molly", pin: "1234", grade: "K" as never, subjects: ["ELA"] as never })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.login({ username: "missing", pin: "1234" })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("calculates progress and reports a missing student", async () => {
    const prisma = createPrisma();
    prisma.student.findUnique.mockResolvedValueOnce({ ...baseStudent, quizAttempts: [{ correctAnswers: 7, questionCount: 10 }, { correctAnswers: 2, questionCount: 2 }], wordAttempts: [{ status: "Mastered" }, { status: "Learning" }] });
    const service = new StudentsService(prisma);
    await expect(service.getProgress("student-1")).resolves.toMatchObject({ summary: { completedQuizzes: 2, accuracy: 75, masteredSightWords: 1 } });
    prisma.student.findUnique.mockResolvedValueOnce(null);
    await expect(service.getProgress("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
