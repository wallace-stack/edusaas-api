import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { School } from '../schools/school.entity';

export enum UserRole {
  DIRECTOR = 'director',
  COORDINATOR = 'coordinator',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  document: string;

  @Column({ nullable: true })
  birthDate: Date;

  @Column({ default: true })
  isActive: boolean;

  // Token para reset de senha (gerado ao solicitar recuperação)
  @Column({ nullable: true })
  resetToken: string;

  // Expiração do token de reset (1 hora)
  @Column({ nullable: true, type: 'datetime' })
  resetTokenExpiry: Date;

  @ManyToOne(() => School, { eager: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}