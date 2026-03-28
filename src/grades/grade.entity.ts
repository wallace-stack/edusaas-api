import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolSubject } from '../classes/subject.entity';
import { SchoolClass } from '../classes/class.entity';

export enum GradeType {
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  FINAL = 'final',
}

@Entity()
export class Grade {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  value!: number;

  @Column({ type: 'enum', enum: GradeType })
  type!: GradeType;

  @Column({ nullable: true })
  description!: string;

  @Column()
  period!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @Column()
  studentId!: number;

  @ManyToOne(() => SchoolSubject)
  @JoinColumn({ name: 'subjectId' })
  subject!: SchoolSubject;

  @Column()
  subjectId!: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'classId' })
  schoolClass!: SchoolClass;

  @Column()
  classId!: number;

  @Column()
  schoolId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
