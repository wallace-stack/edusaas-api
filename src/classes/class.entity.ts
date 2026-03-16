import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';

@Entity()
export class SchoolClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Ex: "Turma A", "3º Ano B"

  @Column()
  year: number; // Ano letivo

  @Column({ nullable: true })
  period: string; // Manhã, Tarde, Noite

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;
}