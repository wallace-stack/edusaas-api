import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SchoolPlan } from '../plans/plan-limits';

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

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  cnpj!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({
    type: 'enum',
    enum: SchoolPlan,
    default: SchoolPlan.STARTER,
  })
  plan!: SchoolPlan;

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
  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt!: Date;

  /** Data em que o plano pago foi ativado pela primeira vez. */
  @Column({ type: 'timestamp', nullable: true })
  planActivatedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
