import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { PermissionGuard } from '../permissions/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { PermissionKey } from '../permissions/user-permission.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.CRIAR_TURMA)
  @UseGuards(PermissionGuard)
  createClass(@Body() dto: CreateClassDto, @CurrentUser() user: any) {
    return this.classesService.createClass(dto, user.schoolId);
  }

  @Get()
  findAllClasses(@CurrentUser() user: any) {
    return this.classesService.findAllClasses(user.schoolId);
  }

  @Get('my')
  getMyClasses(@Request() req) {
    return this.classesService.findByTeacher(req.user.userId, req.user.schoolId);
  }

  @Get(':id')
  findOneClass(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.findOneClass(id, user.schoolId);
  }

  // Nota: gerenciar_professores_turma também cobre este endpoint (atribuição de professor),
  // mas editar_materias_turma é a permissão base para criação de matérias.
  // A distinção de gerenciar_professores_turma ficará em PATCH /classes/:id/subjects/:subjectId
  // quando essa rota for criada (próxima fase).
  @Post(':id/subjects')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.EDITAR_MATERIAS_TURMA)
  @UseGuards(PermissionGuard)
  createSubject(
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: CreateSubjectDto,
    @CurrentUser() user: any,
  ) {
    return this.classesService.createSubject({ ...dto, classId }, user.schoolId);
  }

  @Get(':id/subjects')
  findSubjects(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.findSubjectsByClass(id, user.schoolId);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.EDITAR_MATERIAS_TURMA)
  @UseGuards(PermissionGuard)
  removeSubject(
    @Param('id', ParseIntPipe) classId: number,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.removeSubject(classId, subjectId, user.schoolId);
  }

  @Patch(':id/mode')
  @Roles(UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.CONFIGURAR_MODULO_INFANTIL)
  @UseGuards(PermissionGuard)
  updateMode(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { mode: 'regular' | 'infantil'; infantilConfig?: any },
    @CurrentUser() user: any,
  ) {
    return this.classesService.updateMode(id, body.mode, body.infantilConfig, user.schoolId);
  }
}