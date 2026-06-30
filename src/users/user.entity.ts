import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { School } from '../schools/school.entity';

export enum UserRole {
  DIRECTOR = 'director',
  COORDINATOR = 'coordinator',
  SECRETARY = 'secretary',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// Multi-tenancy: unicidade por (email, schoolId) — o mesmo e-mail pode
// existir em escolas diferentes. O nome fixo bate com a migration manual.
@Entity()
@Unique('UQ_user_email_schoolId', ['email', 'schoolId'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()   // unique: true removido — unicidade agora é composta com schoolId
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
  cpf: string;

  @Column({ nullable: true })
  birthDate: Date;

  // Endereço
  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column({ nullable: true })
  addressNumber: string;

  @Column({ nullable: true })
  complement: string;

  // Responsável (para alunos menores)
  @Column({ nullable: true })
  guardianName: string;

  @Column({ nullable: true })
  guardianPhone: string;

  @Column({ nullable: true })
  guardianRelation: string;

  @Column({ default: true })
  isActive: boolean;

  // Token para reset de senha (gerado ao solicitar recuperação)
  @Column({ nullable: true })
  resetToken: string;

  // Expiração do token de reset (1 hora)
  @Column({ nullable: true, type: 'timestamp' })
  resetTokenExpiry: Date;

  @ManyToOne(() => School, { eager: false })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}