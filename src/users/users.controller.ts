import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './user.entity';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Apenas coordenador e diretor podem listar usuários
  @Get()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  findAll(
    @CurrentUser() user: any,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findBySchool(user.schoolId, role);
  }

  // Apenas coordenador e diretor podem criar usuários
  @Post()
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  create(
    @CurrentUser() user: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create({
      ...createUserDto,
      schoolId: user.schoolId,
    });
  }

  // Busca um usuário por ID
  @Get(':id')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.findOne(id, user.schoolId);
  }

  // Remove um usuário (soft delete)
  @Delete(':id')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.remove(id, user.schoolId);
  }
}