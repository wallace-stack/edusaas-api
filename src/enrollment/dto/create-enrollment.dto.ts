import { IsNumber, IsOptional } from 'class-validator';

export class CreateEnrollmentDto {
  @IsNumber()
  studentId: number;

  @IsNumber()
  classId: number;
}
