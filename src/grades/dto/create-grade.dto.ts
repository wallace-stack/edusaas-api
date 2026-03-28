import { IsNumber, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { GradeType } from '../grade.entity';

export class CreateGradeDto {
  @IsNumber()
  @Min(0)
  @Max(10)
  value!: number;

  @IsNumber()
  @Min(1)
  @Max(3)
  instrument!: number;

  @IsNumber()
  studentId!: number;

  @IsNumber()
  subjectId!: number;

  @IsNumber()
  classId!: number;

  @IsNumber()
  @Min(1)
  @Max(4)
  period!: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  weight?: number;

  @IsOptional()
  @IsEnum(GradeType)
  type?: GradeType;

  @IsOptional()
  @IsString()
  description?: string;
}
