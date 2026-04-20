import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School, PlanStatus } from '../schools/school.entity';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Rotas sem usuário autenticado passam direto
    if (!user?.schoolId) return true;

    const school = await this.schoolsRepository.findOne({
      where: { id: user.schoolId },
    });

    if (!school) return true;

    // Se tem plano pago ativo, libera
    if (school.planStatus === PlanStatus.ACTIVE) return true;

    // Se plano foi cancelado
    if (school.planStatus === PlanStatus.CANCELLED) {
      throw new ForbiddenException({
        code: 'PLAN_CANCELLED',
        message: 'Sua assinatura foi cancelada. Escolha um plano para continuar.',
      });
    }

    // Verifica se trial expirou
    if (school.planStatus === PlanStatus.TRIAL &&
        school.trialEndsAt && new Date() > new Date(school.trialEndsAt)) {
      throw new ForbiddenException({
        code: 'TRIAL_EXPIRED',
        message: 'Seu período de teste encerrou. Escolha um plano para continuar.',
        trialEndedAt: school.trialEndsAt,
      });
    }

    return true;
  }
}
