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
  NEWS = 'news',
  EVENT = 'event',
  UPDATE = 'update',
  CLASS_MESSAGE = 'class_message',
}

@Entity('feed_posts')
export class FeedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: FeedPostType, default: FeedPostType.NEWS })
  type: FeedPostType;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: true })
  active: boolean;

  @Column()
  schoolId: number;

  @Column()
  authorId: number;

  @Column({ nullable: true })
  classId: number;

  @ManyToOne(() => School, { eager: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => SchoolClass, { eager: false, nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: SchoolClass;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
