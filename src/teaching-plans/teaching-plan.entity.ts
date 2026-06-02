import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { SchoolSubject } from '../classes/subject.entity';

export enum TeachingPlanStatus {
  DRAFT    = 'draft',
  SENT     = 'sent',
  READ     = 'read',
  REVIEWED = 'reviewed',
}

export enum PeriodType {
  DAILY   = 'daily',
  WEEKLY  = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('teaching_plans')
export class TeachingPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  schoolId!: number;

  // ── Professor ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'teacherId' })
  teacher!: User;

  @Column()
  teacherId!: number;

  // ── Turma ─────────────────────────────────────────────────────────────────
  @ManyToOne(() => SchoolClass, { eager: false, nullable: true })
  @JoinColumn({ name: 'classId' })
  schoolClass!: SchoolClass;

  @Column({ nullable: true })
  classId!: number;

  // ── Disciplina ────────────────────────────────────────────────────────────
  @ManyToOne(() => SchoolSubject, { eager: false, nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject!: SchoolSubject;

  @Column({ nullable: true })
  subjectId!: number;

  // ── Conteúdo ──────────────────────────────────────────────────────────────
  @Column({ type: 'date' })
  referenceDate!: Date;

  @Column({ type: 'enum', enum: PeriodType, default: PeriodType.DAILY })
  periodType!: PeriodType;

  @Column({ type: 'text' })
  content!: string;

  // ── Status ────────────────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: TeachingPlanStatus, default: TeachingPlanStatus.DRAFT })
  status!: TeachingPlanStatus;

  // ── Leitura pela gestão ───────────────────────────────────────────────────
  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'readBy' })
  readByUser!: User | null;

  @Column({ nullable: true })
  readBy!: number | null;

  // ── Revisão ───────────────────────────────────────────────────────────────
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewedByUser!: User | null;

  @Column({ nullable: true })
  reviewedBy!: number | null;

  // ── Timestamps ────────────────────────────────────────────────────────────
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
