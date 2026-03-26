import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { User } from '../users/user.entity';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, User]),
    SchoolsModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
