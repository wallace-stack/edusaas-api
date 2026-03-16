import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Professor registra frequência individual
  @Post()
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR)
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: any) {
    return this.attendanceService.create(dto, user.schoolId);
  }

  // Professor registra frequência de toda a turma de uma vez
  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR)
  bulkCreate(@Body() dto: BulkAttendanceDto, @CurrentUser() user: any) {
    return this.attendanceService.bulkCreate(dto, user.schoolId);
  }

  // Aluno vê sua própria frequência
  @Get('my-attendance')
  @Roles(UserRole.STUDENT)
  myAttendance(@CurrentUser() user: any) {
    return this.attendanceService.findByStudent(user.userId, user.schoolId);
  }

  // Frequência de um aluno específico
  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR, UserRole.DIRECTOR)
  findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.findByStudent(studentId, user.schoolId);
  }

  // Relatório de frequência da turma
  @Get('class/:classId/report')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  getClassReport(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.getClassAttendanceReport(classId, user.schoolId);
  }
}