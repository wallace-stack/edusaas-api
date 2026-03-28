import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';

export enum NotificationType {
  PAYMENT_DUE = 'payment_due',
  PAYMENT_OVERDUE = 'payment_overdue',
  TRIAL_EXPIRING = 'trial_expiring',
  SYSTEM = 'system',
  EXAM_SCHEDULED = 'exam_scheduled',
  EXAM_CHANGED = 'exam_changed',
  EXAM_CANCELLED = 'exam_cancelled',
  CLASS_NOTICE = 'class_notice',
}

export enum NotificationTarget {
  DIRECTOR = 'director',
  ALL_ADMINS = 'all_admins',
  SPECIFIC = 'specific',
  CLASS = 'class',
  ALL_STUDENTS = 'all_students',
  STUDENT = 'student',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'enum', enum: NotificationTarget, default: NotificationTarget.DIRECTOR })
  target!: NotificationTarget;

  @Column({ nullable: true })
  targetUserId!: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetUserId' })
  targetUser!: User;

  @Column({ nullable: true })
  classId!: number;

  @ManyToOne(() => SchoolClass, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @Column({ default: false })
  isRead!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: true })
  createdById!: number;

  @Column()
  schoolId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
