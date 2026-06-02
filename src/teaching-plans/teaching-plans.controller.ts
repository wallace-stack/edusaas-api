import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeachingPlansService } from './teaching-plans.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { UpdateTeachingPlanDto } from './dto/update-teaching-plan.dto';
import { FilterTeachingPlansDto } from './dto/filter-teaching-plans.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

const MANAGEMENT_ROLES = [
  UserRole.COORDINATOR,
  UserRole.SECRETARY,
  UserRole.DIRECTOR,
];

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('teaching-plans')
export class TeachingPlansController {
  constructor(private readonly teachingPlansService: TeachingPlansService) {}

  // ── Professor ─────────────────────────────────────────────────────────────

  /** Cria rascunho */
  @Post()
  @Roles(UserRole.TEACHER)
  create(@Body() dto: CreateTeachingPlanDto, @CurrentUser() user: any) {
    return this.teachingPlansService.create(dto, user.userId, user.schoolId);
  }

  /** Lista meus planejamentos */
  @Get('my')
  @Roles(UserRole.TEACHER)
  findMine(@CurrentUser() user: any) {
    return this.teachingPlansService.findMine(user.userId, user.schoolId);
  }

  /** Edita rascunho / enviado não lido */
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeachingPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.update(id, dto, user.userId, user.schoolId);
  }

  /** Envia para gestão */
  @Patch(':id/send')
  @Roles(UserRole.TEACHER)
  send(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.send(id, user.userId, user.schoolId);
  }

  // ── Gestão ────────────────────────────────────────────────────────────────

  /** Lista todos com filtros */
  @Get()
  @Roles(...MANAGEMENT_ROLES)
  findAll(@CurrentUser() user: any, @Query() filters: FilterTeachingPlansDto) {
    return this.teachingPlansService.findAll(user.schoolId, filters);
  }

  /** Visualiza (auto-marca como lido) */
  @Get(':id')
  @Roles(...MANAGEMENT_ROLES)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.findOne(id, user.userId, user.schoolId);
  }

  /** Marca como revisado */
  @Patch(':id/review')
  @Roles(...MANAGEMENT_ROLES)
  review(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.teachingPlansService.review(id, user.userId, user.schoolId);
  }
}
