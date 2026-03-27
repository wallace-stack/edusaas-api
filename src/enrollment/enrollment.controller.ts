import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // Matricular aluno em uma turma — secretary, coordinator, director
  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  enroll(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: any) {
    return this.enrollmentService.enroll(dto.studentId, dto.classId, user.schoolId);
  }

  // Ver turma atual do aluno logado
  @Get('my-class')
  @Roles(UserRole.STUDENT)
  getMyClass(@CurrentUser() user: any) {
    return this.enrollmentService.getStudentClass(user.userId, user.schoolId);
  }

  // Ver alunos de uma turma — admin roles
  @Get('class/:classId')
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  getClassStudents(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.enrollmentService.getClassStudents(classId, user.schoolId);
  }

  // Transferir por studentId — secretary, coordinator, director
  @Post('transfer')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  transferByStudent(
    @Body() dto: { studentId: number; newClassId: number },
    @CurrentUser() user: any,
  ) {
    return this.enrollmentService.transferByStudent(dto.studentId, dto.newClassId, user.schoolId);
  }

  // Transferir matrícula por enrollmentId — secretary, coordinator, director
  @Patch(':id/transfer/:newClassId')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Param('newClassId', ParseIntPipe) newClassId: number,
  ) {
    return this.enrollmentService.transfer(id, newClassId);
  }

  // Cancelar matrícula — secretary, coordinator, director
  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  unenroll(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.unenroll(id);
  }
}
