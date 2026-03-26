import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';

export enum FeedPostType {
  GLOBAL = 'global',
  CLASS_MESSAGE = 'class_message',
}

@Entity('feed_posts')
export class FeedPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: FeedPostType, default: FeedPostType.GLOBAL })
  type!: FeedPostType;

  @Column({ type: 'simple-array', nullable: true })
  images!: string[];

  @Column({ default: false })
  pinned!: boolean;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'schoolId' })
  schoolId!: number;

  @Column({ name: 'authorId' })
  authorId!: number;

  @Column({ nullable: true, name: 'classId' })
  classId!: number;

  @ManyToOne(() => School, { eager: false })
  @JoinColumn({ name: 'schoolId' })
  school!: School;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @ManyToOne(() => SchoolClass, { eager: false, nullable: true })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
