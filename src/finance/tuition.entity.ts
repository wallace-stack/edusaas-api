import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum TuitionStatus {
  PENDING = 'pending',     // Pendente
  PAID = 'paid',           // Pago
  OVERDUE = 'overdue',     // Vencido
  CANCELLED = 'cancelled', // Cancelado
}

export enum PaymentMethod {
  PIX         = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD  = 'debit_card',
  CASH        = 'cash',
  BANK_SLIP   = 'bank_slip',
  OTHER       = 'other',
  // legado — mantido para não quebrar dados existentes
  CARD        = 'card',
}

@Entity()
export class Tuition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  @Column({ type: 'enum', enum: TuitionStatus, default: TuitionStatus.PENDING })
  status: TuitionStatus;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  reference: string; // Ex: "Janeiro/2026"

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'varchar', nullable: true })
  paymentNotes?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  studentId: number;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}