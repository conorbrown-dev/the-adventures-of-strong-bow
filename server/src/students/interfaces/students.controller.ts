import { Body, Controller, ForbiddenException, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { StudentsService } from "../application/students.service";
import type { AuthenticatedStudent } from "../infrastructure/student-token.service";
import { CurrentStudent, StudentAuthGuard } from "./student-auth.guard";
import {
  CreateStudentDto,
  LoginStudentDto,
  RecordQuizAttemptDto,
  UpdateAssignmentsDto,
  UpdateSubjectLevelDto
} from "./dtos";

@Controller()
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post("students")
  createStudent(@Body() dto: CreateStudentDto) {
    return this.students.createStudent(dto);
  }

  @Post("auth/login")
  login(@Body() dto: LoginStudentDto) {
    return this.students.login(dto);
  }

  @Get("students/:studentId/progress")
  @UseGuards(StudentAuthGuard)
  getProgress(@CurrentStudent() current: AuthenticatedStudent, @Param("studentId") studentId: string) {
    this.requireOwnStudent(current, studentId);
    return this.students.getProgress(studentId);
  }

  @Put("students/:studentId/assignments")
  @UseGuards(StudentAuthGuard)
  updateAssignments(@CurrentStudent() current: AuthenticatedStudent, @Param("studentId") studentId: string, @Body() dto: UpdateAssignmentsDto) {
    this.requireOwnStudent(current, studentId);
    return this.students.updateAssignments(studentId, dto);
  }

  @Put("students/:studentId/subject-level")
  @UseGuards(StudentAuthGuard)
  updateSubjectLevel(@CurrentStudent() current: AuthenticatedStudent, @Param("studentId") studentId: string, @Body() dto: UpdateSubjectLevelDto) {
    this.requireOwnStudent(current, studentId);
    return this.students.updateSubjectLevel(studentId, dto);
  }

  @Post("students/:studentId/quiz-attempts")
  @UseGuards(StudentAuthGuard)
  recordQuizAttempt(@CurrentStudent() current: AuthenticatedStudent, @Param("studentId") studentId: string, @Body() dto: RecordQuizAttemptDto) {
    this.requireOwnStudent(current, studentId);
    return this.students.recordQuizAttempt(studentId, dto);
  }

  private requireOwnStudent(current: AuthenticatedStudent, requestedStudentId: string): void {
    if (current.studentId !== requestedStudentId) throw new ForbiddenException("Student progress belongs to the signed-in student.");
  }
}
