import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';

@Entity('planejamento_diario')
export class PlanejamentoDiario {
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
  objetivos!: string;

  @Column({ type: 'text' })
  atividades!: string;

  @Column({ type: 'text', nullable: true })
  recursos!: string | null;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  @Column()
  schoolId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
