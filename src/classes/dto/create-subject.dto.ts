import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsNumber()
  teacherId: number;

  @IsNumber()
  @IsOptional()
  classId?: number;
}
