import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './notification.entity';
import { SystemMessage } from './system-message.entity';
import { UserSystemMessage } from './user-system-message.entity';
import { SystemMessageScheduler } from './system-message.scheduler';
import { SchoolsModule } from '../schools/schools.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, SystemMessage, UserSystemMessage, User]),
    SchoolsModule,
    EnrollmentModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, SystemMessageScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
