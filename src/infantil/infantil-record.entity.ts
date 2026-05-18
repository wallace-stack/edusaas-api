import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { SchoolSubject } from '../classes/subject.entity';

export enum Conceito {
  DESENVOLVIDO      = 'desenvolvido',
  EM_DESENVOLVIMENTO = 'em_desenvolvimento',
  NAO_DESENVOLVIDO  = 'nao_desenvolvido',
}

@Entity('infantil_records')
export class InfantilRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @Column()
  studentId!: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'classId' })
  schoolClass!: SchoolClass;

  @Column()
  classId!: number;

  @ManyToOne(() => SchoolSubject, { nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject!: SchoolSubject;

  @Column({ nullable: true })
  subjectId!: number;

  @Column({ type: 'int' })
  period!: number;

  @Column({ type: 'enum', enum: Conceito, nullable: true })
  conceito!: Conceito | null;

  @Column({ type: 'text', nullable: true })
  parecer!: string | null;

  @Column()
  schoolId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
