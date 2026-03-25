import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SchoolAccessGuard } from '../common/guards/school-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { PlanLimitsService } from './plan-limits.service';
import { SchoolsService } from '../schools/schools.service';
import { AsaasService } from '../asaas/asaas.service';
import { SchoolPlan, PLAN_LIMITS } from './plan-limits';
import { PlanStatus } from '../schools/school.entity';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly planLimitsService: PlanLimitsService,
    private readonly schoolsService: SchoolsService,
    private readonly asaasService: AsaasService,
  ) {}

  /** GET /plans — público, retorna detalhes de todos os planos */
  @Get()
  getPlans() {
    return Object.entries(PLAN_LIMITS).map(([key, value]) => ({
      plan: key,
      ...value,
    }));
  }

  /** GET /plans/usage — retorna uso atual do plano da escola */
  @UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
  @Roles(UserRole.DIRECTOR)
  @Get('usage')
  async getUsage(@CurrentUser() user: { schoolId: number }) {
    return this.planLimitsService.getUsageStats(user.schoolId);
  }

  /** POST /plans/upgrade — inicia ou troca de plano via Asaas */
  @UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
  @Roles(UserRole.DIRECTOR)
  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  async upgradePlan(
    @CurrentUser() user: { schoolId: number },
    @Body() body: { plan: SchoolPlan },
  ) {
    const { plan } = body;
    const school = await this.schoolsService.findOne(user.schoolId);
    if (!school) {
      throw new Error('Escola não encontrada.');
    }

    // Cria cliente Asaas se ainda não tiver
    let customerId = school.asaasCustomerId;
    if (!customerId) {
      customerId = await this.asaasService.createCustomer(school.name, school.email);
      await this.schoolsService.update(school.id, { asaasCustomerId: customerId });
    }

    // Cria assinatura no Asaas
    const planLimits = PLAN_LIMITS[plan];
    const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const subscriptionId = await this.asaasService.createSubscription({
      customer: customerId,
      billingType: 'BOLETO',
      value: planLimits.price,
      nextDueDate,
      cycle: 'MONTHLY',
      description: `Plano ${plan} EduSaaS`,
    });

    // Atualiza escola
    await this.schoolsService.update(school.id, {
      plan,
      asaasSubscriptionId: subscriptionId,
      planStatus: PlanStatus.ACTIVE,
      planActivatedAt: new Date(),
    });

    const updated = await this.schoolsService.findOne(school.id);
    const { asaasCustomerId: _, asaasSubscriptionId: __, ...safe } = updated as any;
    return { message: `Plano ${plan} ativado com sucesso.`, school: safe };
  }

  /** POST /plans/cancel — cancela assinatura no Asaas */
  @UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard)
  @Roles(UserRole.DIRECTOR)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPlan(@CurrentUser() user: { schoolId: number }) {
    const school = await this.schoolsService.findOne(user.schoolId);
    if (!school) {
      throw new Error('Escola não encontrada.');
    }

    if (school.asaasSubscriptionId) {
      await this.asaasService.cancelSubscription(school.asaasSubscriptionId);
    }

    await this.schoolsService.update(school.id, {
      planStatus: PlanStatus.CANCELLED,
    });

    return { message: 'Plano cancelado.' };
  }
}
