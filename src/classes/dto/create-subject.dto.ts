import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  name!: string;

  @IsNumber()
  classId!: number;

  @IsOptional()
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @IsNumber()
  workload?: number;
}