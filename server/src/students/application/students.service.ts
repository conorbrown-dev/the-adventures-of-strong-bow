import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateStudentDto,
  LoginStudentDto,
  RecordQuizAttemptDto,
  UpdateAssignmentsDto
} from "../interfaces/dtos";

@Injectable()
export class StudentsService {
  private readonly jwt = new JwtService({
    secret: process.env.JWT_SECRET ?? "development-secret",
    signOptions: { expiresIn: "12h" }
  });

  constructor(private readonly prisma: PrismaService) {}

  async createStudent(dto: CreateStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { username: dto.username }
    });
    if (existing) {
      throw new ConflictException("That username is already in use.");
    }

    const student = await this.prisma.student.create({
      data: {
        username: dto.username,
        pin: await argon2.hash(dto.pin),
        grade: dto.grade,
        assignedSubjects: dto.subjects
      }
    });
    return this.toSession(student);
  }

  async login(dto: LoginStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { username: dto.username }
    });
    if (!student || !(await argon2.verify(student.pin, dto.pin))) {
      throw new UnauthorizedException("The username or PIN is incorrect.");
    }
    return this.toSession(student);
  }

  async updateAssignments(studentId: string, dto: UpdateAssignmentsDto) {
    await this.findStudent(studentId);
    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: { grade: dto.grade, assignedSubjects: dto.subjects }
    });
    return this.toPublicStudent(student);
  }

  async recordQuizAttempt(studentId: string, dto: RecordQuizAttemptDto) {
    await this.findStudent(studentId);
    return this.prisma.quizAttempt.create({ data: { studentId, ...dto } });
  }

  async getProgress(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        quizAttempts: { orderBy: { completedAt: "desc" }, take: 50 },
        wordAttempts: { orderBy: { attemptCount: "desc" }, take: 50 }
      }
    });
    if (!student) throw new NotFoundException("Student not found.");

    const completedQuizzes = student.quizAttempts.length;
    const correctAnswers = student.quizAttempts.reduce((sum, attempt) => sum + attempt.correctAnswers, 0);
    const questionCount = student.quizAttempts.reduce((sum, attempt) => sum + attempt.questionCount, 0);
    return {
      student: this.toPublicStudent(student),
      summary: {
        completedQuizzes,
        accuracy: questionCount ? Math.round((correctAnswers / questionCount) * 100) : null,
        masteredSightWords: student.wordAttempts.filter((attempt) => attempt.status === "Mastered").length
      },
      recentQuizAttempts: student.quizAttempts,
      sightWordAttempts: student.wordAttempts
    };
  }

  private async findStudent(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException("Student not found.");
    return student;
  }

  private toSession(student: { id: string; username: string; grade: unknown; assignedSubjects: unknown }) {
    return {
      token: this.jwt.sign({ sub: student.id, username: student.username }),
      student: this.toPublicStudent(student)
    };
  }

  private toPublicStudent(student: { id: string; username: string; grade: unknown; assignedSubjects: unknown }) {
    return {
      id: student.id,
      username: student.username,
      grade: student.grade,
      subjects: student.assignedSubjects
    };
  }
}
