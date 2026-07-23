import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max
} from "class-validator";
import { CurriculumSubject, GradeLevel } from "@prisma/client";

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @Matches(/^\d{4}$/, { message: "pin must be exactly four digits" })
  pin!: string

  @IsEnum(GradeLevel)
  grade!: GradeLevel

  @IsArray()
  @IsEnum(CurriculumSubject, { each: true })
  subjects!: CurriculumSubject[]
}

export class LoginStudentDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @Matches(/^\d{4}$/, { message: "pin must be exactly four digits" })
  pin!: string
}

export class UpdateAssignmentsDto {
  @IsEnum(GradeLevel)
  grade!: GradeLevel

  @IsArray()
  @IsEnum(CurriculumSubject, { each: true })
  subjects!: CurriculumSubject[]
}

export class RecordQuizAttemptDto {
  @IsEnum(CurriculumSubject)
  subject!: CurriculumSubject

  @IsEnum(GradeLevel)
  grade!: GradeLevel

  @IsString()
  @IsNotEmpty()
  standardCode!: string

  @IsString()
  @IsNotEmpty()
  quizId!: string

  @IsNumber()
  @Min(0)
  correctAnswers!: number

  @IsNumber()
  @Min(1)
  questionCount!: number

  @IsNumber()
  @Min(0)
  durationMs!: number
}
