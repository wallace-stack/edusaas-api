import {
  IsEnum, IsNumber, IsOptional, IsString,
  IsObject, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodType, ModuleType } from '../teaching-plan.entity';

export class UpdateTeachingPlanDto {
  @IsOptional() @IsEnum(ModuleType)   moduleType?:       ModuleType;
  @IsOptional() @IsNumber() @Type(() => Number) classId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) subjectId?: number;
  @IsOptional() @IsString()           theme?:            string;
  @IsOptional() @IsString()           ageGroup?:         string;
  @IsOptional() @IsString()           gradeLevel?:       string;
  @IsOptional() @IsDateString()       referenceDate?:    string;
  @IsOptional() @IsEnum(PeriodType)   periodType?:       PeriodType;
  @IsOptional() @IsDateString()       weekStart?:        string;
  @IsOptional() @IsDateString()       weekEnd?:          string;
  @IsOptional() @IsString()           content?:          string;
  @IsOptional() @IsString()           generalObjective?: string;
  @IsOptional() @IsObject()           bncFields?:        { fields: string[]; codes: string[] };
  @IsOptional() @IsObject()           bnccSkills?:       { codes: string[] };
  @IsOptional() @IsString()           welcome?:          string;
  @IsOptional() @IsString()           mainActivity?:     string;
  @IsOptional() @IsString()           playActivity?:     string;
  @IsOptional() @IsString()           closure?:          string;
  @IsOptional() @IsString()           methodology?:      string;
  @IsOptional() @IsString()           assessment?:       string;
  @IsOptional() @IsString()           resources?:        string;
}
