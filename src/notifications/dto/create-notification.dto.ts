import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { NotificationType, NotificationTarget } from '../notification.entity';

export class CreateNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional()
  @IsEnum(NotificationTarget)
  target?: NotificationTarget;

  @IsOptional()
  @IsNumber()
  targetUserId?: number;

  @IsOptional()
  @IsNumber()
  classId?: number;
}
