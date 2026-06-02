import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TeachingPlanStatus, PeriodType, ModuleType } from '../teaching-plan.entity';

export class FilterTeachingPlansDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  classId?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsEnum(TeachingPlanStatus)
  status?: TeachingPlanStatus;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsEnum(ModuleType)
  moduleType?: ModuleType;
}
