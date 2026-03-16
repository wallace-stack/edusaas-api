import { IsNumber, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { GradeType } from '../grade.entity';

export class CreateGradeDto {
  @IsNumber()
  @Min(0)
  @Max(10)
  value!: number;

  @IsEnum(GradeType)
  type!: GradeType;

  @IsNumber()
  studentId!: number;

  @IsNumber()
  subjectId!: number;

  @IsNumber()
  classId!: number;

  @IsNumber()
  period!: number;

  @IsOptional()
  @IsString()
  description?: string;
}