import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { SchoolSubject } from '../classes/subject.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  JUSTIFIED = 'justified',
}

@Entity()
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ nullable: true })
  justification: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  studentId: number;

  @ManyToOne(() => SchoolSubject)
  @JoinColumn({ name: 'subject_id' })
  subject: SchoolSubject;

  @Column()
  subjectId: number;

  @ManyToOne(() => SchoolClass)
  @JoinColumn({ name: 'class_id' })
  schoolClass: SchoolClass;

  @Column()
  classId: number;

  @Column()
  schoolId: number;

  @CreateDateColumn()
  createdAt: Date;
}