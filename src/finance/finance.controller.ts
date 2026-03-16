import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';
import { CreateTuitionDto, PayTuitionDto } from './dto/create-tuition.dto';
import { CreateCashFlowDto } from './dto/create-cashflow.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Cria mensalidade
  @Post('tuitions')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  createTuition(@Body() dto: CreateTuitionDto, @CurrentUser() user: any) {
    return this.financeService.createTuition(dto, user.schoolId);
  }

  // Registra pagamento
  @Patch('tuitions/:id/pay')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  payTuition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayTuitionDto,
    @CurrentUser() user: any,
  ) {
    return this.financeService.payTuition(id, dto, user.schoolId);
  }

  // Mensalidades de um aluno
  @Get('tuitions/student/:studentId')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  findTuitionsByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: any,
  ) {
    return this.financeService.findTuitionsByStudent(studentId, user.schoolId);
  }

  // Aluno vê suas próprias mensalidades
  @Get('tuitions/my')
  @Roles(UserRole.STUDENT)
  myTuitions(@CurrentUser() user: any) {
    return this.financeService.findTuitionsByStudent(user.userId, user.schoolId);
  }

  // Lista inadimplentes
  @Get('defaulters')
  @Roles(UserRole.COORDINATOR, UserRole.DIRECTOR)
  findDefaulters(@CurrentUser() user: any) {
    return this.financeService.findDefaulters(user.schoolId);
  }

  // Lançamento no fluxo de caixa
  @Post('cashflow')
  @Roles(UserRole.DIRECTOR)
  createCashFlow(@Body() dto: CreateCashFlowDto, @CurrentUser() user: any) {
    return this.financeService.createCashFlow(dto, user.schoolId, user.userId);
  }

  // Relatório financeiro mensal
  @Get('report')
  @Roles(UserRole.DIRECTOR)
  getReport(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentUser() user: any,
  ) {
    return this.financeService.getFinancialReport(
      user.schoolId,
      Number(month) || new Date().getMonth() + 1,
      Number(year) || new Date().getFullYear(),
    );
  }
}