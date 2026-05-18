import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { School } from '../schools/school.entity';
import { SchoolSubject } from './subject.entity';

export enum ClassMode {
  REGULAR  = 'regular',
  INFANTIL = 'infantil',
}

export interface InfantilConfig {
  useConceito:      boolean;
  useParecer:       boolean;
  useDiarioBordo:   boolean;
  usePlanejamento:  boolean;
}

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

  @Column({ type: 'enum', enum: ClassMode, default: ClassMode.REGULAR })
  mode: ClassMode;

  @Column({ type: 'jsonb', nullable: true })
  infantilConfig: InfantilConfig | null;

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
