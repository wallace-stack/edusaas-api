import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';
import { SchoolClass } from './class.entity';

@Entity('subjects')  // 👈 nome explícito da tabela
export class SchoolSubject {  // 👈 renomeado de Subject para SchoolSubject
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  workload: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'class_id' })
  schoolClass: SchoolClass;

  @Column()
  classId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ nullable: true })
  teacherId: number;

  @Column()
  schoolId: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}