import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  Min,
  Max
} from "class-validator";

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsNumber()
  @Min(1000)
  @Max(9999)
  pin!: number
}