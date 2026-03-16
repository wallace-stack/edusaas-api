import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum CashFlowType {
  INCOME = 'income',   // Entrada
  EXPENSE = 'expense', // Saída
}

export enum CashFlowCategory {
  TUITION = 'tuition',         // Mensalidade
  SALARY = 'salary',           // Salário
  MAINTENANCE = 'maintenance', // Manutenção
  SUPPLIES = 'supplies',       // Material
  OTHER = 'other',             // Outros
}

@Entity()
export class CashFlow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CashFlowType })
  type: CashFlowType;

  @Column({ type: 'enum', enum: CashFlowCategory, default: CashFlowCategory.OTHER })
  category: CashFlowCategory;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  reference: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: number;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;
}