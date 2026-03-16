import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  ANNOUNCEMENT = 'announcement', // Comunicado geral
  ALERT = 'alert',               // Alerta de aluno
  GRADE = 'grade',               // Nota lançada
  ATTENDANCE = 'attendance',     // Falta registrada
  FINANCIAL = 'financial',       // Mensalidade
  SYSTEM = 'system',             // Sistema
}

export enum NotificationTarget {
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  COORDINATORS = 'coordinators',
  SPECIFIC = 'specific', // Usuário específico
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationTarget, default: NotificationTarget.ALL })
  target: NotificationTarget;

  @Column({ nullable: true })
  targetUserId: number;

  @Column({ default: false })
  isRead: boolean;

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