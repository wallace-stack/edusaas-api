import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { School, PlanStatus } from './school.entity';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
  ) {}

  // Busca escola por CNPJ — usado para verificar duplicata antes do cadastro
  async findByCnpj(cnpj: string): Promise<School | null> {
    return this.schoolsRepository.findOne({
      where: { cnpj: cnpj.replace(/\D/g, '') },
    });
  }

  // Cria escola — uso geral (fora de transação)
  async create(data: Partial<School>): Promise<School> {
    try {
      const school = this.schoolsRepository.create(data);
      return await this.schoolsRepository.save(school);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('CNPJ já cadastrado.');
      }
      throw error;
    }
  }

  // Cria escola DENTRO de uma transação existente
  async createWithRunner(data: Partial<School>, queryRunner: QueryRunner): Promise<School> {
    const school = queryRunner.manager.create(School, data);
    return await queryRunner.manager.save(School, school);
  }

  // Busca escola por ID
  async findOne(id: number): Promise<School | null> {
    return this.schoolsRepository.findOne({ where: { id } });
  }

  // Verifica se a escola tem acesso ativo (trial ou plano pago)
  // Usado pelo SchoolAccessGuard
  async hasAccess(schoolId: number): Promise<boolean> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) return false;

    if (school.planStatus === PlanStatus.ACTIVE) return true;

    if (school.planStatus === PlanStatus.TRIAL && school.trialEndsAt) {
      return school.trialEndsAt > new Date();
    }

    return false;
  }

  // Atualiza asaasCustomerId e trialEndsAt após criar cliente no Asaas
  async updateAsaasCustomer(schoolId: number, customerId: string, trialEndsAt: Date): Promise<void> {
    await this.schoolsRepository.update(schoolId, { asaasCustomerId: customerId, trialEndsAt });
  }

  // Atualiza planStatus a partir de um subscriptionId — chamado pelo webhook
  async updatePlanBySubscription(subscriptionId: string, planStatus: PlanStatus): Promise<void> {
    const update: Partial<School> = { planStatus };
    if (planStatus === PlanStatus.ACTIVE) {
      update.planActivatedAt = new Date();
    }
    await this.schoolsRepository.update({ asaasSubscriptionId: subscriptionId }, update);
  }

  // Atualiza campos genéricos de uma escola
  async update(schoolId: number, data: Partial<School>): Promise<void> {
    await this.schoolsRepository.update(schoolId, data);
  }
}