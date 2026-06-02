import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PeriodType } from '../teaching-plan.entity';

export class UpdateTeachingPlanDto {
  @IsOptional()
  @IsNumber()
  classId?: number;

  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsOptional()
  @IsString()
  referenceDate?: string;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsString()
  content?: string;
}
