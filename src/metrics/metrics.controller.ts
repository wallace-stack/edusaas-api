import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Dashboard do diretor
  @Get('director')
  @Roles(UserRole.DIRECTOR)
  getDirectorDashboard(@CurrentUser() user: any) {
    return this.metricsService.getDirectorDashboard(user.schoolId);
  }

  // Dashboard do coordenador
  @Get('coordinator')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  getCoordinatorDashboard(@CurrentUser() user: any) {
    return this.metricsService.getCoordinatorDashboard(user.schoolId);
  }

  // Dashboard financeiro do diretor
  @Get('director/financial')
  @Roles(UserRole.DIRECTOR)
  getFinancialDashboard(@CurrentUser() user: any) {
    return this.metricsService.getFinancialDashboard(user.schoolId);
  }

  // Dashboard do professor
  @Get('teacher')
  @Roles(UserRole.TEACHER)
  getTeacherDashboard(@CurrentUser() user: any) {
    return this.metricsService.getTeacherDashboard(user.userId, user.schoolId);
  }

  // Export CSV para contabilidade — Nome, Turma, Valor, Status, Dt.Vencimento, Dt.Pagamento
  @Get('director/financial/export-contabilidade')
  @Roles(UserRole.DIRECTOR)
  async exportContabilidade(
    @CurrentUser() user: any,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year  ? parseInt(year)  : new Date().getFullYear();
    const csv = await this.metricsService.exportContabilidadeCsv(user.schoolId, m, y);
    const filename = `contabilidade-${y}-${String(m).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  }

  // Export CSV relatório completo — todas as mensalidades + lançamentos de caixa do período
  @Get('director/financial/export-completo')
  @Roles(UserRole.DIRECTOR)
  async exportCompleto(
    @CurrentUser() user: any,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year  ? parseInt(year)  : new Date().getFullYear();
    const csv = await this.metricsService.exportCompletoCsv(user.schoolId, m, y);
    const filename = `relatorio-completo-${y}-${String(m).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  }
}