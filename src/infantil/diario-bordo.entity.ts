import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';

@Entity('diario_bordo')
export class DiarioBordo {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'classId' })
  schoolClass!: SchoolClass;

  @Column()
  classId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'teacherId' })
  teacher!: User;

  @Column()
  teacherId!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'text' })
  content!: string;

  @Column()
  schoolId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
