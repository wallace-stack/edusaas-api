// Importa decorators do TypeORM usados para definir entidades e colunas no banco
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SchoolPlan } from '../plans/plan-limits';

/**
 * Enum que define o status da escola dentro do sistema SaaS.
 * Mantido para compatibilidade com dados legados — não usar em código novo.
 */
export enum SchoolStatus {
  TRIAL = 'trial',        // escola está no período de teste
  ACTIVE = 'active',      // assinatura ativa
  EXPIRED = 'expired',    // assinatura expirou
  SUSPENDED = 'suspended',// conta suspensa manualmente
}

/**
 * Enum que reflete o status do plano/pagamento via Asaas.
 */
export enum PlanStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Re-export SchoolPlan so existing imports from this file still work
export { SchoolPlan };

/**
 * Entity representa a tabela "school" no banco de dados.
 * Cada registro representa uma escola cadastrada no sistema.
 */
@Entity()
export class School {

  /**
   * ID único da escola.
   * Gerado automaticamente pelo banco.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Nome da escola.
   */
  @Column()
  name!: string;

  /**
   * CNPJ da escola.
   * Marcado como UNIQUE para impedir duplicação no banco.
   */
  @Column({ unique: true })
  cnpj!: string;

  /**
   * Email principal da escola.
   * Também único para evitar múltiplos registros com o mesmo email.
   */
  @Column({ unique: true })
  email!: string;

  /**
   * Telefone da escola.
   * Campo opcional.
   */
  @Column({ nullable: true })
  phone!: string;

  /**
   * Endereço da escola.
   * Também opcional.
   */
  @Column({ nullable: true })
  address!: string;

  /**
   * Status legado da escola.
   * Mantido para não quebrar dados existentes — não usar em código novo.
   * Use planStatus para lógica de acesso.
   */
  @Column({
    type: 'enum',
    enum: SchoolStatus,
    default: SchoolStatus.TRIAL,
    nullable: true,
  })
  status!: SchoolStatus;

  /**
   * Plano contratado pela escola (free/pro/premium).
   */
  @Column({
    type: 'enum',
    enum: SchoolPlan,
    default: SchoolPlan.FREE,
  })
  plan!: SchoolPlan;

  /**
   * Data de expiração do período de teste (legado).
   * Mantido para não quebrar dados existentes — use trialEndsAt.
   */
  @Column({ type: 'timestamp', nullable: true })
  trialExpiresAt!: Date;

  /**
   * Data de expiração da assinatura paga (legado).
   * Mantido para não quebrar dados existentes.
   */
  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt!: Date;

  /**
   * Flag simples para ativar ou desativar a escola.
   * Pode ser usado para soft-disable da conta.
   */
  @Column({ default: true })
  isActive!: boolean;

  /** ID do cliente criado no Asaas. */
  @Column({ nullable: true })
  asaasCustomerId!: string;

  /** ID da assinatura recorrente no Asaas. */
  @Column({ nullable: true })
  asaasSubscriptionId!: string;

  /** Status do plano com base nos pagamentos do Asaas. */
  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.TRIAL })
  planStatus!: PlanStatus;

  /** Data de término do trial (createdAt + 14 dias). */
  @Column({ type: 'datetime', nullable: true })
  trialEndsAt!: Date;

  /** Data em que o plano pago foi ativado pela primeira vez. */
  @Column({ type: 'datetime', nullable: true })
  planActivatedAt!: Date;

  /**
   * Data automática de criação do registro.
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Data automática da última atualização.
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
