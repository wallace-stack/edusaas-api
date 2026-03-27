import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { School } from '../schools/school.entity';
import { SchoolSubject } from './subject.entity';

@Entity()
export class SchoolClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  year: number;

  @Column({ nullable: true })
  period: string;

  @Column({ nullable: true })
  shift: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  schoolId: number;

  @OneToMany(() => SchoolSubject, (subject) => subject.schoolClass)
  subjects: SchoolSubject[];

  @CreateDateColumn()
  createdAt: Date;
}
