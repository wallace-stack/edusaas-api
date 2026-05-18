import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InfantilService } from './infantil.service';
import {
  UpsertInfantilRecordDto,
  CreateDiarioBordoDto,
  UpdateDiarioBordoDto,
  CreatePlanejamentoDiarioDto,
  UpdatePlanejamentoDiarioDto,
} from './dto/infantil.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('infantil')
export class InfantilController {
  constructor(private readonly infantilService: InfantilService) {}

  // ─── Registros conceito / parecer ────────────────────────────────────────

  @Post('records')
  @Roles(UserRole.TEACHER)
  upsertRecord(@Body() dto: UpsertInfantilRecordDto, @CurrentUser() user: any) {
    return this.infantilService.upsertRecord(dto, user.schoolId);
  }

  @Get('records')
  @Roles(UserRole.TEACHER, UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  getRecordsByClass(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('period', ParseIntPipe) period: number,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.getRecordsByClass(classId, period, user.schoolId);
  }

  @Get('records/student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  getRecordsByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.getRecordsByStudent(studentId, classId, user.schoolId);
  }

  // ─── Diário de Bordo ─────────────────────────────────────────────────────

  @Post('diario')
  @Roles(UserRole.TEACHER)
  createDiario(@Body() dto: CreateDiarioBordoDto, @CurrentUser() user: any) {
    return this.infantilService.createDiario(dto, user.userId, user.schoolId);
  }

  @Get('diario')
  @Roles(UserRole.TEACHER, UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  getDiario(
    @Query('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.getDiarioByClass(classId, user.schoolId);
  }

  @Patch('diario/:id')
  @Roles(UserRole.TEACHER)
  updateDiario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiarioBordoDto,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.updateDiario(id, dto, user.schoolId);
  }

  @Delete('diario/:id')
  @Roles(UserRole.TEACHER)
  deleteDiario(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.infantilService.deleteDiario(id, user.schoolId);
  }

  // ─── Planejamento Diário ──────────────────────────────────────────────────

  @Post('planejamento')
  @Roles(UserRole.TEACHER)
  createPlanejamento(@Body() dto: CreatePlanejamentoDiarioDto, @CurrentUser() user: any) {
    return this.infantilService.createPlanejamento(dto, user.userId, user.schoolId);
  }

  @Get('planejamento')
  @Roles(UserRole.TEACHER, UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY)
  getPlanejamento(
    @Query('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.getPlanejamentoByClass(classId, user.schoolId);
  }

  @Patch('planejamento/:id')
  @Roles(UserRole.TEACHER)
  updatePlanejamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanejamentoDiarioDto,
    @CurrentUser() user: any,
  ) {
    return this.infantilService.updatePlanejamento(id, dto, user.schoolId);
  }

  @Delete('planejamento/:id')
  @Roles(UserRole.TEACHER)
  deletePlanejamento(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.infantilService.deletePlanejamento(id, user.schoolId);
  }
}
