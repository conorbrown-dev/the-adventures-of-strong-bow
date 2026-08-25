import { IsIn, IsOptional } from "class-validator";
import type { SupportLevel } from "../domain/learning-activity";

const REQUESTABLE_SUPPORTS: readonly SupportLevel[] = ["L1_FOCUS", "L2_CONTRAST", "L3_PARTIAL", "L4_MODEL"];

export class RequestLearningHintDto {
  @IsOptional()
  @IsIn(REQUESTABLE_SUPPORTS)
  level?: SupportLevel;
}
