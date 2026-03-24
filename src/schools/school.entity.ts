// Importa decorators do TypeORM usados para definir entidades e colunas no banco
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

/**
 * Enum que define o status da escola dentro do sistema SaaS.
 * Isso ajuda a controlar acesso dependendo da assinatura.
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

/**
 * Enum que define os planos disponíveis para a escola.
 * Pode ser usado para limitar funcionalidades.
 */
export enum SchoolPlan {
  BASIC = 'basic',            // plano básico
  PROFESSIONAL = 'professional', // plano intermediário
  ENTERPRISE = 'enterprise',  // plano completo
}

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
   * Status atual da escola dentro do sistema.
   * Usa enum para garantir valores controlados.
   * Default = TRIAL.
   */
  @Column({
    type: 'enum',
    enum: SchoolStatus,
    default: SchoolStatus.TRIAL,
  })
  status!: SchoolStatus;

  /**
   * Plano contratado pela escola.
   * Default definido como PROFESSIONAL.
   */
  @Column({
    type: 'enum',
    enum: SchoolPlan,
    default: SchoolPlan.PROFESSIONAL,
  })
  plan!: SchoolPlan;

  /**
   * Data de expiração do período de teste.
   * Usado para controlar quando o trial termina.
   */
  @Column({ type: 'timestamp', nullable: true })
  trialExpiresAt!: Date;

  /**
   * Data de expiração da assinatura paga.
   * Se passar dessa data, o sistema pode bloquear acesso.
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