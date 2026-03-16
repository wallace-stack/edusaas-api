import { IsNumber, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../attendance.entity';

export class AttendanceItemDto {
  @IsNumber()
  studentId!: number;

  @IsNumber()
  status!: AttendanceStatus;
}

export class BulkAttendanceDto {
  @IsDateString()
  date!: string;

  @IsNumber()
  subjectId!: number;

  @IsNumber()
  classId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  attendances!: AttendanceItemDto[];
}