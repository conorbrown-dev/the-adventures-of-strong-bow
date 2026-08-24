import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ScoreAdultDto {
  @IsBoolean()
  demonstrated!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidenceNote?: string;
}
