import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { SchoolsService } from '../../schools/schools.service';
import { AsaasService } from '../asaas.service';
import { MailService } from '../../mail/mail.service';
import { PlanStatus } from '../../schools/school.entity';
import { User, UserRole } from '../../users/user.entity';
import { SchoolPlan, PLAN_LIMITS } from '../../plans/plan-limits';

@SkipThrottle()
@Controller('asaas')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(
    private schoolsService: SchoolsService,
    private asaasService: AsaasService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('asaas-access-token') token: string,
    @Body() body: any,
  ) {
    const expectedToken = this.configService.get<string>('ASAAS_WEBHOOK_TOKEN', '');
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Token de webhook inválido.');
    }

    const event = body?.event as string;
    const payment = body?.payment;
    const subscription = body?.subscription;

    this.logger.log(`[Asaas Webhook] Evento recebido: ${event}`);

    const subscriptionId = payment?.subscription ?? subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('[Asaas Webhook] Evento sem subscriptionId, ignorado.');
      return { received: true };
    }

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await this.schoolsService.updatePlanBySubscription(subscriptionId, PlanStatus.ACTIVE);
        // Determina o plano pelo valor da assinatura e envia e-mail de confirmação de renovação
        try {
          const sub = await this.asaasService.getSubscription(subscriptionId);
          const value: number = sub?.value ?? 0;
          let plan: SchoolPlan | null = null;

          if (Math.abs(value - PLAN_LIMITS[SchoolPlan.PRO].priceMonthly) < 0.01) {
            plan = SchoolPlan.PRO;
          } else if (Math.abs(value - PLAN_LIMITS[SchoolPlan.ESCOLA].priceMonthly) < 0.01) {
            plan = SchoolPlan.ESCOLA;
          } else if (Math.abs(value - PLAN_LIMITS[SchoolPlan.REDE].priceMonthly) < 0.01) {
            plan = SchoolPlan.REDE;
          } else if (Math.abs(value - PLAN_LIMITS[SchoolPlan.STARTER].priceMonthly) < 0.01) {
            plan = SchoolPlan.STARTER;
          }

          if (plan) {
            await this.schoolsService.updateSchoolPlan(subscriptionId, plan);
            this.logger.log(`[Asaas Webhook] Plano atualizado para ${plan} — subscription: ${subscriptionId}`);
          }

          // E-mail de confirmação de renovação
          const school = await this.schoolsService.findBySubscriptionId(subscriptionId);
          if (school) {
            const director = await this.usersRepository.findOne({
              where: { schoolId: school.id, role: UserRole.DIRECTOR },
            });
            if (director) {
              const planLabel = plan ? PLAN_LIMITS[plan].label : school.plan;
              const nextDueDate: string | null = sub?.nextDueDate ?? null;
              await this.mailService.sendPlanRenewal(
                school.name,
                director.email,
                director.name,
                planLabel,
                nextDueDate,
                value,
              );
              this.logger.log(`[Asaas Webhook] E-mail de renovação enviado para ${director.email}`);
            }
          }
        } catch (e) {
          this.logger.error('[Asaas Webhook] Erro ao processar pagamento confirmado:', e);
        }
        break;

      case 'PAYMENT_OVERDUE':
        await this.schoolsService.updatePlanBySubscription(subscriptionId, PlanStatus.OVERDUE);
        break;

      case 'SUBSCRIPTION_CANCELLED':
        await this.schoolsService.updatePlanBySubscription(subscriptionId, PlanStatus.CANCELLED);
        break;

      default:
        this.logger.log(`[Asaas Webhook] Evento não tratado: ${event}`);
    }

    return { received: true };
  }
}
