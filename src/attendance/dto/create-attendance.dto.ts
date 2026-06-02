import { IsNumber, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { AttendanceStatus } from '../attendance.entity';

export class CreateAttendanceDto {
  @IsDateString()
  date!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsNumber()
  studentId!: number;

  // Opcional para turmas em modo infantil (sem disciplinas formais)
  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsNumber()
  classId!: number;

  @IsOptional()
  @IsString()
  justification?: string;
}