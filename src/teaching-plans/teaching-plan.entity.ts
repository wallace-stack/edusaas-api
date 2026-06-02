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

export enum ModuleType {
  INFANTIL = 'infantil',
  REGULAR  = 'regular',
}

export interface AttachmentItem {
  id: string;
  url: string;
  type: 'image/jpeg' | 'image/png' | 'application/pdf';
  size: number;
}

export interface BncFields {
  fields: string[];   // ex: ['EO', 'CG']
  codes:  string[];   // ex: ['EI03EO01', 'EI03EO02']
}

export interface BnccSkills {
  codes: string[];    // ex: ['EF01MA01', 'EF03LP15']
}

@Entity('teaching_plans')
export class TeachingPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  schoolId!: number;

  // ── Módulo (detectado via class.mode) ────────────────────────────────────
  @Column({ type: 'enum', enum: ModuleType, default: ModuleType.REGULAR })
  moduleType!: ModuleType;

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

  // ── Disciplina (FK — para integração com notas) ───────────────────────────
  @ManyToOne(() => SchoolSubject, { eager: false, nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject!: SchoolSubject;

  @Column({ nullable: true })
  subjectId!: number;

  // ── Identificação ─────────────────────────────────────────────────────────
  @Column({ nullable: true })
  theme!: string;                    // tema da aula

  @Column({ nullable: true })
  ageGroup!: string;                 // faixa etária (infantil)

  @Column({ nullable: true })
  gradeLevel!: string;               // ano/série (regular)

  // ── Período ───────────────────────────────────────────────────────────────
  @Column({ type: 'date', nullable: true })
  referenceDate!: Date;

  @Column({ type: 'enum', enum: PeriodType, default: PeriodType.DAILY })
  periodType!: PeriodType;

  @Column({ type: 'date', nullable: true })
  weekStart!: Date | null;           // início da semana (semanal)

  @Column({ type: 'date', nullable: true })
  weekEnd!: Date | null;             // fim da semana (semanal)

  // ── Conteúdo geral (legado / regular) ────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  content!: string | null;

  // ── BNCC ──────────────────────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  generalObjective!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bncFields!: BncFields | null;     // campos de experiência (infantil)

  @Column({ type: 'jsonb', nullable: true })
  bnccSkills!: BnccSkills | null;   // habilidades BNCC (regular)

  // ── Desenvolvimento — Infantil ────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  welcome!: string | null;           // acolhida

  @Column({ type: 'text', nullable: true })
  mainActivity!: string | null;      // atividade principal

  @Column({ type: 'text', nullable: true })
  playActivity!: string | null;      // brincadeira

  @Column({ type: 'text', nullable: true })
  closure!: string | null;           // encerramento

  // ── Desenvolvimento — Ambos ───────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  methodology!: string | null;

  @Column({ type: 'text', nullable: true })
  assessment!: string | null;

  @Column({ type: 'text', nullable: true })
  resources!: string | null;

  // ── Anexos ────────────────────────────────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  attachments!: AttachmentItem[] | null;

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
