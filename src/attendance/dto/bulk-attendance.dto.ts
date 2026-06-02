import { IsNumber, IsDateString, IsArray, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../attendance.entity';

export class AttendanceItemDto {
  @IsNumber()
  studentId!: number;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class BulkAttendanceDto {
  @IsDateString()
  date!: string;

  // Opcional para turmas em modo infantil (sem disciplinas formais)
  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsNumber()
  classId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  attendances!: AttendanceItemDto[];
}