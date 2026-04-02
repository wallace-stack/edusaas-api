import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { SchoolSubject } from '../classes/subject.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { SchoolsModule } from '../schools/schools.module';
import { GradesModule } from '../grades/grades.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SchoolSubject, Enrollment]),
    SchoolsModule,
    GradesModule,
    AttendanceModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
