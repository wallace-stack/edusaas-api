import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PeriodType } from '../teaching-plan.entity';

export class CreateTeachingPlanDto {
  @IsOptional()
  @IsNumber()
  classId?: number;

  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsNotEmpty()
  @IsString()
  referenceDate!: string;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsNotEmpty()
  @IsString()
  content!: string;
}
