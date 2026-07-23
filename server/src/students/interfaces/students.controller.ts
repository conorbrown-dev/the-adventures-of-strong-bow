import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { StudentsService } from "../application/students.service";
import {
  CreateStudentDto,
  LoginStudentDto,
  RecordQuizAttemptDto,
  UpdateAssignmentsDto
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
  getProgress(@Param("studentId") studentId: string) {
    return this.students.getProgress(studentId);
  }

  @Put("students/:studentId/assignments")
  updateAssignments(@Param("studentId") studentId: string, @Body() dto: UpdateAssignmentsDto) {
    return this.students.updateAssignments(studentId, dto);
  }

  @Post("students/:studentId/quiz-attempts")
  recordQuizAttempt(@Param("studentId") studentId: string, @Body() dto: RecordQuizAttemptDto) {
    return this.students.recordQuizAttempt(studentId, dto);
  }
}
