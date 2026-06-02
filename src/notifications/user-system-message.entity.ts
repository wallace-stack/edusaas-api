import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { SystemMessage } from './system-message.entity';

@Entity('user_system_message')
export class UserSystemMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  messageId!: number;

  @ManyToOne(() => SystemMessage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  systemMessage!: SystemMessage;

  @CreateDateColumn()
  sentAt!: Date;
}
