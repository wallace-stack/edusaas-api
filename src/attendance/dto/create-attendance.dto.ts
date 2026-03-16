import { IsNumber, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { AttendanceStatus } from '../attendance.entity';

export class CreateAttendanceDto {
  @IsDateString()
  date!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsNumber()
  studentId!: number;

  @IsNumber()
  subjectId!: number;

  @IsNumber()
  classId!: number;

  @IsOptional()
  @IsString()
  justification?: string;
}