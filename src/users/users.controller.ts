import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './user.entity';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { PermissionGuard } from '../permissions/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { PermissionKey } from '../permissions/user-permission.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Apenas coordenador, secretaria e diretor podem listar usuários
  @Get()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.EDITAR_USUARIO)
  @UseGuards(PermissionGuard)
  findAll(
    @CurrentUser() user: any,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findBySchool(user.schoolId, role);
  }

  // Diretor, coordenador e secretaria podem criar usuários
  // Nota: editar_aluno (criação de student) vs editar_usuario (criação de staff)
  // não é distinguível a nível de rota — requer validação no service (próxima fase).
  // Aplicamos editar_usuario como permissão base para criação de qualquer usuário.
  @Post()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.EDITAR_USUARIO)
  @UseGuards(PermissionGuard)
  create(
    @CurrentUser() user: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create({
      ...createUserDto,
      schoolId: user.schoolId,
    });
  }

  // Usuário vê seu próprio perfil
  @Get('me/profile')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.userId, user.schoolId);
  }

  // Usuário edita seu próprio perfil
  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    // Não permitir alterar role, email, schoolId, password
    const { role, email, schoolId, password, isActive, resetToken, resetTokenExpiry, ...safeData } = data;
    return this.usersService.update(user.userId, user.schoolId, safeData);
  }

  // Detalhes completos de um aluno (coordenador/diretor/secretaria/professor)
  @Get(':id/profile-detail')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TEACHER)
  getProfileDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.getProfileDetail(id, user.schoolId);
  }

  // Busca um usuário por ID
  @Get(':id')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR, UserRole.SECRETARY)
  @RequirePermission(PermissionKey.EDITAR_USUARIO)
  @UseGuards(PermissionGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.findOne(id, user.schoolId);
  }

  // Remove um usuário (soft delete)
  @Delete(':id')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  @RequirePermission(PermissionKey.EXCLUIR_USUARIO)
  @UseGuards(PermissionGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.remove(id, user.schoolId, user.userId);
  }
}