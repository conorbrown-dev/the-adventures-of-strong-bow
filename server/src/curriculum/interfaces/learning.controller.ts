import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { LearningFacadeService } from "../application/learning-facade.service";
import { ScoreAdultDto } from "./score-adult.dto";
@Controller("curriculum/learning")
export class LearningController {
  constructor(private readonly learning: LearningFacadeService) {}
  @Post("sessions") start(@Body() body: { learnerId: string; purpose: "practice" | "diagnostic" | "placement" | "proctored" | "adultScored"; proctorCode?: string; grade?: "K" | "1" | "2"; subject?: "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY"; seed?: number }) { return this.learning.start(body.learnerId, body.purpose, body.seed, body.proctorCode, body.grade, body.subject); }
  @Post("sessions/:sessionId/adult-score") scoreAdult(@Param("sessionId") sessionId: string, @Body() body: ScoreAdultDto) { return this.learning.scoreAdult(sessionId, body.demonstrated, body.evidenceNote); }
  @Post("sessions/:sessionId/answers") submit(@Param("sessionId") sessionId: string, @Body() body: { answer: unknown; usedHint?: boolean }) { return this.learning.submit(sessionId, body.answer, body.usedHint === true); }
  @Post("sessions/:sessionId/next") next(@Param("sessionId") sessionId: string) { return { session: this.learning.next(sessionId) }; }
  @Get("sessions/:sessionId") get(@Param("sessionId") sessionId: string) { return this.learning.get(sessionId); }
  @Get("progress/:learnerId") progress(@Param("learnerId") learnerId: string) { return this.learning.progressFor(learnerId); }
}
