import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { LearningFacadeService } from "../application/learning-facade.service";
@Controller("curriculum/learning")
export class LearningController {
  constructor(private readonly learning: LearningFacadeService) {}
  @Post("sessions") start(@Body() body: { learnerId: string; purpose: "practice" | "diagnostic"; seed?: number }) { return this.learning.start(body.learnerId, body.purpose, body.seed); }
  @Post("sessions/:sessionId/answers") submit(@Param("sessionId") sessionId: string, @Body() body: { answer: unknown }) { return this.learning.submit(sessionId, body.answer); }
  @Post("sessions/:sessionId/next") next(@Param("sessionId") sessionId: string) { return this.learning.next(sessionId); }
  @Get("sessions/:sessionId") get(@Param("sessionId") sessionId: string) { return this.learning.get(sessionId); }
  @Get("progress/:learnerId") progress(@Param("learnerId") learnerId: string) { return this.learning.progressFor(learnerId); }
}
