import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { LearningFacadeService } from "../application/learning-facade.service";
import { ScoreAdultDto } from "./score-adult.dto";
import type { AuthenticatedStudent } from "../../students/infrastructure/student-token.service";
import { CurrentStudent, StudentAuthGuard } from "../../students/interfaces/student-auth.guard";
@Controller("curriculum/learning")
@UseGuards(StudentAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningFacadeService) {}
  @Post("sessions") start(@CurrentStudent() student: AuthenticatedStudent, @Body() body: { purpose: "practice" | "diagnostic" | "placement" | "proctored" | "adultScored"; proctorCode?: string; grade?: "K" | "1" | "2"; subject?: "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY"; seed?: number }) { return this.learning.start(student.studentId, body.purpose, body.seed, body.proctorCode, body.grade, body.subject); }
  @Post("sessions/:sessionId/adult-score") scoreAdult(@CurrentStudent() student: AuthenticatedStudent, @Param("sessionId") sessionId: string, @Body() body: ScoreAdultDto) { return this.learning.scoreAdultForLearner(sessionId, student.studentId, body.demonstrated, body.evidenceNote); }
  @Post("sessions/:sessionId/answers") submit(@CurrentStudent() student: AuthenticatedStudent, @Param("sessionId") sessionId: string, @Body() body: { answer: unknown; usedHint?: boolean }) { return this.learning.submitForLearner(sessionId, student.studentId, body.answer, body.usedHint === true); }
  @Post("sessions/:sessionId/next") async next(@CurrentStudent() student: AuthenticatedStudent, @Param("sessionId") sessionId: string) { return { session: await this.learning.nextForLearner(sessionId, student.studentId) }; }
  @Get("sessions/:sessionId") get(@CurrentStudent() student: AuthenticatedStudent, @Param("sessionId") sessionId: string) { return this.learning.getForLearner(sessionId, student.studentId); }
  @Get("lesson-plans") lessonPlans() { return this.learning.lessonPlans(); }
  @Get("progress") progress(@CurrentStudent() student: AuthenticatedStudent) { return this.learning.progressFor(student.studentId); }
}
