import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolSubject } from '../classes/subject.entity';
import { SchoolClass } from '../classes/class.entity';

export enum GradeType {
  EXAM = 'exam',           // Prova
  ASSIGNMENT = 'assignment', // Trabalho
  QUIZ = 'quiz',           // Quiz
  FINAL = 'final',         // Final
}

@Entity()
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  value: number;

  @Column({ type: 'enum', enum: GradeType })
  type: GradeType;

  @Column({ nullable: true })
  description: string;

  @Column()
  period: number; // Bimestre/Trimestre

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  studentId: number;

  @ManyToOne(() => SchoolSubject)
  @JoinColumn({ name: 'subject_id' })
  subject: SchoolSubject;

  @Column()
  subjectId: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'class_id' })
  schoolClass: SchoolClass;

  @Column()
  classId: number;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}