import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SystemMessageCategory {
  INSPIRATIONAL = 'inspirational',
  AFFECTIONATE  = 'affectionate',
  FUNNY         = 'funny',
  MOTIVATIONAL  = 'motivational',
  EDUCATIONAL   = 'educational',
}

@Entity('system_message')
export class SystemMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: SystemMessageCategory })
  category!: SystemMessageCategory;

  @Column({ type: 'text' })
  message!: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
