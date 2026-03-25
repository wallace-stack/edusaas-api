import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { School } from '../schools/school.entity';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  GRADUATED = 'graduated',
  CANCELLED = 'cancelled',
}

@Entity('enrollments')
@Unique(['studentId', 'classId', 'year'])
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  studentId: number;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  schoolClass: SchoolClass;

  @Column()
  classId: number;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column()
  schoolId: number;

  @Column()
  year: number;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
