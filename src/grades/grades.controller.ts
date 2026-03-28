import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // Professor lança nota
  @Post()
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR, UserRole.DIRECTOR)
  create(@Body() dto: CreateGradeDto, @CurrentUser() user: any) {
    return this.gradesService.create(dto, user.schoolId);
  }

  // Aluno vê suas próprias notas
  @Get('my-grades')
  @Roles(UserRole.STUDENT)
  myGrades(@CurrentUser() user: any) {
    return this.gradesService.findByStudent(user.userId, user.schoolId);
  }

  // Notas de um aluno específico (coordenador/diretor)
  @Get('student/:studentId')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.TEACHER)
  findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: any,
  ) {
    return this.gradesService.findByStudent(studentId, user.schoolId);
  }

  // Lançamento em lote
  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR, UserRole.DIRECTOR)
  bulkCreate(@Body() grades: CreateGradeDto[], @CurrentUser() user: any) {
    return this.gradesService.bulkCreate(grades, user.schoolId);
  }

  // Notas de uma turma por disciplina
  @Get('class/:classId/subject/:subjectId')
  @Roles(UserRole.TEACHER, UserRole.COORDINATOR, UserRole.DIRECTOR)
  findByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @CurrentUser() user: any,
  ) {
    return this.gradesService.findByClass(classId, subjectId, user.schoolId);
  }

  // Relatório completo de uma turma
  @Get('class/:classId/report')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  getClassReport(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.gradesService.getClassReport(classId, user.schoolId);
  }
}