import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { User } from '../users/user.entity';
import { Grade } from '../grades/grade.entity';
import { Attendance } from '../attendance/attendance.entity';
import { Tuition } from '../finance/tuition.entity';
import { CashFlow } from '../finance/cashflow.entity';
import { Notification } from '../notifications/notification.entity';
import { SchoolSubject } from '../classes/subject.entity';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Grade, Attendance, Tuition, CashFlow, Notification, SchoolSubject]),
    SchoolsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}