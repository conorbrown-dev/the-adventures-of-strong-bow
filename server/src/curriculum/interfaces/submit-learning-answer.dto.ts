import { IsBoolean, IsDefined, IsOptional } from "class-validator";

export class SubmitLearningAnswerDto {
  @IsDefined()
  answer!: unknown;

  @IsOptional()
  @IsBoolean()
  usedHint?: boolean;
}
