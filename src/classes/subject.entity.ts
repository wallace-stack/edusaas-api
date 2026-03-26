import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';
import { SchoolClass } from './class.entity';

@Entity('subjects')
export class SchoolSubject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  workload: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'classId' })
  schoolClass: SchoolClass;

  @Column({ name: 'classId' })
  classId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({ name: 'teacherId', nullable: true })
  teacherId: number;

  @Column()
  schoolId: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
