import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { School } from '../schools/school.entity';
import { SupportController } from './support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, School])],
  controllers: [SupportController],
})
export class SupportModule {}
